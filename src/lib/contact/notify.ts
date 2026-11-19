/**
 * Enquiry notification helpers (pure; client+server safe, unit-testable).
 * Sending lives in lib/admin/mailer.ts; this decides recipients and renders
 * the plain-text and HTML parts (HTML values are escaped, so no markup injection).
 */
import { button, detailsTable, EMAIL_COLORS, messageBox, paragraph, renderEmail, type EmailParts } from "../email/layout.ts";

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

export function buildEnquiryEmail(e: EnquiryForEmail, siteUrl: string): EmailParts {
  const dashboardUrl = `${siteUrl}/admin/dashboard`;
  const subject = oneLine(`New enquiry: ${e.interest} — ${e.name}`, 260);
  const name = oneLine(e.name, 80);
  const interest = oneLine(e.interest, 160);
  const organization = oneLine(e.organization, 100) || "-";
  const received = e.createdAt.toISOString();
  const text =
    `A new enquiry was submitted on the JaaDeX website.\n\n` +
    `Name:         ${name}\n` +
    `Email:        ${oneLine(e.email, 254)}\n` +
    `Organization: ${organization}\n` +
    `Interest:     ${interest}\n` +
    `Received:     ${received}\n\n` +
    `Message:\n${e.message}\n\n` +
    `Reply to this email to answer the sender directly.\n` +
    `View all enquiries: ${dashboardUrl}\n`;

  const body =
    paragraph("A new enquiry was submitted on the JaaDeX website.") +
    detailsTable([
      { label: "Name", value: name },
      { label: "Email", value: oneLine(e.email, 254) },
      { label: "Organization", value: organization },
      { label: "Interest", value: interest },
      { label: "Received", value: received },
    ]) +
    paragraph("Message", 13, EMAIL_COLORS.muted) +
    messageBox(e.message) +
    paragraph("Reply to this email to answer the sender directly.") +
    button("Open admin dashboard", dashboardUrl);

  const html = renderEmail({
    preheader: `${name} sent an enquiry about ${interest}.`,
    heading: interest,
    body,
    footnote: "Sent automatically when someone submits the website enquiry form.",
    logoUrl: `${siteUrl}/logo/jaadexlogo.png`,
  });
  return { subject, text, html };
}
