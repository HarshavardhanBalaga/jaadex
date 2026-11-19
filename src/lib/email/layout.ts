/**
 * Shared JaaDeX email layout (pure; unit-testable). Every email is rendered by renderEmail(),
 * so the header, card, type scale, button and footer are identical across all mails.
 * Solid brand colours only (no gradients), and email-safe fonts (web fonts are not reliable in mail clients).
 * Responsive: on screens up to 480px the gutters, headings, code and detail rows shrink and stack.
 */

export const EMAIL_COLORS = {
  navy: "#07074f",      // headings
  royal: "#1450d6",     // primary button, accents
  ink: "#1a2358",       // body text
  muted: "#52608a",     // labels and footnotes
  line: "#dbe3f5",      // dividers and borders
  tint: "#eef3ff",      // soft panels (details, code)
  canvas: "#f4f6fa",    // outer background
  white: "#ffffff",
} as const;

const C = EMAIL_COLORS;
const FONT = "Arial, Helvetica, sans-serif";

/** Type scale (px). Nothing below 13px, body text 16px, headings 24px. */
const SIZE = { heading: 24, body: 16, small: 14, label: 13, code: 32 } as const;

/**
 * Phone styles. Inline styles win over normal stylesheet rules, so the mobile
 * overrides use !important. Classes are the hooks; the desktop values stay inline.
 */
const RESPONSIVE_CSS = `
body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; }
.jx-value { overflow-wrap: anywhere; word-break: break-word; }
@media only screen and (max-width: 480px) {
  .jx-gutter { padding: 16px 8px !important; }
  .jx-header { padding: 16px 20px !important; }
  .jx-logo { width: 110px !important; max-width: 110px !important; }
  .jx-header-text { font-size: 14px !important; }
  .jx-body { padding: 24px 20px 8px 20px !important; }
  .jx-foot { padding: 20px 20px 24px 20px !important; }
  .jx-h1 { font-size: 20px !important; line-height: 1.3 !important; margin-bottom: 16px !important; }
  .jx-code { font-size: 26px !important; letter-spacing: 4px !important; padding: 16px 8px !important; }
  .jx-row, .jx-label, .jx-value { display: block !important; width: 100% !important; box-sizing: border-box !important; }
  .jx-label { padding: 12px 16px 2px 16px !important; border-bottom: 0 !important; }
  .jx-value { padding: 0 16px 12px 16px !important; }
  .jx-btn a { display: block !important; text-align: center !important; padding: 14px 16px !important; }
}
`;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Body paragraph. Line breaks inside `text` are kept. */
export function paragraph(text: string, size: number = SIZE.body, color: string = C.ink): string {
  return `<p style="margin:0 0 16px 0;font-family:${FONT};font-size:${size}px;line-height:1.6;color:${color};">${escapeHtml(text).replace(/\n/g, "<br>")}</p>`;
}

/**
 * Label/value rows in a soft panel, e.g. workshop details or enquiry fields.
 * Desktop: label beside value. Phone: label above value, so long values get the full width.
 */
export function detailsTable(rows: { label: string; value: string }[]): string {
  const body = rows
    .map((row, i) => {
      const border = i < rows.length - 1 ? `border-bottom:1px solid ${C.line};` : "";
      return `<tr class="jx-row">
  <td class="jx-label" valign="top" style="padding:12px 16px;${border}width:130px;font-family:${FONT};font-size:${SIZE.label}px;line-height:1.4;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;color:${C.muted};">${escapeHtml(row.label)}</td>
  <td class="jx-value" valign="top" style="padding:12px 16px 12px 0;${border}font-family:${FONT};font-size:${SIZE.body}px;line-height:1.5;color:${C.navy};word-break:break-word;">${escapeHtml(row.value)}</td>
</tr>`;
    })
    .join("\n");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;background-color:${C.tint};border:1px solid ${C.line};border-radius:8px;">
${body}
</table>`;
}

/** The one-time code, shown large and centred in a solid panel. */
export function codeBlock(code: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
<tr><td class="jx-code" align="center" style="padding:20px 16px;background-color:${C.tint};border:1px solid #c2d4f8;border-radius:8px;font-family:${FONT};font-size:${SIZE.code}px;line-height:1.2;font-weight:bold;letter-spacing:8px;color:${C.navy};">${escapeHtml(code)}</td></tr>
</table>`;
}

