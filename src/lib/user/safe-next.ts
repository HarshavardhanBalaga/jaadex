/**
 * Post-login redirect target (client+server safe). Only same-site paths are
 * allowed: anything else (absolute URLs, protocol-relative "//", "/\") falls
 * back to "/" so ?next= can never become an open redirect. Whitespace and
 * control characters are rejected too: browsers strip tabs/newlines from
 * URLs, which would turn "/\t/evil.com" into "//evil.com".
 */
export function safeNext(raw: string | string[] | null | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !value.startsWith("/")) return "/";
  if (value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (/[\s\x00-\x1f\x7f]/.test(value)) return "/";
  return value;
}
