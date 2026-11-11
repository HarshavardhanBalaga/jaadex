/**
 * Email attachment rules shared by the composer (client) and the upload API (server).
 * Pure, so it is unit-tested directly. The server also checks each file's first bytes,
 * so a renamed executable can't pass as a PDF or image.
 */

export const MAX_ATTACHMENTS = 5;
/** Vercel rejects request bodies over 4.5 MB, so each file is uploaded on its own and capped below that. */
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
/** Safe total for Gmail, Outlook and most SMTP providers. */
export const MAX_TOTAL_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const PDF = [0x25, 0x50, 0x44, 0x46]; // %PDF
const PNG = [0x89, 0x50, 0x4e, 0x47];
const JPEG = [0xff, 0xd8, 0xff];
const GIF = [0x47, 0x49, 0x46, 0x38]; // GIF8
const RIFF = [0x52, 0x49, 0x46, 0x46]; // WEBP container
const ZIP = [0x50, 0x4b, 0x03, 0x04]; // docx / xlsx / pptx
const OLE = [0xd0, 0xcf, 0x11, 0xe0]; // legacy doc / xls / ppt

/** Allowed extension → content type sent with the email, and the bytes the file must start with. */
const ALLOWED: Record<string, { contentType: string; magic: number[] }> = {
  pdf: { contentType: "application/pdf", magic: PDF },
  png: { contentType: "image/png", magic: PNG },
  jpg: { contentType: "image/jpeg", magic: JPEG },
  jpeg: { contentType: "image/jpeg", magic: JPEG },
  gif: { contentType: "image/gif", magic: GIF },
  webp: { contentType: "image/webp", magic: RIFF },
  doc: { contentType: "application/msword", magic: OLE },
  xls: { contentType: "application/vnd.ms-excel", magic: OLE },
  ppt: { contentType: "application/vnd.ms-powerpoint", magic: OLE },
  docx: { contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", magic: ZIP },
  xlsx: { contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", magic: ZIP },
  pptx: { contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", magic: ZIP },
};

/** For the file picker's `accept` attribute. */
export const ATTACHMENT_ACCEPT = Object.keys(ALLOWED).map((ext) => `.${ext}`).join(",");

export const ATTACHMENT_TYPES_LABEL = "PDF, images (JPG, PNG, WEBP, GIF), Word, Excel or PowerPoint";

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
}

/** Keeps the name readable but safe for mail headers and file systems. */
export function safeAttachmentName(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[\x00-\x1f\x7f"<>:|?*]/g, "").replace(/\s+/g, " ").trim();
  const ext = extensionOf(cleaned);
  const stem = ext ? cleaned.slice(0, -(ext.length + 1)) : cleaned;
  return `${stem.slice(0, 100) || "attachment"}${ext ? `.${ext}` : ""}`;
}

/** Quick check before uploading (type by extension, size). */
export function precheckAttachment(filename: string, size: number): string | null {
  if (!ALLOWED[extensionOf(filename)]) return `“${filename}” isn't allowed. Attach a ${ATTACHMENT_TYPES_LABEL} file.`;
  if (size === 0) return `“${filename}” is empty.`;
  if (size > MAX_ATTACHMENT_BYTES) return `“${filename}” is larger than ${formatBytes(MAX_ATTACHMENT_BYTES)}.`;
  return null;
}

/** Full server check: extension, size and the file's real content. */
export function checkAttachment(filename: string, bytes: Uint8Array): { ok: true; contentType: string } | { ok: false; message: string } {
  const pre = precheckAttachment(filename, bytes.length);
  if (pre) return { ok: false, message: pre };
  const rule = ALLOWED[extensionOf(filename)];
  if (!rule.magic.every((b, i) => bytes[i] === b)) {
    return { ok: false, message: `“${filename}” doesn't look like a real .${extensionOf(filename)} file.` };
  }
  return { ok: true, contentType: rule.contentType };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace(/\.0$/, "")} MB`;
}
