/**
 * Website-user sessions (SERVER-ONLY). One opaque random token per login in
 * an HTTP-only cookie; only its SHA-256 is stored. Separate cookie and
 * collection from admin auth, so neither session grants the other's access.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import type { Types } from "mongoose";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { UserSessionModel } from "@/models/UserSession";
import { getAdminAuthConfig } from "@/lib/admin/auth-config";
import { hashToken } from "@/lib/admin/otp";

/** Protocol constant (also hard-coded in src/proxy.ts). __Host- requires Path=/ and no Domain. */
export const USER_COOKIE_NAME = "__Host-jaadex_user";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

export async function createUserSession(
  userId: Types.ObjectId,
  meta: { ipHash: string | null; uaHash: string | null },
): Promise<void> {
  const c = getAdminAuthConfig();
  const token = randomBytes(32).toString("hex");
  await UserSessionModel.create({
    tokenHash: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + c.refreshExpiresSeconds * 1000),
    ipHash: meta.ipHash,
    uaHash: meta.uaHash,
  });
  await UserModel.updateOne({ _id: userId }, { $set: { lastLoginAt: new Date() } });
  const store = await cookies();
  store.set(USER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: c.useSecureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: c.refreshExpiresSeconds,
  });
}

/** The signed-in, active user for this request, or null. DB is the authority. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get(USER_COOKIE_NAME)?.value;
  if (!token) return null;
  await connectToDatabase();
  const session = await UserSessionModel.findOne({
    tokenHash: hashToken(token),
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .select({ userId: 1 })
    .lean();
  if (!session) return null;
  const user = await UserModel.findById(session.userId).select({ name: 1, email: 1, status: 1 }).lean();
  if (!user || user.status !== "active") return null;
  return { id: String(user._id), name: user.name, email: user.email };
}

/** Logout: revoke the stored session (best effort) and always clear the cookie. */
export async function revokeCurrentUserSession(): Promise<void> {
  const c = getAdminAuthConfig();
  const store = await cookies();
  const token = store.get(USER_COOKIE_NAME)?.value;
  if (token) {
    try {
      await connectToDatabase();
      await UserSessionModel.updateOne(
        { tokenHash: hashToken(token), revokedAt: null },
        { $set: { revokedAt: new Date() } },
      );
    } catch {
      // fall through to cookie clear
    }
  }
  store.set(USER_COOKIE_NAME, "", { httpOnly: true, secure: c.useSecureCookies, sameSite: "lax", path: "/", maxAge: 0 });
}
