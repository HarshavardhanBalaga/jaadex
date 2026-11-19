import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { hashMeta } from "@/lib/admin/request-meta";
import { adminAppUrl, noStoreRedirect } from "@/lib/admin/google-routes";
import { getGoogleOAuthConfig } from "@/lib/oauth/google-config";
import { exchangeGoogleCode, statesMatch, verifyGoogleIdToken } from "@/lib/oauth/google";
import { consumeOAuthTxnCookie } from "@/lib/oauth/oauth-cookie";
import { loginOrCreateUserWithGoogle } from "@/lib/user/google-login";
import { createUserSession } from "@/lib/user/session";
import { safeNext } from "@/lib/user/safe-next";
import { userGoogleLoginFailed, userGoogleRedirectUri, USER_GOOGLE_TXN_COOKIE } from "@/lib/user/google-routes";

export const dynamic = "force-dynamic";

/**
 * Google redirects here. The transaction cookie is consumed before anything else
 * so it can never be replayed. Every failure collapses to one generic login error;
 * only a short reason code is logged (never codes, tokens or emails).
 */
export async function GET(request: Request) {
  const ip = clientIp(request);
  const limited = await checkRateLimit(`user-google-cb:${ip}`, 20, 60).catch(() => null);
  if (limited && !limited.allowed) return userGoogleLoginFailed(request);

  const txn = await consumeOAuthTxnCookie(USER_GOOGLE_TXN_COOKIE);
  const params = new URL(request.url).searchParams;
  const google = getGoogleOAuthConfig();
  const code = params.get("code");
  if (!google || !txn || params.get("error") || !code || !statesMatch(params.get("state"), txn.state)) {
    console.error("[user-auth][google] callback rejected: bad_request");
    return userGoogleLoginFailed(request, txn?.next);
  }
  const next = safeNext(txn.next);
  try {
    const idToken = await exchangeGoogleCode({
      clientId: google.clientId,
      clientSecret: google.clientSecret,
      code,
      codeVerifier: txn.codeVerifier,
      redirectUri: userGoogleRedirectUri(),
    });
    if (!idToken) {
      console.error("[user-auth][google] callback rejected: exchange_failed");
      return userGoogleLoginFailed(request, next);
    }
    const profile = await verifyGoogleIdToken(idToken, { clientId: google.clientId, nonce: txn.nonce });
    if (!profile) {
      console.error("[user-auth][google] callback rejected: id_token_invalid");
      return userGoogleLoginFailed(request, next);
    }
    const r = await loginOrCreateUserWithGoogle(profile);
    if (r.outcome !== "ok") {
      console.error("[user-auth][google] callback rejected: account_unavailable");
      return userGoogleLoginFailed(request, next);
    }
    await createUserSession(r.userId, {
      ipHash: hashMeta(ip),
      uaHash: hashMeta(request.headers.get("user-agent") ?? ""),
    });
    return noStoreRedirect(new URL(next, adminAppUrl(request)));
  } catch {
    console.error("[user-auth][google] callback failed: unavailable");
    return userGoogleLoginFailed(request, next);
  }
}
