/** CSV export of the Kids Challenge payment history. Pure (no DB), so it is unit-tested directly. */
import { cell } from "../workshops/registration-csv.ts";

export const PAYMENTS_CSV_FILENAME = "kids-creative-challenge-payments.csv";

export type PaymentCsvRow = {
  createdAt: string;
  status: "created" | "paid" | "failed";
  amountPaise: number;
  currency: string;
  method: string | null;
  feePaise: number | null;
  taxPaise: number | null;
  orderId: string;
  paymentId: string | null;
  failedAttempts: number;
  errorDescription: string | null;
  confirmedBy: string | null;
  paidAt: string | null;
  studentName: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
};

const STATUS_LABEL = { created: "no payment recorded", paid: "paid", failed: "failed" } as const;

const HEADER = [
  "Started at (UTC)",
  "Status",
  "Amount (INR)",
  "Currency",
  "Method",
  "Razorpay fee incl. GST (INR)",
  "GST on fee (INR)",
  "Order ID",
  "Payment ID",
  "Failed attempts",
  "Last error",
  "Confirmed by",
  "Paid at (UTC)",
  "Student",
  "Parent",
  "Parent email",
  "Parent phone",
];

const rupees = (paise: number) => (paise / 100).toFixed(2);
/** Fees: Razorpay may not have reported them yet. Unknown is written out, never as 0.00. */
const fee = (paise: number | null, status: PaymentCsvRow["status"]) => (status !== "paid" ? "" : paise === null ? "not available yet" : rupees(paise));

/** BOM so Excel opens UTF-8 names correctly; CRLF line endings per RFC 4180. */
export function buildPaymentsCsv(rows: readonly PaymentCsvRow[]): string {
  const lines = rows.map((r) =>
    [
      r.createdAt,
      STATUS_LABEL[r.status],
      rupees(r.amountPaise),
      r.currency,
      r.method ?? "",
      fee(r.feePaise, r.status),
      fee(r.taxPaise, r.status),
      r.orderId,
      r.paymentId ?? "",
      String(r.failedAttempts),
      r.errorDescription ?? "",
      r.confirmedBy ?? "",
      r.paidAt ?? "",
      r.studentName,
      r.parentName,
      r.parentEmail,
      r.parentPhone,
    ]
      .map(cell)
      .join(","),
  );
  return `﻿${[HEADER.map(cell).join(","), ...lines].join("\r\n")}\r\n`;
}
