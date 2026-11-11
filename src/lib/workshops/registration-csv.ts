/** CSV export of workshop registrations. Pure (no DB), so it is unit-tested directly. */

export type RegistrationCsvRow = {
  name: string;
  phone: string;
  email: string;
  createdAt: Date;
};

/** Spreadsheet apps run a cell starting with these as a formula: prefix "'" so it stays text. */
const FORMULA_START = /^[=+\-@\t\r]/;
/** A bare signed number (e.g. phone "+919876543210") can't run as a formula, so it stays as-is. */
const PLAIN_NUMBER = /^[+-]?[0-9]+$/;

function cell(value: string): string {
  const safe = FORMULA_START.test(value) && !PLAIN_NUMBER.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** BOM so Excel opens UTF-8 names correctly; CRLF line endings per RFC 4180. */
export function buildRegistrationsCsv(rows: readonly RegistrationCsvRow[]): string {
  const header = ["Name", "Phone", "Email", "Registered at (UTC)"].map(cell).join(",");
  const lines = rows.map((r) => [r.name, r.phone, r.email, r.createdAt.toISOString()].map(cell).join(","));
  return `﻿${[header, ...lines].join("\r\n")}\r\n`;
}

/** e.g. "ai-film-bootcamp-registrations.csv". Header-safe: ASCII letters, digits and dashes only. */
export function registrationsCsvFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "workshop"}-registrations.csv`;
}
