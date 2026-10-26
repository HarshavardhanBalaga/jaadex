/**
 * Enquiry notification helpers (pure; client+server safe, unit-testable).
 * Sending lives in lib/admin/mailer.ts; this only decides recipients and
 * renders a plain-text message (no HTML, so no markup injection).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EnquiryForEmail {
  name: string;
  email: string;
  organization: string;
  interest: string;
  message: string;
  createdAt: Date;
}

/** Comma-separated list from env → valid, lowercased, de-duplicated addresses; falls back when empty. */
export function parseNotifyEmails(raw: string | undefined, fallback: string): string[] {
  const list = (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => EMAIL_RE.test(s));
  const unique = [...new Set(list)];
  return unique.length > 0 ? unique : [fallback];
}

function oneLine(v: string, max: number): string {
  return v.replace(/[\r\n]+/g, " ").trim().slice(0, max);
}

export function buildEnquiryEmail(e: EnquiryForEmail, dashboardUrl: string): { subject: string; text: string } {
  const subject = oneLine(`New enquiry: ${e.interest} — ${e.name}`, 150);
  const text =
    `A new enquiry was submitted on the JaaDeX website.\n\n` +
    `Name:         ${oneLine(e.name, 80)}\n` +
    `Email:        ${oneLine(e.email, 254)}\n` +
    `Organization: ${oneLine(e.organization, 100) || "-"}\n` +
    `Interest:     ${oneLine(e.interest, 80)}\n` +
    `Received:     ${e.createdAt.toISOString()}\n\n` +
    `Message:\n${e.message}\n\n` +
    `Reply to this email to answer the sender directly.\n` +
    `View all enquiries: ${dashboardUrl}\n`;
  return { subject, text };
}
