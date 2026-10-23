/** JWT helpers (SERVER-ONLY). HS256, iss/aud/exp always validated. */
import "server-only";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { getAdminAuthConfig } from "./auth-config";

export interface AccessClaims {
  sub: string;
  role: string;
  fid: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

export interface RefreshClaims {
  sub: string;
  fid: string;
  jti: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

export function signAccessToken(adminId: string, role: string, familyId: string): string {
  const c = getAdminAuthConfig();
  return jwt.sign({ sub: adminId, role, fid: familyId }, c.accessSecret, {
    algorithm: "HS256",
    issuer: c.jwtIssuer,
    audience: c.jwtAudience,
    expiresIn: c.accessExpiresIn as unknown as jwt.SignOptions["expiresIn"],
  });
}

export function signRefreshToken(adminId: string, familyId: string): { token: string; jti: string } {
  const c = getAdminAuthConfig();
  const jti = randomUUID();
  const token = jwt.sign({ sub: adminId, fid: familyId, jti }, c.refreshSecret, {
    algorithm: "HS256",
    issuer: c.jwtIssuer,
    audience: c.jwtAudience,
    expiresIn: c.refreshExpiresIn as unknown as jwt.SignOptions["expiresIn"],
  });
  return { token, jti };
}

function verifyWith(
  token: string,
  secret: string,
): { sub: string; fid: string; role?: string; jti?: string } | null {
  const c = getAdminAuthConfig();
  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      issuer: c.jwtIssuer,
      audience: c.jwtAudience,
      clockTolerance: 30,
    }) as Record<string, unknown>;
    if (typeof decoded.sub !== "string" || typeof decoded.fid !== "string") return null;
    return {
      sub: decoded.sub,
      fid: decoded.fid,
      role: typeof decoded.role === "string" ? decoded.role : undefined,
      jti: typeof decoded.jti === "string" ? decoded.jti : undefined,
    };
  } catch {
    return null;
  }
}

export function verifyAccessToken(token: string): AccessClaims | null {
  const c = getAdminAuthConfig();
  const v = verifyWith(token, c.accessSecret);
  if (!v || !v.role) return null;
  return v as AccessClaims;
}

export function verifyRefreshToken(token: string): RefreshClaims | null {
  const c = getAdminAuthConfig();
  const v = verifyWith(token, c.refreshSecret);
  if (!v || !v.jti) return null;
  return v as RefreshClaims;
}
