/** CSV export of Kids Creative Challenge registrations. Pure (no DB), so it is unit-tested directly. */
import { cell } from "../workshops/registration-csv.ts";

export const KIDS_CHALLENGE_CSV_FILENAME = "kids-creative-challenge-registrations.csv";

export type KidsChallengeCsvRow = {
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  studentName: string;
  studentClass: number;
  studentAge: number;
  schoolName: string;
  city: string;
  state: string;
  paymentStatus: "pending" | "paid";
  createdAt: Date;
};

const HEADER = ["Parent name", "Parent email", "Parent phone", "Student name", "Class", "Age", "School", "City", "State", "Payment", "Registered at (UTC)"];

/** BOM so Excel opens UTF-8 names correctly; CRLF line endings per RFC 4180. */
export function buildKidsChallengeCsv(rows: readonly KidsChallengeCsvRow[]): string {
  const lines = rows.map((r) =>
    [
      r.parentName,
      r.parentEmail,
      r.parentPhone,
      r.studentName,
      String(r.studentClass),
      String(r.studentAge),
      r.schoolName,
      r.city,
      r.state,
      r.paymentStatus,
      r.createdAt.toISOString(),
    ]
      .map(cell)
      .join(","),
  );
  return `﻿${[HEADER.map(cell).join(","), ...lines].join("\r\n")}\r\n`;
}
