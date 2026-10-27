/**
 * Post-login redirect target (client+server safe). Only same-site paths are
 * allowed: anything else (absolute URLs, protocol-relative "//", "/\") falls
 * back to "/" so ?next= can never become an open redirect.
 */
export function safeNext(raw: string | string[] | null | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !value.startsWith("/")) return "/";
  if (value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
