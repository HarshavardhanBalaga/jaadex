import { validateCsrf } from "@/lib/admin/csrf";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { readAuthCookies } from "@/lib/admin/cookies";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { fail, ok } from "@/lib/admin/respond";
import { MAX_ATTACHMENT_BYTES, checkAttachment, formatBytes, safeAttachmentName } from "@/lib/workshops/attachment-rules";
import { saveKidsEmailAttachment } from "@/lib/kids-challenge/email-service";

export const dynamic = "force-dynamic";

/** Room for the multipart wrapper around one file. */
const MAX_BODY_BYTES = MAX_ATTACHMENT_BYTES + 64 * 1024;

/**
 * Admin-only: upload one file for a Kids Challenge email (multipart field "file").
 * Session token + CSRF double-submit; type, size and real content are checked.
 */
export async function POST(request: Request) {
  const csrfError = await validateCsrf(request);
  if (csrfError) return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  const limited = await checkRateLimit(`kids-challenge-email-upload:${clientIp(request)}`, 30, 60).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many uploads. Try again later.", 429);
  // Refuse oversized bodies before reading them.
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return fail("file_too_large", `Each file must be under ${formatBytes(MAX_ATTACHMENT_BYTES)}.`, 413);
  }
  let file: FormDataEntryValue | null = null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return fail("invalid_request", "Invalid upload.", 400);
  }
  if (!(file instanceof File)) return fail("invalid_request", "Choose a file to attach.", 400);
  const filename = safeAttachmentName(file.name);
  const bytes = Buffer.from(await file.arrayBuffer());
  const verdict = checkAttachment(filename, bytes);
  if (!verdict.ok) return fail("file_rejected", verdict.message, 400);
  try {
    const saved = await saveKidsEmailAttachment({ filename, contentType: verdict.contentType, bytes }, checked.ctx.admin.email);
    return ok({ attachment: { id: saved.id, filename, size: bytes.length } }, 201);
  } catch (err) {
    console.error("[kids-challenge-email] upload unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}
