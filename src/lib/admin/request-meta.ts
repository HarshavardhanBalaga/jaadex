import { createHash } from "node:crypto";

/** Truncated SHA-256 of request metadata (IP, user agent) stored on sessions. */
export function hashMeta(v: string): string | null {
  if (!v) return null;
  return createHash("sha256").update(v, "utf8").digest("hex").slice(0, 32);
}
