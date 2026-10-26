/**
 * Google OpenID Connect primitives (authorization code + PKCE + nonce).
 * Audience-agnostic: no admin/user imports and no env reads, so the same
 * functions serve the admin portal now and normal-user login later.
 * Kept free of "server-only" so the pure parts are unit-testable; only
 * server routes import it.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
export const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
export const GOOGLE_SCOPES = "openid email profile";

export interface OAuthTransaction {
  state: string;
  codeVerifier: string;
  nonce: string;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
}

/** RFC 7636 S256 challenge. */
export function pkceChallenge(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier, "ascii").digest("base64url");
}

export function createOAuthTransaction(): OAuthTransaction {
  return {
    state: randomBytes(32).toString("base64url"),
    codeVerifier: randomBytes(48).toString("base64url"),
    nonce: randomBytes(32).toString("base64url"),
  };
}

export function buildGoogleAuthUrl(p: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeVerifier: string;
  nonce: string;
}): string {
  const url = new URL(GOOGLE_AUTH_URL);
  url.search = new URLSearchParams({
    client_id: p.clientId,
    redirect_uri: p.redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    state: p.state,
    nonce: p.nonce,
    code_challenge: pkceChallenge(p.codeVerifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return url.toString();
}

/** Timing-safe comparison for state values. */
export function statesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Exchanges the authorization code server-to-server; returns the raw id_token or null. */
export async function exchangeGoogleCode(p: {
  clientId: string;
  clientSecret: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
  fetchImpl?: typeof fetch;
}): Promise<string | null> {
  const res = await (p.fetchImpl ?? fetch)(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: p.code,
      code_verifier: p.codeVerifier,
      redirect_uri: p.redirectUri,
      client_id: p.clientId,
      client_secret: p.clientSecret,
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as { id_token?: unknown } | null;
  return typeof data?.id_token === "string" ? data.id_token : null;
}

let googleJwks: JWTVerifyGetKey | null = null;

/**
 * Verifies signature (Google JWKS), iss, aud, exp and nonce, and requires a
 * Google-verified email. Returns null on any failure.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  p: { clientId: string; nonce: string; jwks?: JWTVerifyGetKey },
): Promise<GoogleProfile | null> {
  try {
    const keys = p.jwks ?? (googleJwks ??= createRemoteJWKSet(new URL(GOOGLE_JWKS_URL)));
    const { payload } = await jwtVerify(idToken, keys, {
      issuer: GOOGLE_ISSUERS,
      audience: p.clientId,
      algorithms: ["RS256"],
      clockTolerance: 30,
    });
    if (!statesMatch(typeof payload.nonce === "string" ? payload.nonce : null, p.nonce)) return null;
    if (payload.email_verified !== true) return null;
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
    return {
      sub: payload.sub,
      email: payload.email.trim().toLowerCase(),
      name: typeof payload.name === "string" ? payload.name : null,
      picture: typeof payload.picture === "string" ? payload.picture : null,
    };
  } catch {
    return null;
  }
}
