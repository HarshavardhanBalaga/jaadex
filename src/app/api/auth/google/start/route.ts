import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { getGoogleOAuthConfig } from "@/lib/oauth/google-config";
import { buildGoogleAuthUrl, createOAuthTransaction } from "@/lib/oauth/google";
import { setOAuthTxnCookie } from "@/lib/oauth/oauth-cookie";
import { noStoreRedirect } from "@/lib/admin/google-routes";
import { safeNext } from "@/lib/user/safe-next";
import { userGoogleLoginFailed, userGoogleRedirectUri, USER_GOOGLE_TXN_COOKIE } from "@/lib/user/google-routes";

export const dynamic = "force-dynamic";

/** Starts website-user Google sign-in: state + PKCE + nonce + a validated `next` in a short-lived cookie. */
export async function GET(request: Request) {
  const limited = await checkRateLimit(`user-google-start:${clientIp(request)}`, 20, 60).catch(() => null);
  if (limited && !limited.allowed) return userGoogleLoginFailed(request);
  const google = getGoogleOAuthConfig();
  if (!google) return userGoogleLoginFailed(request);
  const next = safeNext(new URL(request.url).searchParams.get("next"));
  try {
    const txn = { ...createOAuthTransaction(), next };
    const url = buildGoogleAuthUrl({
      clientId: google.clientId,
      redirectUri: userGoogleRedirectUri(),
      state: txn.state,
      codeVerifier: txn.codeVerifier,
      nonce: txn.nonce,
    });
    await setOAuthTxnCookie(USER_GOOGLE_TXN_COOKIE, txn);
    return noStoreRedirect(url);
  } catch {
    console.error("[user-auth][google] start failed");
    return userGoogleLoginFailed(request, next);
  }
}
