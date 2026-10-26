/**
 * Admin auth environment configuration (SERVER-ONLY).
 * Lazy validation: only throws when auth is actually used,
 * so `next build`, health checks and public pages never break
 * without auth secrets configured.
 */
import "server-only";

export interface AdminAuthConfig {
  accessSecret: string;
  refreshSecret: string;
  otpPepper: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
  accessExpiresSeconds: number;
  refreshExpiresSeconds: number;
  otpLength: number;
  otpExpiresMinutes: number;
  otpMaxAttempts: number;
  otpResendCooldownSeconds: number;
  otpMaxResends: number;
  adminOtpEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  mailFrom: string;
  appUrl: string;
  clientUrl: string;
  jwtIssuer: string;
  jwtAudience: string;
  csrfCookieName: string;
  accessCookieName: string;
  refreshCookieName: string;
  isProduction: boolean;
  useSecureCookies: boolean;
}

function required(name: string, hint?: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(
      `[admin-auth] Missing required env var ${name}. ` +
        `Add it to jaadex/.env (dev) or your host secret manager (prod). ` +
        (hint ? `${hint} ` : "") +
        `See .env.example.`,
    );
  }
  return v;
}

function optional(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

function requiredInt(name: string, min: number, max: number): number {
  const raw = required(name);
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new Error(`[admin-auth] Invalid ${name}="${raw}". Expected integer ${min}-${max}.`);
  }
  return n;
}

/** Accepts "15m", "30d", "12h", "900s" or plain seconds. */
export function parseDurationToSeconds(raw: string, name: string): number {
  const t = raw.trim().toLowerCase();
  const m = /^(\d+)\s*([smhd])?$/.exec(t);
  if (!m) throw new Error(`[admin-auth] Invalid ${name}="${raw}". Use e.g. 15m, 12h, 30d or seconds.`);
  const n = Number(m[1]);
  const unit = m[2] ?? "s";
  const mult = unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 3600 : 86400;
  const secs = n * mult;
  if (!Number.isSafeInteger(secs) || secs <= 0) {
    throw new Error(`[admin-auth] Invalid ${name}="${raw}". Must be a positive duration.`);
  }
  return secs;
}

let cached: AdminAuthConfig | null = null;

export function getAdminAuthConfig(options: { bypassCache?: boolean } = {}): AdminAuthConfig {
  if (cached && !options.bypassCache) return cached;
  const accessSecret = required("JWT_ACCESS_SECRET");
  const refreshSecret = required("JWT_REFRESH_SECRET");
  const otpPepper = required("OTP_PEPPER", "Set it to a random >= 32-char secret.");
  if (accessSecret.length < 32 || refreshSecret.length < 32 || otpPepper.length < 32) {
    throw new Error("[admin-auth] JWT_ACCESS_SECRET, JWT_REFRESH_SECRET and OTP_PEPPER must each be >= 32 chars.");
  }
  if (accessSecret === refreshSecret || accessSecret === otpPepper || refreshSecret === otpPepper) {
    throw new Error("[admin-auth] JWT_ACCESS_SECRET, JWT_REFRESH_SECRET and OTP_PEPPER must all differ.");
  }
  const accessExpiresIn = optional("JWT_ACCESS_EXPIRES_IN", "15m");
  const refreshExpiresIn = optional("JWT_REFRESH_EXPIRES_IN", "30d");
  const accessExpiresSeconds = parseDurationToSeconds(accessExpiresIn, "JWT_ACCESS_EXPIRES_IN");
  const refreshExpiresSeconds = parseDurationToSeconds(refreshExpiresIn, "JWT_REFRESH_EXPIRES_IN");
  if (accessExpiresSeconds > 3600) {
    throw new Error("[admin-auth] JWT_ACCESS_EXPIRES_IN must be <= 60m (short-lived access tokens).");
  }
  if (refreshExpiresSeconds > 60 * 86400) {
    throw new Error("[admin-auth] JWT_REFRESH_EXPIRES_IN must be <= 60d.");
  }
  const adminOtpEmail = required("ADMIN_OTP_EMAIL").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminOtpEmail)) {
    throw new Error("[admin-auth] ADMIN_OTP_EMAIL is not a valid email.");
  }
  const appUrl = optional("APP_URL", optional("CLIENT_URL", "http://localhost:3000")).replace(/\/+$/, "");
  const clientUrl = optional("CLIENT_URL", appUrl).replace(/\/+$/, "");
  const nodeEnv = (process.env.NODE_ENV ?? "development").toLowerCase();
  const isProduction = nodeEnv === "production";
  if (isProduction && !appUrl.startsWith("https://")) {
    throw new Error("[admin-auth] APP_URL must be https:// in production.");
  }
  cached = {
    accessSecret,
    refreshSecret,
    otpPepper,
    accessExpiresIn,
    refreshExpiresIn,
    accessExpiresSeconds,
    refreshExpiresSeconds,
    otpLength: requiredInt("OTP_LENGTH", 6, 8),
    otpExpiresMinutes: requiredInt("OTP_EXPIRES_IN_MINUTES", 5, 30),
    otpMaxAttempts: requiredInt("OTP_MAX_ATTEMPTS", 3, 10),
    otpResendCooldownSeconds: requiredInt("OTP_RESEND_COOLDOWN_SECONDS", 30, 600),
    otpMaxResends: 5,
    adminOtpEmail,
    smtpHost: required("SMTP_HOST"),
    smtpPort: requiredInt("SMTP_PORT", 1, 65535),
    smtpSecure: optional("SMTP_SECURE", "false").toLowerCase() === "true",
    smtpUser: optional("SMTP_USER", ""),
    smtpPass: optional("SMTP_PASS", ""),
    mailFrom: optional("MAIL_FROM", adminOtpEmail),
    appUrl,
    clientUrl,
    jwtIssuer: optional("JWT_ISSUER", "jaadex-admin"),
    jwtAudience: optional("JWT_AUDIENCE", "jaadex-admin-portal"),
    csrfCookieName: "__Host-jaadex_csrf",
    accessCookieName: "__Host-jaadex_at",
    refreshCookieName: "__Host-jaadex_rt",
    isProduction,
    // __Host- cookies are rejected by browsers unless Secure is set — even
    // on http://localhost. Secure cookies still work on localhost because
    // browsers treat it as a secure context, so this is always true.
    // (Dev note: use http://localhost:3000 for admin, not a LAN IP — Secure
    // cookies are never sent over plain-HTTP non-localhost hosts.)
    useSecureCookies: true,
  };
  return cached;
}

/** Test helper. */
export function __resetAdminAuthConfigCache(): void {
  cached = null;
}
