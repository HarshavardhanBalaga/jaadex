import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { adminGoogleRedirectUri, ADMIN_GOOGLE_TXN_COOKIE, googleLoginFailed, noStoreRedirect } from "@/lib/admin/google-routes";
import { getGoogleOAuthConfig } from "@/lib/oauth/google-config";
import { buildGoogleAuthUrl, createOAuthTransaction } from "@/lib/oauth/google";
import { setOAuthTxnCookie } from "@/lib/oauth/oauth-cookie";

export const dynamic = "force-dynamic";

/** Starts admin Google sign-in: state + PKCE + nonce in a short-lived cookie, then off to Google. */
export async function GET(request: Request) {
  const limited = await checkRateLimit(`google-start:${clientIp(request)}`, 20, 60).catch(() => null);
  if (limited && !limited.allowed) return googleLoginFailed(request);
  const google = getGoogleOAuthConfig();
  if (!google) return googleLoginFailed(request);
  try {
    const txn = createOAuthTransaction();
    const url = buildGoogleAuthUrl({ clientId: google.clientId, redirectUri: adminGoogleRedirectUri(), ...txn });
    await setOAuthTxnCookie(ADMIN_GOOGLE_TXN_COOKIE, txn);
    return noStoreRedirect(url);
  } catch {
    console.error("[admin-auth][google] start failed");
    return googleLoginFailed(request);
  }
}
