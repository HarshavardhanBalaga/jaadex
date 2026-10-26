/**
 * SMTP mailer (SERVER-ONLY). Registration codes go to the shared inbox;
 * password-reset codes go to the account email; new-enquiry alerts go to
 * ENQUIRY_NOTIFY_EMAIL (fallback ADMIN_OTP_EMAIL).
 */
import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { getAdminAuthConfig } from "./auth-config";
import { buildEnquiryEmail, type EnquiryForEmail } from "@/lib/contact/notify";

let cachedTransport: Transporter | null = null;

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
  const subject = "JaaDeX admin registration code";
  const text =
    `Your JaaDeX admin verification code is: ${otp}\n\n` +
    `It expires in ${expiresMinutes} minutes and can be used once.\n` +
    `If you did not request this, ignore this email.`;
  if (!transport) {
    // No SMTP configured (local dev): never throw, never expose OTP via API.
    console.info("[admin-auth] SMTP not configured; OTP email skipped (dev only).");
    return;
  }
  await transport.sendMail({ from: c.mailFrom, to: c.adminOtpEmail, subject, text });
}

export async function sendPasswordResetOtp(to: string, otp: string, expiresMinutes: number): Promise<void> {
  const c = getAdminAuthConfig();
  const transport = getTransport();
  const subject = "JaaDeX admin password reset code";
  const text =
    `Your JaaDeX admin password reset code is: ${otp}\n\n` +
    `It expires in ${expiresMinutes} minutes and can be used once.\n` +
    `If you did not request this, ignore this email and your password will stay unchanged.`;
  if (!transport) {
    // No SMTP configured (local dev): never throw, never expose OTP via API.
    console.info("[admin-auth] SMTP not configured; password-reset email skipped (dev only).");
    return;
  }
  await transport.sendMail({ from: c.mailFrom, to, subject, text });
}

/** New-enquiry alert to the team. Reply-To is the submitter so staff can answer directly. */
export async function sendEnquiryNotification(enquiry: EnquiryForEmail): Promise<void> {
  const c = getAdminAuthConfig();
  const transport = getTransport();
  if (!transport) {
    console.info("[contact] SMTP not configured; enquiry email skipped (dev only).");
    return;
  }
  const { subject, text } = buildEnquiryEmail(enquiry, `${c.appUrl}/admin/dashboard`);
  await transport.sendMail({ from: c.mailFrom, to: c.enquiryNotifyEmails, replyTo: enquiry.email, subject, text });
}
