/**
 * Kids Challenge admin tests (no DB): query schemas, analytics helpers and the payments CSV are tested
 * directly; admin-only access, CSRF and ledger idempotency are asserted via source structure.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { adminAnalyticsQuerySchema, adminPaymentsQuerySchema, adminRegistrationsQuerySchema } from "../admin-validation.ts";
import { fillDailySeries, formatInr, istDayKey, istStartOfDay, methodLabel, percent } from "../analytics.ts";
import { buildPaymentsCsv } from "../payments-csv.ts";

const src = (p: string): string => readFileSync(join(process.cwd(), p), "utf8");

describe("admin query schemas", () => {
  it("registrations: defaults, coercion and rejects", () => {
    const d = adminRegistrationsQuerySchema.parse({});
    assert.deepEqual(d, { page: 1, limit: 25, q: "", payment: "all", studentClass: "all", state: "all", sort: "createdAt", order: "desc" });
    const p = adminRegistrationsQuerySchema.parse({ page: "3", limit: "50", studentClass: "7", state: "Telangana", payment: "paid", sort: "paidAt" });
    assert.equal(p.page, 3);
    assert.equal(p.studentClass, 7);
    for (const bad of [{ limit: "13" }, { studentClass: "11" }, { state: "Atlantis" }, { sort: "parentEmail" }, { payment: "refunded" }, { extra: "x" }]) {
      assert.equal(adminRegistrationsQuerySchema.safeParse(bad).success, false, JSON.stringify(bad));
    }
  });

  it("payments: dates, method and range order", () => {
    assert.equal(adminPaymentsQuerySchema.safeParse({ from: "2026-01-01", to: "2026-01-31", method: "upi", status: "failed" }).success, true);
    assert.equal(adminPaymentsQuerySchema.safeParse({ from: "2026-02-01", to: "2026-01-01" }).success, false);
    assert.equal(adminPaymentsQuerySchema.safeParse({ from: "01/02/2026" }).success, false);
    assert.equal(adminPaymentsQuerySchema.safeParse({ method: "UPI; drop" }).success, false);
    assert.equal(adminPaymentsQuerySchema.safeParse({ status: "refunded" }).success, false);
  });

  it("analytics: only 7, 30 or 90 days", () => {
    assert.equal(adminAnalyticsQuerySchema.parse({}).days, 30);
    assert.equal(adminAnalyticsQuerySchema.parse({ days: "90" }).days, 90);
    assert.equal(adminAnalyticsQuerySchema.safeParse({ days: "365" }).success, false);
  });
});

describe("analytics helpers", () => {
  it("buckets by India-time day", () => {
    // 20:00 UTC on 1 Jan is 01:30 IST on 2 Jan.
    assert.equal(istDayKey(new Date("2026-01-01T20:00:00Z")), "2026-01-02");
    assert.equal(istDayKey(new Date("2026-01-01T18:00:00Z")), "2026-01-01");
    assert.equal(istStartOfDay(new Date("2026-01-01T20:00:00Z")).toISOString(), "2026-01-01T18:30:00.000Z");
  });

  it("fills every day of the range, oldest first, with zeros for quiet days", () => {
    const now = new Date("2026-03-10T06:00:00Z"); // 10 Mar IST
    const series = fillDailySeries(7, now, [{ _id: "2026-03-08", count: 3 }], [{ _id: "2026-03-10", count: 2, revenuePaise: 19800 }]);
    assert.equal(series.length, 7);
    assert.equal(series[0].date, "2026-03-04");
    assert.equal(series[6].date, "2026-03-10");
    assert.deepEqual(series[4], { date: "2026-03-08", registrations: 3, paid: 0, revenuePaise: 0 });
    assert.deepEqual(series[6], { date: "2026-03-10", registrations: 0, paid: 2, revenuePaise: 19800 });
  });

  it("formats money, percentages and methods", () => {
    assert.equal(formatInr(990000), "₹9,900");
    assert.equal(formatInr(9950), "₹99.50");
    assert.equal(percent(1, 3), 33.3);
    assert.equal(percent(5, 0), 0);
    assert.equal(methodLabel("upi"), "UPI");
    assert.equal(methodLabel("netbanking"), "Net banking");
    assert.equal(methodLabel("some_new_method"), "Some new method");
    assert.equal(methodLabel(null), "Unknown");
  });
});

describe("payments CSV", () => {
  it("writes rupees, labels orders without a payment and escapes formula cells", () => {
    const csv = buildPaymentsCsv([
      {
        createdAt: "2026-01-02T03:04:05.000Z",
        status: "created",
        amountPaise: 9900,
        currency: "INR",
        method: null,
        feePaise: null,
        taxPaise: null,
        orderId: "order_1",
        paymentId: null,
        failedAttempts: 0,
        errorDescription: null,
        confirmedBy: null,
        paidAt: null,
        studentName: "=cmd()",
        parentName: "P",
        parentEmail: "p@x.com",
        parentPhone: "9876543210",
      },
      {
        createdAt: "2026-01-02T03:04:05.000Z",
        status: "paid",
        amountPaise: 9900,
        currency: "INR",
        method: "upi",
        feePaise: 234,
        taxPaise: 36,
        orderId: "order_2",
        paymentId: "pay_2",
        failedAttempts: 1,
        errorDescription: "Bank declined",
        confirmedBy: "checkout",
        paidAt: "2026-01-02T03:06:00.000Z",
        studentName: "Anil",
        parentName: "P",
        parentEmail: "p@x.com",
        parentPhone: "9876543210",
      },
    ]);
    const [header, abandoned, paid] = csv.replace(/^﻿/, "").split("\r\n");
    assert.match(header, /^"Started at \(UTC\)","Status","Amount \(INR\)"/);
    assert.ok(abandoned.includes(`"no payment recorded","99.00","INR","","",""`));
    assert.ok(abandoned.includes(`"'=cmd()"`));
    assert.ok(paid.includes(`"paid","99.00","INR","upi","2.34","0.36","order_2","pay_2","1","Bank declined","checkout"`));
  });

  it("distinguishes a fee Razorpay has not reported from a real zero fee", () => {
    const base = {
      createdAt: "2026-01-02T03:04:05.000Z",
      status: "paid" as const,
      amountPaise: 9900,
      currency: "INR",
      method: "upi",
      orderId: "o",
      paymentId: "p",
      failedAttempts: 0,
      errorDescription: null,
      confirmedBy: "checkout",
      paidAt: "2026-01-02T03:06:00.000Z",
      studentName: "A",
      parentName: "P",
      parentEmail: "p@x.com",
      parentPhone: "9876543210",
    };
    const [, unknown, zero] = buildPaymentsCsv([
      { ...base, feePaise: null, taxPaise: null },
      { ...base, feePaise: 0, taxPaise: 0 },
    ])
      .replace(/^﻿/, "")
      .split(String.fromCharCode(13, 10));
    assert.ok(unknown.includes(`"upi","not available yet","not available yet"`));
    assert.ok(zero.includes(`"upi","0.00","0.00"`));
  });
});

describe("admin access and ledger guarantees", () => {
  const adminRoutes = [
    "src/app/api/admin/kids-challenge/analytics/route.ts",
    "src/app/api/admin/kids-challenge/registrations/route.ts",
    "src/app/api/admin/kids-challenge/registrations/[id]/route.ts",
    "src/app/api/admin/kids-challenge/registrations/[id]/sync/route.ts",
    "src/app/api/admin/kids-challenge/payments/route.ts",
    "src/app/api/admin/kids-challenge/payments/export/route.ts",
  ];

  it("every admin route checks the admin session first", () => {
    for (const route of adminRoutes) {
      const code = src(route);
      assert.match(code, /requireAdminFromToken\(access\)/, route);
    }
  });

  it("the sync action (a write) also requires CSRF", () => {
    const code = src("src/app/api/admin/kids-challenge/registrations/[id]/sync/route.ts");
    assert.ok(code.indexOf("validateCsrf(") < code.indexOf("syncRegistrationPayments("));
  });

  it("failure reports are fetched from Razorpay, never stored from the browser", () => {
    const code = src("src/app/api/kids-challenge/payments/failed/route.ts");
    assert.match(code, /getCurrentUser\(\)/);
    assert.match(code, /findOrderForUser\(orderId, user\.id\)/);
    assert.ok(code.indexOf("fetchRazorpayPayment(") < code.indexOf("recordPaymentFailed("));
  });

  it("ledger writes never downgrade a paid order and count each failed payment once", () => {
    const code = src("src/lib/kids-challenge/payment-ledger.ts");
    const succeeded = code.slice(code.indexOf("export async function recordPaymentSucceeded"));
    assert.match(succeeded, /\{ orderId, status: \{ \$ne: "paid" \} \}/);
    const failed = code.slice(code.indexOf("export async function recordPaymentFailed"));
    assert.match(failed, /failedPaymentIds: \{ \$ne: payment\.id \}/);
    assert.match(failed, /\$addToSet: \{ failedPaymentIds: payment\.id \}/);
    assert.match(src("src/models/KidsChallengePayment.ts"), /index\(\{ orderId: 1 \}, \{ unique: true \}\)/);
  });

  it("fees are stored only when Razorpay returns them, backfilled later, and never summed as zero when unknown", () => {
    const ledger = src("src/lib/kids-challenge/payment-ledger.ts");
    assert.match(ledger, /payment\.feePaise !== null \? \{ feePaise: payment\.feePaise \}/);
    assert.doesNotMatch(ledger, /feePaise: payment\.feePaise,/);
    assert.match(ledger, /paymentId: payment\.id, feePaise: null \}/);
    const service = src("src/lib/kids-challenge/admin-service.ts");
    assert.match(service, /\$isNumber: "\$feePaise"/);
    assert.doesNotMatch(service, /\$ifNull: \["\$feePaise", 0\]/);
    assert.match(service, /feesUnavailableCount/);
  });

  it("admin sync applies payments through the same markPaid checks", () => {
    const code = src("src/lib/kids-challenge/admin-service.ts");
    const sync = code.slice(code.indexOf("export async function syncRegistrationPayments"));
    assert.match(sync, /markPaid\(id, orderId, p\.id, p\)/);
  });
});
