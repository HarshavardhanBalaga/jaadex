/**
 * Kids Creative Challenge emails (pure; unit-tested): the payment confirmation, and admin-written updates to parents.
 * Same shared JaaDeX layout as the workshop emails: plain-text part + HTML part, all values escaped by the layout helpers.
 */
// Relative + .ts so the node test runner (no path aliases) can load this file directly.
import { button, detailsTable, paragraph, renderEmail, type EmailParts } from "../email/layout.ts";
import { challengeTitle, howToJoin } from "../../data/kids-challenge.ts";
import { formatInr } from "./analytics.ts";

export interface KidsConfirmationEmailInput {
  parentName: string;
  studentName: string;
  studentClass: number;
  schoolName: string;
  amountPaise: number;
  paymentId: string | null;
  paidAt: Date | null;
  /** Link to the challenge page. */
  challengeUrl: string;
  /** Site origin, used for the logo in the footer. */
  siteUrl: string;
}

function oneLine(v: string, max: number): string {
  return v.replace(/[\r\n]+/g, " ").trim().slice(0, max);
}

/** e.g. "19 Nov 2026, 3:42 pm IST". */
function istDateTime(d: Date): string {
  return `${d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })} IST`;
}

/** Steps after payment: the first published step ("registers … completes payment") is already done. */
const NEXT_STEPS = howToJoin.steps.slice(1);

export function buildKidsChallengeConfirmationEmail(e: KidsConfirmationEmailInput): EmailParts {
  const parent = oneLine(e.parentName, 80);
  const student = oneLine(e.studentName, 80);
  const school = oneLine(e.schoolName, 120);
  const amount = formatInr(e.amountPaise);
  const subject = oneLine(`Registration confirmed: ${student} – JaaDeX ${challengeTitle}`, 200);
  const rows = [
    { label: "Student", value: student },
    { label: "Class", value: `Class ${e.studentClass}` },
    { label: "School", value: school },
    { label: "Amount paid", value: amount },
    { label: "Payment ID", value: e.paymentId ?? "—" },
    { label: "Paid on", value: e.paidAt ? istDateTime(e.paidAt) : "—" },
  ];
  const steps = NEXT_STEPS.map((step, i) => `${i + 1}. ${step}`).join("\n");

  const text =
    `Hi ${parent},\n\n` +
    `Thank you! We've received your payment of ${amount}. ${student} is now registered for the JaaDeX ${challengeTitle}.\n\n` +
    rows.map((r) => `${r.label}: ${r.value}`).join("\n") +
    `\n\nWhat happens next:\n${steps}\n\n` +
    `Keep this email as your payment confirmation.\n\n` +
    `— Team JaaDeX\n` +
    `${e.challengeUrl}\n`;

  const body =
    paragraph(`Hi ${parent},`) +
    paragraph(`Thank you! We've received your payment of ${amount}. ${student} is now registered for the JaaDeX ${challengeTitle}.`) +
    detailsTable(rows) +
    paragraph("What happens next:") +
    paragraph(steps) +
    paragraph("Keep this email as your payment confirmation.") +
    button("View the challenge", e.challengeUrl);

  const html = renderEmail({
    preheader: `${student}'s registration is confirmed. Payment of ${amount} received.`,
    heading: "Registration confirmed",
    body,
    footnote: `You're receiving this because you registered ${student} for the JaaDeX ${challengeTitle}.`,
    logoUrl: `${e.siteUrl}/logo/jaadexlogo.png`,
    siteUrl: e.siteUrl,
  });
  return { subject, text, html };
}

export interface KidsUpdateEmailInput {
  parentName: string;
  studentName: string;
  studentClass: number;
  /** Paid registrations get "View the challenge"; unpaid ones get a "Complete payment" button. */
  paid: boolean;
  subject: string;
  message: string;
  challengeUrl: string;
  /** Register page, where an unpaid parent finishes the ₹99 payment. */
  registerUrl: string;
  siteUrl: string;
}

/** Admin-written message to one parent: greeting, the admin's paragraphs as written, the child's registration, one action button. */
export function buildKidsChallengeUpdateEmail(e: KidsUpdateEmailInput): EmailParts {
  const parent = oneLine(e.parentName, 80);
  const student = oneLine(e.studentName, 80);
  const subject = oneLine(e.subject, 150);
  const message = e.message.trim();
  const status = e.paid ? "Confirmed" : "Payment pending";
  const rows = [
    { label: "Student", value: student },
    { label: "Class", value: `Class ${e.studentClass}` },
    { label: "Registration", value: status },
  ];
  const action = e.paid ? { label: "View the challenge", url: e.challengeUrl } : { label: "Complete payment", url: e.registerUrl };

  const text =
    `Hi ${parent},\n\n` +
    `${message}\n\n` +
    rows.map((r) => `${r.label}: ${r.value}`).join("\n") +
    `\n\n${action.label}: ${action.url}\n\n` +
    `— Team JaaDeX\n`;

  // Keep the admin's paragraphs as written: each blank line starts a new paragraph.
  const messageHtml = message
    .split(/\n\s*\n/)
    .map((para) => paragraph(para.trim()))
    .join("");
  const body = paragraph(`Hi ${parent},`) + messageHtml + detailsTable(rows) + button(action.label, action.url);

  const html = renderEmail({
    preheader: subject,
    heading: subject,
    body,
    footnote: `You're receiving this because you registered ${student} for the JaaDeX ${challengeTitle}.`,
    logoUrl: `${e.siteUrl}/logo/jaadexlogo.png`,
    siteUrl: e.siteUrl,
  });
  return { subject, text, html };
}
