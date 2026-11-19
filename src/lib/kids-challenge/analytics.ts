/** Pure analytics helpers for the Kids Challenge dashboard (no DB), unit-tested directly. All days are India time (UTC+05:30, no DST). */

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" of the India-time calendar day containing `date`. */
export function istDayKey(date: Date): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** UTC instant at which the India-time day containing `date` starts. */
export function istStartOfDay(date: Date): Date {
  const shifted = date.getTime() + IST_OFFSET_MS;
  return new Date(shifted - (shifted % DAY_MS) - IST_OFFSET_MS);
}

/** UTC instant for 00:00 India time on a "YYYY-MM-DD" day. */
export function istDayStart(key: string): Date {
  return new Date(`${key}T00:00:00+05:30`);
}

export type DailyPoint = { date: string; registrations: number; paid: number; revenuePaise: number };

/**
 * One point per India-time day for the last `days` days ending on `now`'s day (inclusive),
 * with zeros for days that had no activity, so the chart never skips a day.
 */
export function fillDailySeries(
  days: number,
  now: Date,
  registrations: { _id: string; count: number }[],
  payments: { _id: string; count: number; revenuePaise: number }[],
): DailyPoint[] {
  const regs = new Map(registrations.map((r) => [r._id, r.count]));
  const pays = new Map(payments.map((p) => [p._id, p]));
  const today = istStartOfDay(now).getTime();
  const out: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = istDayKey(new Date(today - i * DAY_MS + IST_OFFSET_MS / 2));
    const p = pays.get(key);
    out.push({ date: key, registrations: regs.get(key) ?? 0, paid: p?.count ?? 0, revenuePaise: p?.revenuePaise ?? 0 });
  }
  return out;
}

/** Share as a whole-number-ish percentage with one decimal; 0 when there is nothing to divide. */
export function percent(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

/** ₹ amount from paise, e.g. 990000 → "₹9,900". Paise shown only when present. */
export function formatInr(paise: number): string {
  const rupees = paise / 100;
  return rupees.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** Human label for a Razorpay payment method code. */
export function methodLabel(method: string | null): string {
  const labels: Record<string, string> = {
    upi: "UPI",
    card: "Card",
    netbanking: "Net banking",
    wallet: "Wallet",
    emi: "EMI",
    cardless_emi: "Cardless EMI",
    paylater: "Pay later",
    bank_transfer: "Bank transfer",
  };
  if (!method) return "Unknown";
  return labels[method] ?? method.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
