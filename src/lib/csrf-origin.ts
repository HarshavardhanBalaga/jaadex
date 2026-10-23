/**
 * Origin validation for cookie-authenticated POSTs (client+server safe).
 *
 * Layering note: the double-submit CSRF token (header vs cookie) is the real
 * guard — an attacker page cannot read the cookie to forge the header. The
 * origin check below is defense-in-depth on top: a wrong Origin/Referer is
 * always rejected, while loopback aliases (localhost ≡ 127.0.0.1 ≡ ::1) are
 * treated as the same site so local dev works on any loopback URL.
 */

interface Site {
  proto: string;
  host: string;
  port: string;
}

function parseSite(value: string): Site | null {
  try {
    const u = new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return {
      proto: u.protocol.toLowerCase(),
      host: u.hostname.toLowerCase(),
      port: u.port || (u.protocol === "https:" ? "443" : "80"),
    };
  } catch {
    return null;
  }
}

export function isLoopback(host: string): boolean {
  const h = host.trim().toLowerCase().replace(/^\[|\]$/g, "");
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

function sameSite(a: Site | null, b: Site | null): boolean {
  if (!a || !b) return false;
  if (a.proto !== b.proto || a.port !== b.port) return false;
  if (a.host === b.host) return true;
  return isLoopback(a.host) && isLoopback(b.host);
}

function hostHeaderSite(request: Request): Site | null {
  const host = request.headers.get("host")?.trim();
  if (!host) return null;
  // Reuse URL parsing so IPv6 and default ports behave.
  return parseSite(`http://${host}`);
}

/**
 * True when the request plausibly comes from appUrl/clientUrl.
 * Order: Origin header → Referer origin → Host header fallback (covers
 * privacy tools that strip both; the CSRF token remains the primary guard).
 */
export function originAllowed(request: Request, appUrl: string, clientUrl: string): boolean {
  const allowed = [parseSite(appUrl), parseSite(clientUrl)].filter((s): s is Site => s !== null);
  if (allowed.length === 0) return false;
  const origin = request.headers.get("origin")?.trim();
  if (origin) return allowed.some((a) => sameSite(a, parseSite(origin)));
  const referer = request.headers.get("referer")?.trim();
  if (referer) {
    const site = parseSite(referer);
    if (!site) return false;
    return allowed.some((a) => sameSite(a, site));
  }
  const hostSite = hostHeaderSite(request);
  if (!hostSite) return false;
  return allowed.some(
    (a) => a.port === hostSite.port && (a.host === hostSite.host || (isLoopback(a.host) && isLoopback(hostSite.host))),
  );
}
