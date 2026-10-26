/** Google OIDC primitives: PKCE, auth URL, state compare, id_token checks (local keys, no network). */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SignJWT, exportJWK, generateKeyPair, createLocalJWKSet } from "jose";
import {
  buildGoogleAuthUrl,
  createOAuthTransaction,
  pkceChallenge,
  statesMatch,
  verifyGoogleIdToken,
} from "../google.ts";

const CLIENT_ID = "client-123.apps.googleusercontent.com";

async function keySet() {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256" };
  return { privateKey, jwks: createLocalJWKSet({ keys: [jwk] }) };
}

async function idToken(privateKey: CryptoKey, claims: Record<string, unknown>, over: { iss?: string; aud?: string } = {}) {
  return new SignJWT({ email: "Admin@Example.com", email_verified: true, nonce: "n-1", ...claims })
    .setProtectedHeader({ alg: "RS256", kid: "k1" })
    .setSubject("google-sub-1")
    .setIssuer(over.iss ?? "https://accounts.google.com")
    .setAudience(over.aud ?? CLIENT_ID)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
}

describe("google oauth", () => {
  it("PKCE S256 matches the RFC 7636 test vector", () => {
    assert.equal(
      pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });

  it("transactions are random and URL-safe", () => {
    const a = createOAuthTransaction();
    const b = createOAuthTransaction();
    assert.notEqual(a.state, b.state);
    assert.match(a.codeVerifier, /^[A-Za-z0-9_-]{43,128}$/);
  });

  it("auth URL carries client, redirect, state, nonce and S256 challenge, never the verifier", () => {
    const t = createOAuthTransaction();
    const url = new URL(buildGoogleAuthUrl({ clientId: CLIENT_ID, redirectUri: "http://localhost:3000/cb", ...t }));
    const q = url.searchParams;
    assert.equal(url.origin, "https://accounts.google.com");
    assert.equal(q.get("client_id"), CLIENT_ID);
    assert.equal(q.get("redirect_uri"), "http://localhost:3000/cb");
    assert.equal(q.get("response_type"), "code");
    assert.equal(q.get("scope"), "openid email profile");
    assert.equal(q.get("state"), t.state);
    assert.equal(q.get("nonce"), t.nonce);
    assert.equal(q.get("code_challenge"), pkceChallenge(t.codeVerifier));
    assert.equal(q.get("code_challenge_method"), "S256");
    assert.ok(!url.toString().includes(t.codeVerifier));
  });

  it("statesMatch is exact and rejects empty values", () => {
    assert.equal(statesMatch("abc", "abc"), true);
    assert.equal(statesMatch("abc", "abd"), false);
    assert.equal(statesMatch("abc", "abcd"), false);
    assert.equal(statesMatch(null, "abc"), false);
    assert.equal(statesMatch("", ""), false);
  });

  it("accepts a valid id_token and normalizes the email", async () => {
    const { privateKey, jwks } = await keySet();
    const p = await verifyGoogleIdToken(await idToken(privateKey, {}), { clientId: CLIENT_ID, nonce: "n-1", jwks });
    assert.deepEqual(p, { sub: "google-sub-1", email: "admin@example.com", name: null, picture: null });
  });

  it("rejects wrong audience, issuer, nonce and unverified email", async () => {
    const { privateKey, jwks } = await keySet();
    const opts = { clientId: CLIENT_ID, nonce: "n-1", jwks };
    assert.equal(await verifyGoogleIdToken(await idToken(privateKey, {}, { aud: "other" }), opts), null);
    assert.equal(await verifyGoogleIdToken(await idToken(privateKey, {}, { iss: "https://evil.example" }), opts), null);
    assert.equal(await verifyGoogleIdToken(await idToken(privateKey, { nonce: "n-2" }), opts), null);
    assert.equal(await verifyGoogleIdToken(await idToken(privateKey, { email_verified: false }), opts), null);
  });

  it("rejects a token signed by a different key", async () => {
    const { jwks } = await keySet();
    const other = await keySet();
    assert.equal(
      await verifyGoogleIdToken(await idToken(other.privateKey, {}), { clientId: CLIENT_ID, nonce: "n-1", jwks }),
      null,
    );
  });
});
