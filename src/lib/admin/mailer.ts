/**
 * SMTP mailer (SERVER-ONLY). Registration codes go to the shared inbox;
 * password-reset codes go to the account email; new-enquiry alerts go to
 * ENQUIRY_NOTIFY_EMAIL (fallback ADMIN_OTP_EMAIL).
 * Every mail is sent as multipart: an HTML part in the shared JaaDeX layout plus a plain-text part.
 */
import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { getAdminAuthConfig } from "./auth-config";
import { buildEnquiryEmail, type EnquiryForEmail } from "@/lib/contact/notify";
import { buildOtpEmail } from "@/lib/email/auth-emails";
import type { EmailParts } from "@/lib/email/layout";
import { EMAIL_ICON_CID } from "@/lib/email/layout";
import { EMAIL_ICONS } from "@/lib/email/icon-assets";

let cachedTransport: Transporter | null = null;

/** Footer icons as inline CID attachments, so they render without a hosted URL (localhost or production). */
function iconAttachments() {
  return (Object.keys(EMAIL_ICON_CID) as (keyof typeof EMAIL_ICON_CID)[]).map((key) => ({
    filename: `${key}.png`,
    content: Buffer.from(EMAIL_ICONS[key], "base64"),
    contentType: "image/png",
    cid: EMAIL_ICON_CID[key],
    contentDisposition: "inline" as const,
  }));
}

function getTransport(): Transporter | null {
  const c = getAdminAuthConfig();
  if (!c.smtpHost) return null;
  if (cachedTransport) return cachedTransport;
  cachedTransport = nodemailer.createTransport({
    host: c.smtpHost,
    port: c.smtpPort,
    secure: c.smtpSecure,
    auth: c.smtpUser ? { user: c.smtpUser, pass: c.smtpPass } : undefined,
  });
  return cachedTransport;
}

export async function sendRegistrationOtp(otp: string, expiresMinutes: number): Promise<void> {
  const c = getAdminAuthConfig();
  const transport = getTransport();
  const email = buildOtpEmail({
    subject: "JaaDeX admin registration code",
    heading: "Verify your admin registration",
    intro: "Your JaaDeX admin OTP is:",
    otp,
    expiresMinutes,
    reason: "If you did not request this, ignore this email.",
    siteUrl: c.appUrl,
  });
  if (!transport) {
    // No SMTP configured (local dev): never throw, never expose OTP via API.
    console.info("[admin-auth] SMTP not configured; OTP email skipped (dev only).");
    return;
  }
  await transport.sendMail({ from: c.mailFrom, to: c.adminOtpEmail, ...email, attachments: iconAttachments() });
}

export async function sendPasswordResetOtp(to: string, otp: string, expiresMinutes: number): Promise<void> {
  const c = getAdminAuthConfig();
  const transport = getTransport();
  const email = buildOtpEmail({
    subject: "JaaDeX admin password reset code",
    heading: "Reset your admin password",
    intro: "Your JaaDeX admin password reset code is:",
    otp,
    expiresMinutes,
    reason: "If you did not request this, ignore this email and your password will stay unchanged.",
    siteUrl: c.appUrl,
  });
  if (!transport) {
    // No SMTP configured (local dev): never throw, never expose OTP via API.
    console.info("[admin-auth] SMTP not configured; password-reset email skipped (dev only).");
    return;
  }
  await transport.sendMail({ from: c.mailFrom, to, ...email, attachments: iconAttachments() });
}

/** Website-user registration code, sent to the user's own email. */
export async function sendUserVerificationOtp(to: string, otp: string, expiresMinutes: number): Promise<void> {
  const c = getAdminAuthConfig();
  const transport = getTransport();
  const email = buildOtpEmail({
    subject: "Verify your JaaDeX account",
    heading: "Verify your account",
    intro: "Your JaaDeX OTP is:",
    otp,
    expiresMinutes,
    reason: "If you did not create a JaaDeX account, ignore this email.",
    siteUrl: c.appUrl,
  });
  if (!transport) {
    // No SMTP configured (local dev): never throw, never expose OTP via API.
    console.info("[user-auth] SMTP not configured; verification email skipped (dev only).");
    return;
  }
  await transport.sendMail({ from: c.mailFrom, to, ...email, attachments: iconAttachments() });
}

/** Website-user password-reset code, sent to the user's own email. */
export async function sendUserPasswordResetOtp(to: string, otp: string, expiresMinutes: number): Promise<void> {
  const c = getAdminAuthConfig();
  const transport = getTransport();
  const email = buildOtpEmail({
    subject: "Reset your JaaDeX password",
    heading: "Reset your password",
    intro: "Your JaaDeX password reset code is:",
    otp,
    expiresMinutes,
    reason: "If you did not request this, ignore this email and your password will stay unchanged.",
    siteUrl: c.appUrl,
  });
  if (!transport) {
    // No SMTP configured (local dev): never throw, never expose OTP via API.
    console.info("[user-auth] SMTP not configured; password-reset email skipped (dev only).");
    return;
  }
  await transport.sendMail({ from: c.mailFrom, to, ...email, attachments: iconAttachments() });
}

/** Website-user password-setup code (Google account adding a password), sent to the user's own email. */
export async function sendUserPasswordSetupOtp(to: string, otp: string, expiresMinutes: number): Promise<void> {
  const c = getAdminAuthConfig();
  const transport = getTransport();
  const email = buildOtpEmail({
    subject: "Set a password for your JaaDeX account",
    heading: "Set a password",
    intro: "Your code to add a password to your JaaDeX account is:",
    otp,
    expiresMinutes,
    reason: "If you did not request this, ignore this email. You can keep signing in with Google.",
    siteUrl: c.appUrl,
  });
  if (!transport) {
    console.info("[user-auth] SMTP not configured; password-setup email skipped (dev only).");
    return;
  }
  await transport.sendMail({ from: c.mailFrom, to, ...email, attachments: iconAttachments() });
}

/**
 * Workshop emails (registration confirmations and admin updates), sent from MAIL_FROM.
 * "skipped" when SMTP is not configured; throws on SMTP failure so the caller can record it.
 */
export async function sendWorkshopEmail(
  to: string,
  email: EmailParts,
  attachments: { filename: string; content: Buffer; contentType: string }[] = [],
): Promise<"sent" | "skipped"> {
  const c = getAdminAuthConfig();
  const transport = getTransport();
  if (!transport) {
    console.info("[workshops] SMTP not configured; workshop email skipped (dev only).");
    return "skipped";
  }
  await transport.sendMail({ from: c.mailFrom, to, subject: email.subject, text: email.text, html: email.html, attachments: [...iconAttachments(), ...attachments] });
  return "sent";
}

/** New-enquiry alert to the team. Reply-To is the submitter so staff can answer directly. */
export async function sendEnquiryNotification(enquiry: EnquiryForEmail): Promise<void> {
  const c = getAdminAuthConfig();
  const transport = getTransport();
  if (!transport) {
    console.info("[contact] SMTP not configured; enquiry email skipped (dev only).");
    return;
  }
  const { subject, text, html } = buildEnquiryEmail(enquiry, c.appUrl);
  await transport.sendMail({ from: c.mailFrom, to: c.enquiryNotifyEmails, replyTo: enquiry.email, subject, text, html, attachments: iconAttachments() });
}
