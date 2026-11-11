/**
 * Workshop registration confirmation email (pure; unit-tested).
 * Sending lives in lib/admin/mailer.ts; this only renders a plain-text message
 * (no HTML, so no markup injection) and keeps line breaks out of the subject.
 */
// Relative + .ts so the node test runner (no path aliases) can load this file directly.
import { workshopWhenWhere } from "./format.ts";

export interface RegistrationEmailInput {
  name: string;
  workshopTitle: string;
  /** ISO date, null = to be announced. */
  date: string | null;
  /** "" = to be announced. */
  location: string;
  workshopsUrl: string;
}

function oneLine(v: string, max: number): string {
  return v.replace(/[\r\n]+/g, " ").trim().slice(0, max);
}

export function buildRegistrationConfirmationEmail(e: RegistrationEmailInput): { subject: string; text: string } {
  const title = oneLine(e.workshopTitle, 140);
  const subject = oneLine(`You're registered: ${title}`, 200);
  const text =
    `Hi ${oneLine(e.name, 80)},\n\n` +
    `Thank you for registering for "${title}". Your seat is confirmed.\n\n` +
    `When & where: ${workshopWhenWhere(e.date, e.location)}\n\n` +
    `We'll contact you with the details before the workshop.\n\n` +
    `— Team JaaDeX\n` +
    `${e.workshopsUrl}\n`;
  return { subject, text };
}