/** Bordered box for longer user-written text (enquiry message, admin update). */
export function messageBox(text: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
<tr><td style="padding:16px 20px;background-color:${C.white};border:1px solid ${C.line};border-left:4px solid ${C.royal};border-radius:8px;font-family:${FONT};font-size:${SIZE.body}px;line-height:1.6;color:${C.ink};word-break:break-word;">${escapeHtml(text).replace(/\n/g, "<br>")}</td></tr>
</table>`;
}

/** Solid primary button. Table-based so it renders the same in Outlook; full width on phones. */
export function button(label: string, url: string): string {
  return `<table class="jx-btn" role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
<tr><td align="center" bgcolor="${C.royal}" style="border-radius:8px;background-color:${C.royal};">
<a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:${SIZE.body}px;line-height:1.2;font-weight:bold;color:${C.white};text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
</td></tr>
</table>`;
}

export interface EmailFrame {
  /** Hidden preview text shown in the inbox list. */
  preheader: string;
  heading: string;
  /** Pre-built body HTML from paragraph(), detailsTable(), button(), etc. */
  body: string;
  /** Plain-text note under the body, e.g. why the reader got this mail. */
  footnote: string;
  logoUrl: string;
  /** Site origin, e.g. https://www.jaadex.com. Used for the website link and the icon images. */
  siteUrl: string;
}

/**
 * Same links as the website footer. Icon images are inline CID attachments (see EMAIL_ICON_CID
 * and mailer.ts), so they show on localhost and production alike without hosting.
 */
export const EMAIL_ICON_CID = {
  website: "jx-icon-website",
  instagram: "jx-icon-instagram",
  linkedin: "jx-icon-linkedin",
  facebook: "jx-icon-facebook",
} as const;

const SOCIAL_LINKS = [
  { label: "Website", cid: EMAIL_ICON_CID.website, url: "" },
  { label: "Instagram", cid: EMAIL_ICON_CID.instagram, url: "https://www.instagram.com/jaadexinnovision" },
  { label: "LinkedIn", cid: EMAIL_ICON_CID.linkedin, url: "https://www.linkedin.com/company/jaadex-innovision" },
  { label: "Facebook", cid: EMAIL_ICON_CID.facebook, url: "https://www.facebook.com/jaadexinnovision" },
] as const;

function socialLinks(siteUrl: string): string {
  const base = siteUrl.replace(/\/+$/, "");
  const cells = SOCIAL_LINKS.map((link) => {
    const href = link.url || base;
    return `<a href="${escapeHtml(href)}" target="_blank" style="text-decoration:none;"><img src="cid:${link.cid}" width="24" height="24" alt="${escapeHtml(link.label)}" title="${escapeHtml(link.label)}" style="display:inline-block;width:24px;height:24px;border:0;"></a>`;
  });
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 16px auto;">
<tr>${cells.map((c) => `<td style="padding:0 10px;">${c}</td>`).join("")}</tr>
</table>`;
}

/** Wraps a body in the fixed JaaDeX frame: header, card, footer. */
export function renderEmail(frame: EmailFrame): string {
  const logo = frame.logoUrl
    ? `<img class="jx-logo" src="${escapeHtml(frame.logoUrl)}" width="140" alt="JaaDeX" style="display:block;width:140px;max-width:140px;height:auto;border:0;">`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(frame.heading)}</title>
<style>${RESPONSIVE_CSS}</style>
</head>
<body style="margin:0;padding:0;background-color:${C.canvas};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.canvas};">${escapeHtml(frame.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.canvas}" style="background-color:${C.canvas};">
<tr><td class="jx-gutter" align="center" style="padding:24px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:${C.white};border:1px solid ${C.line};border-radius:12px;overflow:hidden;">
    <tr><td class="jx-header" style="padding:20px 32px;border-bottom:1px solid ${C.line};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="left" valign="middle" width="140">${logo}</td>
          <td class="jx-header-text" align="right" valign="middle" style="font-family:${FONT};font-size:${SIZE.body}px;line-height:1.4;font-weight:bold;color:${C.navy};">JaaDeX Innovision</td>
        </tr>
      </table>
    </td></tr>
    <tr><td class="jx-body" style="padding:32px 32px 8px 32px;">
      <h1 class="jx-h1" style="margin:0 0 20px 0;font-family:${FONT};font-size:${SIZE.heading}px;line-height:1.3;font-weight:bold;color:${C.navy};">${escapeHtml(frame.heading)}</h1>
      ${frame.body}
    </td></tr>
    <tr><td class="jx-foot" style="padding:24px 32px 32px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${C.line};">
        <tr><td align="center" style="padding:24px 0 0 0;">
          ${socialLinks(frame.siteUrl)}
          <p style="margin:0 0 8px 0;font-family:${FONT};font-size:${SIZE.label}px;line-height:1.5;color:${C.muted};">${escapeHtml(frame.footnote)}</p>
          <p style="margin:0;font-family:${FONT};font-size:${SIZE.label}px;line-height:1.5;color:${C.muted};">JaaDeX Innovision Pvt Ltd</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

export interface EmailParts {
  subject: string;
  text: string;
  html: string;
}
