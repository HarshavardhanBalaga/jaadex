/**
 * Kids Creative Challenge registration tests (no DB, no server-only imports).
 * Validation + CSV are tested directly; route protection is asserted via source structure.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { kidsChallengeRegistrationSchema } from "../registration-validation.ts";
import { buildKidsChallengeCsv } from "../registration-csv.ts";

const src = (p: string): string => readFileSync(join(process.cwd(), p), "utf8");

const good = {
  parentName: "Lakshmi Rao",
  parentEmail: " Lakshmi@Example.com ",
  parentPhone: "9876543210",
  studentName: "Anil Rao",
  studentClass: "5",
  studentAge: "10",
  schoolName: "ZP High School",
  city: "Vijayawada",
  state: "Andhra Pradesh",
  consent: true,
  website: "",
};

describe("kids challenge registration validation", () => {
  it("accepts a valid registration, normalises email and coerces numbers", () => {
    const parsed = kidsChallengeRegistrationSchema.safeParse(good);
    assert.equal(parsed.success, true);
    assert.equal(parsed.data?.parentEmail, "lakshmi@example.com");
    assert.equal(parsed.data?.studentClass, 5);
    assert.equal(parsed.data?.studentAge, 10);
  });

  it("rejects bad input", () => {
    const bad = (patch: Record<string, unknown>) => kidsChallengeRegistrationSchema.safeParse({ ...good, ...patch }).success;
    assert.equal(bad({ parentPhone: "12345" }), false);
    assert.equal(bad({ parentEmail: "nope" }), false);
    assert.equal(bad({ studentClass: "0" }), false);
    assert.equal(bad({ studentClass: "11" }), false);
    assert.equal(bad({ studentClass: "" }), false);
    assert.equal(bad({ studentAge: "30" }), false);
    assert.equal(bad({ state: "Atlantis" }), false);
    assert.equal(bad({ consent: false }), false);
    assert.equal(bad({ studentName: "A" }), false);
    assert.equal(bad({ website: "spam" }), false);
    assert.equal(bad({ extra: "field" }), false);
  });
});

describe("kids challenge CSV", () => {
  it("writes a header, escapes formula cells and quotes", () => {
    const csv = buildKidsChallengeCsv([
      {
        parentName: '=HYPERLINK("x")',
        parentEmail: "a@b.com",
        parentPhone: "9876543210",
        studentName: "Anil",
        studentClass: 5,
        studentAge: 10,
        schoolName: "ZP School",
        city: "Vijayawada",
        state: "Andhra Pradesh",
        paymentStatus: "pending",
        createdAt: new Date("2026-01-02T03:04:05Z"),
      },
    ]);
    const [header, row] = csv.replace(/^﻿/, "").split("\r\n");
    assert.match(header, /^"Parent name","Parent email"/);
    assert.ok(row.startsWith(`"'=HYPERLINK(""x"")"`));
    assert.ok(row.includes(`"2026-01-02T03:04:05.000Z"`));
  });
});

describe("kids challenge route protection", () => {
  it("POST requires a signed-in user and is rate limited", () => {
    const route = src("src/app/api/kids-challenge/registrations/route.ts");
    assert.match(route, /getCurrentUser\(\)/);
    assert.match(route, /checkRateLimit\(/);
  });

  it("CSV export is admin-only", () => {
    assert.match(src("src/app/api/kids-challenge/registrations/export/route.ts"), /requireAdminFromToken\(/);
  });
});
