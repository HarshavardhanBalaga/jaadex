/**
 * Display name for a website user created from Google (pure; unit-tested).
 * Uses the Google name, else the email's local part, so the stored name is never empty.
 * Kept free of "server-only" so the node test runner can load it directly.
 */
import type { GoogleProfile } from "../oauth/google.ts";

const NAME_MAX = 80;

function clean(value: string): string {
  return value.replace(/[\x00-\x1f\x7f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
}

export function displayNameFromProfile(profile: Pick<GoogleProfile, "name" | "email">): string {
  const fromName = clean(profile.name ?? "");
  if (fromName) return fromName;
  const fromEmail = clean(profile.email.split("@")[0] ?? "");
  return fromEmail || "JaaDeX user";
}
