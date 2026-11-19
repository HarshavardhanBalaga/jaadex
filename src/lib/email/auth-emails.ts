/**
 * One-time code emails (admin + website user): verify and password reset (pure; unit-testable).
 * Codes are never links. The code is shown once, large, with its expiry and a "never share" note.
 */
import { codeBlock, EMAIL_COLORS, paragraph, renderEmail, type EmailParts } from "./layout.ts";

export interface OtpEmailInput {
  subject: string;
  heading: string;
  /** Opening sentence, e.g. "Your JaaDeX OTP is:". */
  intro: string;
  otp: string;
  expiresMinutes: number;
  /** Why the reader got this mail; also the closing line of the plain-text version. */
  reason: string;
  siteUrl: string;
}

export function buildOtpEmail(e: OtpEmailInput): EmailParts {
  const expiry = `It expires in ${e.expiresMinutes} minutes and can be used once.`;
  const safety = "Never share this code with anyone, including JaaDeX staff.";
  const text = `${e.intro} ${e.otp}\n\n${expiry}\n${e.reason} ${safety}`;

  const body =
    paragraph(e.intro) +
    codeBlock(e.otp) +
    paragraph(expiry, 15, EMAIL_COLORS.navy) +
    paragraph(e.reason, 14, EMAIL_COLORS.muted) +
    paragraph(safety, 14, EMAIL_COLORS.muted);

  return {
    subject: e.subject,
    text,
    html: renderEmail({
      preheader: `Your code is ${e.otp}. It expires in ${e.expiresMinutes} minutes.`,
      heading: e.heading,
      body,
      footnote: "This is an automated security email. Please do not reply to it.",
      logoUrl: `${e.siteUrl}/logo/jaadexlogo.png`,
    }),
  };
}
