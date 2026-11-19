/**
 * Workshop emails (pure; unit-tested): registration confirmation and admin updates.
 * Each returns the plain-text part and the HTML part, both built from the shared JaaDeX layout.
 * The text part has no markup, and line breaks are kept out of the subject.
 */
// Relative + .ts so the node test runner (no path aliases) can load this file directly.
import { formatWorkshopDate, workshopWhenWhere } from "./format.ts";
import { button, detailsTable, paragraph, renderEmail, type EmailParts } from "../email/layout.ts";

export interface RegistrationEmailInput {
  name: string;
  workshopTitle: string;
  /** ISO date, null = to be announced. */
  date: string | null;
  /** "" = to be announced. */
  location: string;
  workshopsUrl: string;
  /** Site origin, used for the logo in the footer. */
  siteUrl: string;
}

function oneLine(v: string, max: number): string {
  return v.replace(/[\r\n]+/g, " ").trim().slice(0, max);
}

/** Workshop facts as label/value rows, with "to be announced" for missing values. */
function workshopRows(e: RegistrationEmailInput, title: string) {
  return [
    { label: "Workshop", value: title },
    { label: "Date", value: e.date ? formatWorkshopDate(e.date) : "To be announced" },
    { label: "Location", value: e.location || "To be announced" },
  ];
}

export function buildRegistrationConfirmationEmail(e: RegistrationEmailInput): EmailParts {
  const title = oneLine(e.workshopTitle, 140);
  const name = oneLine(e.name, 80);
  const subject = oneLine(`You're registered: ${title}`, 200);
  const text =
    `Hi ${name},\n\n` +
    `Thank you for registering for "${title}". Your seat is confirmed.\n\n` +
    `When & where: ${workshopWhenWhere(e.date, e.location)}\n\n` +
    `We'll contact you with the details before the workshop.\n\n` +
    `— Team JaaDeX\n` +
    `${e.workshopsUrl}\n`;

  const body =
    paragraph(`Hi ${name},`) +
    paragraph(`Thank you for registering for "${title}". Your seat is confirmed.`) +
    detailsTable(workshopRows(e, title)) +
    paragraph("We'll contact you with the details before the workshop.") +
    button("View workshops", e.workshopsUrl);

  const html = renderEmail({
    preheader: `Your seat for ${title} is confirmed.`,
    heading: "You're registered",
    body,
    footnote: `You're receiving this because you registered for ${title} on JaaDeX.`,
    logoUrl: `${e.siteUrl}/logo/jaadexlogo.png`,
    siteUrl: e.siteUrl,
  });
  return { subject, text, html };
}

/** Admin-written update to a registrant: greeting, the admin's message as written, workshop footer. */
export function buildWorkshopUpdateEmail(e: RegistrationEmailInput & { subject: string; message: string }): EmailParts {
  const title = oneLine(e.workshopTitle, 140);
  const name = oneLine(e.name, 80);
  const subject = oneLine(e.subject, 150);
  const message = e.message.trim();
  const text =
    `Hi ${name},\n\n` +
    `${message}\n\n` +
    `Workshop: ${title}\n` +
    `When & where: ${workshopWhenWhere(e.date, e.location)}\n\n` +
    `— Team JaaDeX\n` +
    `${e.workshopsUrl}\n`;

  // Keep the admin's paragraphs as written: each blank line starts a new paragraph.
  const messageHtml = message
    .split(/\n\s*\n/)
    .map((para) => paragraph(para.trim()))
    .join("");
  const body =
    paragraph(`Hi ${name},`) +
    messageHtml +
    detailsTable(workshopRows(e, title)) +
    button("View workshops", e.workshopsUrl);

  const html = renderEmail({
    preheader: subject,
    heading: subject,
    body,
    footnote: `You're receiving this because you are registered for ${title} on JaaDeX.`,
    logoUrl: `${e.siteUrl}/logo/jaadexlogo.png`,
    siteUrl: e.siteUrl,
  });
  return { subject, text, html };
}
