import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { accessCookieSpec, refreshCookieSpec, setAuthCookies } from "@/lib/admin/cookies";
import { loginAdminWithGoogle } from "@/lib/admin/google-login";
import {
  adminAppUrl,
  adminGoogleRedirectUri,
  ADMIN_GOOGLE_TXN_COOKIE,
  googleLoginFailed,
  noStoreRedirect,
} from "@/lib/admin/google-routes";
import { hashMeta } from "@/lib/admin/request-meta";
import { getGoogleOAuthConfig } from "@/lib/oauth/google-config";
import { exchangeGoogleCode, statesMatch, verifyGoogleIdToken } from "@/lib/oauth/google";
import { consumeOAuthTxnCookie } from "@/lib/oauth/oauth-cookie";

export const dynamic = "force-dynamic";

/**
 * Google redirects here. Every failure collapses to one generic login error;
 * only a short reason code is logged (never codes, tokens or emails).
 */
export async function GET(request: Request) {
  const ip = clientIp(request);
  const limited = await checkRateLimit(`google-cb:${ip}`, 20, 60).catch(() => null);
  if (limited && !limited.allowed) return googleLoginFailed(request);

  // Always consume the transaction first so it can never be replayed.
  const txn = await consumeOAuthTxnCookie(ADMIN_GOOGLE_TXN_COOKIE);
  const params = new URL(request.url).searchParams;
  const google = getGoogleOAuthConfig();
  const code = params.get("code");
  if (!google || !txn || params.get("error") || !code || !statesMatch(params.get("state"), txn.state)) {
    console.error("[admin-auth][google] callback rejected: bad_request");
    return googleLoginFailed(request);
  }
  try {
    const idToken = await exchangeGoogleCode({
      clientId: google.clientId,
      clientSecret: google.clientSecret,
      code,
      codeVerifier: txn.codeVerifier,
      redirectUri: adminGoogleRedirectUri(),
    });
    if (!idToken) {
      console.error("[admin-auth][google] callback rejected: exchange_failed");
      return googleLoginFailed(request);
    }
    const profile = await verifyGoogleIdToken(idToken, { clientId: google.clientId, nonce: txn.nonce });
    if (!profile) {
      console.error("[admin-auth][google] callback rejected: id_token_invalid");
      return googleLoginFailed(request);
    }
    const r = await loginAdminWithGoogle(profile, {
      ipHash: hashMeta(ip),
      uaHash: hashMeta(request.headers.get("user-agent") ?? ""),
    });
    if (r.outcome !== "ok") {
      console.error("[admin-auth][google] callback rejected:", r.outcome);
      return googleLoginFailed(request);
    }
    await setAuthCookies([accessCookieSpec(r.accessToken), refreshCookieSpec(r.refreshToken)]);
    return noStoreRedirect(new URL("/admin/dashboard", adminAppUrl(request)));
  } catch {
    console.error("[admin-auth][google] callback failed: unavailable");
    return googleLoginFailed(request);
  }
}
