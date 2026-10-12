/**
 * Server-side admin authorization (SERVER-ONLY).
 * DB is the authority: JWT role is a hint, Admin.status/role from MongoDB decides.
 * Proxy redirects are UX only and never a security boundary.
 */
import "server-only";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminModel, type AdminDoc } from "@/models/Admin";
import { AdminSessionModel } from "@/models/AdminSession";
import { verifyAccessToken } from "./jwt";

export interface AdminContext {
  admin: Pick<AdminDoc, "_id" | "email" | "role" | "status" | "emailVerifiedAt" | "lastLoginAt" | "createdAt">;
  familyId: string;
}

export async function requireAdminFromToken(
  accessToken: string | null,
  allowedRoles: Array<"superadmin" | "admin"> = ["superadmin", "admin"],
): Promise<{ ok: true; ctx: AdminContext } | { ok: false; code: string; status: number }> {
  if (!accessToken) return { ok: false, code: "unauthenticated", status: 401 };
  let claims;
  try {
    claims = verifyAccessToken(accessToken);
  } catch {
    return { ok: false, code: "auth_unavailable", status: 503 };
  }
  if (!claims) return { ok: false, code: "unauthenticated", status: 401 };
  try {
    await connectToDatabase();
  } catch {
    return { ok: false, code: "auth_unavailable", status: 503 };
  }
  const admin = await AdminModel.findById(claims.sub).lean();
  if (!admin || admin.status !== "active" || !admin.emailVerifiedAt) {
    return { ok: false, code: "unauthorized", status: 401 };
  }
  if (!allowedRoles.includes(admin.role as "superadmin" | "admin")) {
    return { ok: false, code: "forbidden", status: 403 };
  }
  const session = await AdminSessionModel.findOne({
    familyId: claims.fid,
    adminId: admin._id,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!session) return { ok: false, code: "unauthenticated", status: 401 };
  return {
    ok: true,
    ctx: {
      admin: {
        _id: admin._id,
        email: admin.email,
        role: admin.role,
        status: admin.status,
        emailVerifiedAt: admin.emailVerifiedAt,
        lastLoginAt: admin.lastLoginAt ?? null,
        createdAt: admin.createdAt,
      },
      familyId: claims.fid,
    },
  };
}
