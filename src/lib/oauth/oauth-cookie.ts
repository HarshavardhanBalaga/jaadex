/**
 * Short-lived OAuth transaction cookie (SERVER-ONLY): holds state, PKCE
 * verifier and nonce between /start and /callback. SameSite=Lax because the
 * callback is a cross-site top-level GET from the provider. The cookie name
 * is a parameter so each audience (admin, user) keeps its own transaction.
 */
import "server-only";
import { cookies } from "next/headers";
import type { OAuthTransaction } from "./google";

const TXN_MAX_AGE_SECONDS = 10 * 60;

export async function setOAuthTxnCookie(name: string, txn: OAuthTransaction): Promise<void> {
  const store = await cookies();
  store.set(name, Buffer.from(JSON.stringify(txn), "utf8").toString("base64url"), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: TXN_MAX_AGE_SECONDS,
  });
}

/** Reads and deletes the transaction (single use). */
export async function consumeOAuthTxnCookie(name: string): Promise<OAuthTransaction | null> {
  const store = await cookies();
  const raw = store.get(name)?.value;
  store.set(name, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  if (!raw) return null;
  try {
    const t = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<OAuthTransaction>;
    if (typeof t.state !== "string" || typeof t.codeVerifier !== "string" || typeof t.nonce !== "string") return null;
    return { state: t.state, codeVerifier: t.codeVerifier, nonce: t.nonce };
  } catch {
    return null;
  }
}
