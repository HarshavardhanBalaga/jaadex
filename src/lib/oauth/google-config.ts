/**
 * Google OAuth client config (SERVER-ONLY). Optional feature: when the
 * credentials are absent the Google button is hidden and the start route
 * bounces back to login, so nothing else breaks.
 */
import "server-only";

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
}

export function getGoogleOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function isGoogleOAuthEnabled(): boolean {
  return getGoogleOAuthConfig() !== null;
}
