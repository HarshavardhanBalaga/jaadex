/**
 * Login + refresh rotation services (SERVER-ONLY). Appended to session-service.
 * Refresh rotation is an atomic CAS with 30s benign-retry grace;
 * true reuse revokes the family.
 */
import { randomUUID } from "node:crypto";
import { connectToDatabase as connectDb2 } from "@/lib/mongodb";
import { AdminModel as AdminModel2 } from "@/models/Admin";
import { AdminSessionModel as AdminSessionModel2 } from "@/models/AdminSession";
import { getAdminAuthConfig as getAuthConfig2 } from "./auth-config";
import { hashToken as hashToken2 } from "./otp";
import { verifyPassword as verifyPassword2 } from "./password";
import { signAccessToken as signAccess2, signRefreshToken as signRefresh2, verifyRefreshToken as verifyRefresh2 } from "./jwt";
import { revokeFamily as revokeFamilyBase } from "./session-revoke";

export type LoginOutcome =
  | { outcome: "ok"; adminId: string; role: string; familyId: string; accessToken: string; refreshToken: string }
  | { outcome: "invalid" }
  | { outcome: "unavailable" };

export async function loginAdmin(
  email: string,
  password: string,
  meta: { ipHash: string | null; uaHash: string | null },
): Promise<LoginOutcome> {
  await connectDb2();
  const normalized = email.trim().toLowerCase();
  const admin = await AdminModel2.findOne({ email: normalized }).select("+passwordHash");
  if (!admin) return { outcome: "invalid" };
  const pwOk = await verifyPassword2(password, admin.passwordHash);
  if (!pwOk || admin.status !== "active" || !admin.emailVerifiedAt) return { outcome: "invalid" };
  const c = getAuthConfig2();
  const familyId = randomUUID();
  const accessToken = signAccess2(String(admin._id), admin.role, familyId);
  const { token: refreshToken, jti } = signRefresh2(String(admin._id), familyId);
  try {
    await AdminSessionModel2.create({
      familyId,
      adminId: admin._id,
      currentRefreshHash: hashToken2(refreshToken),
      jti,
      expiresAt: new Date(Date.now() + c.refreshExpiresSeconds * 1000),
      ipHash: meta.ipHash,
      uaHash: meta.uaHash,
    });
  } catch {
    return { outcome: "unavailable" };
  }
  await AdminModel2.updateOne({ _id: admin._id }, { $set: { lastLoginAt: new Date() } });
  return { outcome: "ok", adminId: String(admin._id), role: admin.role, familyId, accessToken, refreshToken };
}

export type RefreshOutcome =
  | { outcome: "ok"; adminId: string; role: string; familyId: string; accessToken: string; refreshToken: string }
  | { outcome: "grace"; adminId: string; role: string; familyId: string; accessToken: string }
  | { outcome: "invalid" }
  | { outcome: "unavailable" };

export async function rotateRefresh(
  presented: string,
  meta: { ipHash: string | null; uaHash: string | null },
): Promise<RefreshOutcome> {
  const c = getAuthConfig2();
  void c;
  const claims = verifyRefresh2(presented);
  if (!claims) return { outcome: "invalid" };
  try {
    await connectDb2();
  } catch {
    return { outcome: "unavailable" };
  }
  const presentedHash = hashToken2(presented);
  const now = new Date();
  const { token: nextRefresh, jti } = signRefresh2(claims.sub, claims.fid);
  const nextHash = hashToken2(nextRefresh);
  const rotated = await AdminSessionModel2.findOneAndUpdate(
    {
      familyId: claims.fid,
      adminId: claims.sub,
      currentRefreshHash: presentedHash,
      revokedAt: null,
      expiresAt: { $gt: now },
    },
    {
      $set: {
        currentRefreshHash: nextHash,
        previousRefreshHash: presentedHash,
        previousRotatedAt: now,
        jti,
        ipHash: meta.ipHash,
        uaHash: meta.uaHash,
      },
    },
    { returnDocument: "after" },
  ).lean();
  if (rotated) {
    const admin = await AdminModel2.findById(claims.sub).select({ role: 1, status: 1 }).lean();
    if (!admin || admin.status !== "active") {
      await revokeFamilyBase(claims.fid, "admin_inactive");
      return { outcome: "invalid" };
    }
    return {
      outcome: "ok",
      adminId: String(admin._id),
      role: admin.role,
      familyId: claims.fid,
      accessToken: signAccess2(String(admin._id), admin.role, claims.fid),
      refreshToken: nextRefresh,
    };
  }
  const session = await AdminSessionModel2.findOne({ familyId: claims.fid }).lean();
  if (
    session &&
    !session.revokedAt &&
    session.previousRefreshHash === presentedHash &&
    session.previousRotatedAt &&
    now.getTime() - new Date(session.previousRotatedAt).getTime() <= 30_000
  ) {
    const admin = await AdminModel2.findById(claims.sub).select({ role: 1, status: 1 }).lean();
    if (!admin || admin.status !== "active") return { outcome: "invalid" };
    return {
      outcome: "grace",
      adminId: String(admin._id),
      role: admin.role,
      familyId: claims.fid,
      accessToken: signAccess2(String(admin._id), admin.role, claims.fid),
    };
  }
  if (session && !session.revokedAt) {
    await revokeFamilyBase(claims.fid, "reuse_detected");
  }
  return { outcome: "invalid" };
}
