/**
 * Kids Challenge admin reads (SERVER-ONLY): analytics, registrations, payment history, reconciliation.
 * Routes check the admin session and validate queries; everything here assumes an admin caller.
 * Revenue is counted from registrations (the source of truth for "paid"); fees and attempts from the ledger.
 */
import "server-only";
import { Types, type PipelineStage } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { escapeRegex } from "@/lib/workshops/registration-validation";
import { fetchOrderPayments, isRazorpayConfigured } from "@/lib/payments/razorpay";
import { markPaid, KIDS_CHALLENGE_FEE_PAISE } from "@/lib/kids-challenge/registration-service";
import { recordPaymentFailed, recordPaymentSucceeded } from "@/lib/kids-challenge/payment-ledger";
import { emailsForRegistration, type RegistrationMessage } from "@/lib/kids-challenge/email-service";
import { fillDailySeries, istDayStart, istStartOfDay, percent, type DailyPoint } from "@/lib/kids-challenge/analytics";
import type { AdminPaymentsQuery, AdminRegistrationsQuery } from "@/lib/kids-challenge/admin-validation";
import { MAX_CLASS, MIN_CLASS } from "@/lib/kids-challenge/registration-validation";
import { KidsChallengeRegistrationModel, type KidsConfirmationEmailStatus } from "@/models/KidsChallengeRegistration";
import { KidsChallengePaymentModel, type KidsChallengePaymentSource, type KidsChallengePaymentStatus } from "@/models/KidsChallengePayment";
import { KidsChallengeEmailModel } from "@/models/KidsChallengeEmail";

const DAY_MS = 24 * 60 * 60 * 1000;
const IST = "Asia/Kolkata";

function pagination(page: number, limit: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 };
}

/* ------------------------------------------------------------------ analytics */

export type KidsChallengeAnalytics = {
  generatedAt: string;
  rangeDays: number;
  totals: {
    registrations: number;
    paid: number;
    pending: number;
    conversionRate: number;
    grossRevenuePaise: number;
    /** Razorpay fees incl. GST, summed over paid orders whose fee Razorpay has reported. Unknown fees are NOT counted as zero. */
    feesPaise: number;
    /** Paid registrations whose Razorpay fee is not known yet (fee not returned, or paid before the ledger existed). */
    feesUnavailableCount: number;
    /** Gross revenue minus known fees; while feesUnavailableCount > 0 this is an upper bound. */
    netRevenuePaise: number;
    todayRevenuePaise: number;
    todayPaid: number;
    todayRegistrations: number;
    rangeRevenuePaise: number;
    rangePaid: number;
    rangeRegistrations: number;
  };
  payments: {
    orders: number;
    paidOrders: number;
    failedOrders: number;
    /** Orders created (checkout requested) with no payment attempt recorded: still open, closed without paying, or not yet reported. */
    abandonedOrders: number;
    failedAttempts: number;
    /** Paid orders ÷ orders with at least one attempt. */
    successRate: number;
  };
  daily: DailyPoint[];
  byClass: { studentClass: number; total: number; paid: number }[];
  byState: { state: string; total: number; paid: number }[];
  byMethod: { method: string | null; count: number; amountPaise: number }[];
  /** "Sent" = accepted by the mail server; bounces are not tracked with plain SMTP. */
  emails: KidsEmailStats;
};

export type KidsEmailStats = {
  /** Automatic payment confirmations, over paid registrations. */
  confirmation: { paid: number; sent: number; failed: number; notSent: number; sending: number; deliveryRate: number };
  /** Admin-written emails. */
  custom: { messages: number; messagesInRange: number; recipients: number; sent: number; failed: number; sending: number; deliveryRate: number; lastSentAt: string | null };
};

type Count = { _id: string; count: number };

/** Confirmation + custom email delivery totals for the Analytics tab. */
async function kidsEmailStats(rangeStart: Date): Promise<KidsEmailStats> {
  const is = (status: string) => ({ $cond: [{ $eq: ["$confirmationEmail.status", status] }, 1, 0] });
  const [confAgg, msgAgg, recAgg] = await Promise.all([
    KidsChallengeRegistrationModel.aggregate<{ paid: number; sent: number; failed: number; sending: number; skipped: number; missing: number }>([
      { $match: { paymentStatus: "paid" } },
      {
        $group: {
          _id: null,
          paid: { $sum: 1 },
          sent: { $sum: is("sent") },
          failed: { $sum: is("failed") },
          sending: { $sum: is("pending") },
          skipped: { $sum: is("skipped") },
          // Paid before confirmation emails existed, or never claimed.
          missing: { $sum: { $cond: [{ $eq: [{ $type: "$confirmationEmail.status" }, "missing"] }, 1, 0] } },
        },
      },
    ]),
    KidsChallengeEmailModel.aggregate<{ messages: number; inRange: number; last: Date | null }>([
      { $group: { _id: null, messages: { $sum: 1 }, inRange: { $sum: { $cond: [{ $gte: ["$createdAt", rangeStart] }, 1, 0] } }, last: { $max: "$createdAt" } } },
    ]),
    KidsChallengeEmailModel.aggregate<{ _id: string; count: number }>([{ $unwind: "$recipients" }, { $group: { _id: "$recipients.status", count: { $sum: 1 } } }]),
  ]);
  const c = confAgg[0] ?? { paid: 0, sent: 0, failed: 0, sending: 0, skipped: 0, missing: 0 };
  const m = msgAgg[0] ?? { messages: 0, inRange: 0, last: null };
  const rec = new Map(recAgg.map((r) => [r._id, r.count]));
  const n = (status: string) => rec.get(status) ?? 0;
  const customSent = n("sent");
  const customFailed = n("failed") + n("skipped");
  return {
    confirmation: {
      paid: c.paid,
      sent: c.sent,
      failed: c.failed,
      notSent: c.skipped + c.missing,
      sending: c.sending,
      deliveryRate: percent(c.sent, c.sent + c.failed + c.skipped),
    },
    custom: {
      messages: m.messages,
      messagesInRange: m.inRange,
      recipients: [...rec.values()].reduce((a, b) => a + b, 0),
      sent: customSent,
      failed: customFailed,
      sending: n("pending") + n("sending"),
      deliveryRate: percent(customSent, customSent + customFailed),
      lastSentAt: m.last ? new Date(m.last).toISOString() : null,
    },
  };
}

export async function getKidsChallengeAnalytics(rangeDays: number): Promise<KidsChallengeAnalytics> {
  await connectToDatabase();
  const now = new Date();
  const todayStart = istStartOfDay(now);
  const rangeStart = new Date(todayStart.getTime() - (rangeDays - 1) * DAY_MS);
  const paidAmount = { $ifNull: ["$amountPaise", KIDS_CHALLENGE_FEE_PAISE] };

  const [emails, [totalsAgg, regsDaily, paidDaily, classAgg, stateAgg, methodAgg, ledgerAgg]] = await Promise.all([kidsEmailStats(rangeStart), Promise.all([
    KidsChallengeRegistrationModel.aggregate<{
      registrations: number;
      paid: number;
      gross: number;
      todayRevenue: number;
      todayPaid: number;
      todayRegs: number;
      rangeRevenue: number;
      rangePaid: number;
      rangeRegs: number;
    }>([
      {
        $group: {
          _id: null,
          registrations: { $sum: 1 },
          paid: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] } },
          gross: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, paidAmount, 0] } },
          todayRevenue: { $sum: { $cond: [{ $and: [{ $eq: ["$paymentStatus", "paid"] }, { $gte: ["$paidAt", todayStart] }] }, paidAmount, 0] } },
          todayPaid: { $sum: { $cond: [{ $and: [{ $eq: ["$paymentStatus", "paid"] }, { $gte: ["$paidAt", todayStart] }] }, 1, 0] } },
          todayRegs: { $sum: { $cond: [{ $gte: ["$createdAt", todayStart] }, 1, 0] } },
          rangeRevenue: { $sum: { $cond: [{ $and: [{ $eq: ["$paymentStatus", "paid"] }, { $gte: ["$paidAt", rangeStart] }] }, paidAmount, 0] } },
          rangePaid: { $sum: { $cond: [{ $and: [{ $eq: ["$paymentStatus", "paid"] }, { $gte: ["$paidAt", rangeStart] }] }, 1, 0] } },
          rangeRegs: { $sum: { $cond: [{ $gte: ["$createdAt", rangeStart] }, 1, 0] } },
        },
      },
    ]),
    KidsChallengeRegistrationModel.aggregate<Count>([
      { $match: { createdAt: { $gte: rangeStart } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: IST } }, count: { $sum: 1 } } },
    ]),
    KidsChallengeRegistrationModel.aggregate<Count & { revenuePaise: number }>([
      { $match: { paymentStatus: "paid", paidAt: { $gte: rangeStart } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt", timezone: IST } },
          count: { $sum: 1 },
          revenuePaise: { $sum: paidAmount },
        },
      },
    ]),
    KidsChallengeRegistrationModel.aggregate<{ _id: number; total: number; paid: number }>([
      { $group: { _id: "$studentClass", total: { $sum: 1 }, paid: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] } } } },
    ]),
    KidsChallengeRegistrationModel.aggregate<{ _id: string; total: number; paid: number }>([
      { $group: { _id: "$state", total: { $sum: 1 }, paid: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] } } } },
      { $sort: { total: -1, _id: 1 } },
      { $limit: 10 },
    ]),
    KidsChallengePaymentModel.aggregate<{ _id: string | null; count: number; amountPaise: number }>([
      { $match: { status: "paid" } },
      { $group: { _id: "$method", count: { $sum: 1 }, amountPaise: { $sum: "$amountPaise" } } },
      { $sort: { count: -1 } },
    ]),
    KidsChallengePaymentModel.aggregate<{ orders: number; paidOrders: number; failedOrders: number; abandoned: number; failedAttempts: number; fees: number; feesKnown: number }>([
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          paidOrders: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
          failedOrders: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
          abandoned: { $sum: { $cond: [{ $eq: ["$status", "created"] }, 1, 0] } },
          failedAttempts: { $sum: { $ifNull: ["$failedAttempts", 0] } },
          // $sum skips null, so an unavailable fee adds nothing instead of pretending to be ₹0; feesKnown counts real values (incl. 0).
          fees: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "paid"] }, { $isNumber: "$feePaise" }] }, "$feePaise", 0] } },
          feesKnown: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "paid"] }, { $isNumber: "$feePaise" }] }, 1, 0] } },
        },
      },
    ]),
  ])]);

  const t = totalsAgg[0] ?? { registrations: 0, paid: 0, gross: 0, todayRevenue: 0, todayPaid: 0, todayRegs: 0, rangeRevenue: 0, rangePaid: 0, rangeRegs: 0 };
  const l = ledgerAgg[0] ?? { orders: 0, paidOrders: 0, failedOrders: 0, abandoned: 0, failedAttempts: 0, fees: 0, feesKnown: 0 };
  const classes = new Map(classAgg.map((c) => [c._id, c]));

  return {
    generatedAt: now.toISOString(),
    rangeDays,
    totals: {
      registrations: t.registrations,
      paid: t.paid,
      pending: t.registrations - t.paid,
      conversionRate: percent(t.paid, t.registrations),
      grossRevenuePaise: t.gross,
      feesPaise: l.fees,
      feesUnavailableCount: Math.max(0, t.paid - l.feesKnown),
      netRevenuePaise: t.gross - l.fees,
      todayRevenuePaise: t.todayRevenue,
      todayPaid: t.todayPaid,
      todayRegistrations: t.todayRegs,
      rangeRevenuePaise: t.rangeRevenue,
      rangePaid: t.rangePaid,
      rangeRegistrations: t.rangeRegs,
    },
    payments: {
      orders: l.orders,
      paidOrders: l.paidOrders,
      failedOrders: l.failedOrders,
      abandonedOrders: l.abandoned,
      failedAttempts: l.failedAttempts,
      successRate: percent(l.paidOrders, l.paidOrders + l.failedOrders),
    },
    daily: fillDailySeries(rangeDays, now, regsDaily, paidDaily),
    byClass: Array.from({ length: MAX_CLASS - MIN_CLASS + 1 }, (_, i) => {
      const c = classes.get(MIN_CLASS + i);
      return { studentClass: MIN_CLASS + i, total: c?.total ?? 0, paid: c?.paid ?? 0 };
    }),
    byState: stateAgg.map((s) => ({ state: s._id, total: s.total, paid: s.paid })),
    byMethod: methodAgg.map((m) => ({ method: m._id, count: m.count, amountPaise: m.amountPaise })),
    emails,
  };
}

/** Cheap counts for the dashboard overview card. */
export async function kidsChallengeCounts(): Promise<{ total: number; paid: number; revenuePaise: number }> {
  await connectToDatabase();
  const [r] = await KidsChallengeRegistrationModel.aggregate<{ total: number; paid: number; revenuePaise: number }>([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        paid: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] } },
        revenuePaise: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, { $ifNull: ["$amountPaise", KIDS_CHALLENGE_FEE_PAISE] }, 0] } },
      },
    },
  ]);
  return r ? { total: r.total, paid: r.paid, revenuePaise: r.revenuePaise } : { total: 0, paid: 0, revenuePaise: 0 };
}

/* ------------------------------------------------------------------ registrations */

export type AdminRegistrationRow = {
  id: string;
  studentName: string;
  studentClass: number;
  studentAge: number;
  schoolName: string;
  city: string;
  state: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  paymentStatus: "pending" | "paid";
  amountPaise: number;
  razorpayPaymentId: string | null;
  paidAt: string | null;
  createdAt: string;
  /** Payment confirmation email. null = never attempted (unpaid, or paid before email tracking). */
  emailStatus: KidsConfirmationEmailStatus | null;
  emailSentAt: string | null;
  emailError: string | null;
  emailAttempts: number;
};

type RegDoc = {
  _id: Types.ObjectId;
  studentName: string;
  studentClass: number;
  studentAge: number;
  schoolName: string;
  city: string;
  state: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  paymentStatus: "pending" | "paid";
  amountPaise?: number;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  paidAt?: Date | null;
  confirmationEmail?: { status?: KidsConfirmationEmailStatus; sentAt?: Date | null; lastError?: string | null; attempts?: number };
  consent?: boolean;
  createdAt: Date;
  updatedAt?: Date;
};

function toRegistrationRow(d: RegDoc): AdminRegistrationRow {
  return {
    id: String(d._id),
    studentName: d.studentName,
    studentClass: d.studentClass,
    studentAge: d.studentAge,
    schoolName: d.schoolName,
    city: d.city,
    state: d.state,
    parentName: d.parentName,
    parentEmail: d.parentEmail,
    parentPhone: d.parentPhone,
    paymentStatus: d.paymentStatus,
    amountPaise: d.amountPaise ?? KIDS_CHALLENGE_FEE_PAISE,
    razorpayPaymentId: d.razorpayPaymentId ?? null,
    paidAt: d.paidAt ? new Date(d.paidAt).toISOString() : null,
    createdAt: new Date(d.createdAt).toISOString(),
    emailStatus: d.confirmationEmail?.status ?? null,
    emailSentAt: d.confirmationEmail?.sentAt ? new Date(d.confirmationEmail.sentAt).toISOString() : null,
    emailError: d.confirmationEmail?.lastError ?? null,
    emailAttempts: d.confirmationEmail?.attempts ?? 0,
  };
}

/** Confirmation-email filter → Mongo condition. Emails only exist for paid registrations. */
const EMAIL_FILTERS: Record<Exclude<AdminRegistrationsQuery["email"], "all">, Record<string, unknown>> = {
  sent: { "confirmationEmail.status": "sent" },
  failed: { "confirmationEmail.status": "failed" },
  pending: { "confirmationEmail.status": "pending" },
  not_sent: { paymentStatus: "paid", $or: [{ "confirmationEmail.status": "skipped" }, { "confirmationEmail.status": { $exists: false } }] },
};

/** Admin list: search, filters, whitelisted sort and pagination, all in Mongo. _id breaks ties so pages never overlap. */
export async function queryAdminRegistrations(query: AdminRegistrationsQuery) {
  await connectToDatabase();
  const and: Record<string, unknown>[] = [];
  if (query.q) {
    const contains = new RegExp(escapeRegex(query.q), "i");
    and.push({
      $or: [
        { studentName: contains },
        { parentName: contains },
        { parentEmail: contains },
        { parentPhone: contains },
        { schoolName: contains },
        { city: contains },
        { razorpayPaymentId: contains },
      ],
    });
  }
  if (query.payment !== "all") and.push({ paymentStatus: query.payment });
  if (query.studentClass !== "all") and.push({ studentClass: query.studentClass });
  if (query.state !== "all") and.push({ state: query.state });
  if (query.email !== "all") and.push(EMAIL_FILTERS[query.email]);
  const filter = and.length ? { $and: and } : {};
  const dir = query.order === "asc" ? 1 : -1;
  const find = KidsChallengeRegistrationModel.find(filter)
    .select({ userId: 0, consent: 0, __v: 0 })
    .sort({ [query.sort]: dir, _id: dir })
    .skip((query.page - 1) * query.limit)
    .limit(query.limit);
  if (query.sort === "studentName") find.collation({ locale: "en", strength: 2 });
  const [docs, total] = await Promise.all([find.lean<RegDoc[]>(), KidsChallengeRegistrationModel.countDocuments(filter)]);
  return { registrations: docs.map(toRegistrationRow), pagination: pagination(query.page, query.limit, total) };
}

/* ------------------------------------------------------------------ payments */

export type AdminPaymentRow = {
  id: string;
  registrationId: string;
  orderId: string;
  paymentId: string | null;
  status: KidsChallengePaymentStatus;
  amountPaise: number;
  currency: string;
  method: string | null;
  feePaise: number | null;
  taxPaise: number | null;
  failedAttempts: number;
  errorCode: string | null;
  errorDescription: string | null;
  confirmedBy: KidsChallengePaymentSource | null;
  studentName: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  paidAt: string | null;
  lastFailedAt: string | null;
  createdAt: string;
};

type PaymentDoc = Omit<AdminPaymentRow, "id" | "registrationId" | "paidAt" | "lastFailedAt" | "createdAt"> & {
  _id: Types.ObjectId;
  registrationId: Types.ObjectId;
  paidAt?: Date | null;
  lastFailedAt?: Date | null;
  createdAt: Date;
};

function toPaymentRow(d: PaymentDoc): AdminPaymentRow {
  return {
    id: String(d._id),
    registrationId: String(d.registrationId),
    orderId: d.orderId,
    paymentId: d.paymentId ?? null,
    status: d.status,
    amountPaise: d.amountPaise,
    currency: d.currency,
    method: d.method ?? null,
    feePaise: d.feePaise ?? null,
    taxPaise: d.taxPaise ?? null,
    failedAttempts: d.failedAttempts ?? 0,
    errorCode: d.errorCode ?? null,
    errorDescription: d.errorDescription ?? null,
    confirmedBy: d.confirmedBy ?? null,
    studentName: d.studentName,
    parentName: d.parentName,
    parentEmail: d.parentEmail,
    parentPhone: d.parentPhone,
    paidAt: d.paidAt ? new Date(d.paidAt).toISOString() : null,
    lastFailedAt: d.lastFailedAt ? new Date(d.lastFailedAt).toISOString() : null,
    createdAt: new Date(d.createdAt).toISOString(),
  };
}

const PAYMENT_FIELDS = { failedPaymentIds: 0, userId: 0, __v: 0, updatedAt: 0 } as const;

function paymentsFilter(query: Omit<AdminPaymentsQuery, "page" | "limit" | "order">) {
  const and: Record<string, unknown>[] = [];
  if (query.q) {
    const contains = new RegExp(escapeRegex(query.q), "i");
    and.push({
      $or: [{ studentName: contains }, { parentName: contains }, { parentEmail: contains }, { parentPhone: contains }, { orderId: contains }, { paymentId: contains }],
    });
  }
  if (query.status !== "all") and.push({ status: query.status });
  if (query.method !== "all") and.push({ method: query.method });
  // Date range = when the checkout (order) was started, as India-time calendar days, inclusive.
  const created: Record<string, Date> = {};
  if (query.from) created.$gte = istDayStart(query.from);
  if (query.to) created.$lt = new Date(istDayStart(query.to).getTime() + DAY_MS);
  if (Object.keys(created).length) and.push({ createdAt: created });
  return and.length ? { $and: and } : {};
}

/** Payment history: every order and its outcome, newest first by default. */
export async function queryAdminPayments(query: AdminPaymentsQuery) {
  await connectToDatabase();
  const filter = paymentsFilter(query);
  const dir = query.order === "asc" ? 1 : -1;
  const [docs, total, summary] = await Promise.all([
    KidsChallengePaymentModel.find(filter)
      .select(PAYMENT_FIELDS)
      .sort({ createdAt: dir, _id: dir })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean<PaymentDoc[]>(),
    KidsChallengePaymentModel.countDocuments(filter),
    KidsChallengePaymentModel.aggregate<{ paid: number; failed: number; created: number; amountPaise: number }>([
      { $match: filter } as PipelineStage.Match,
      {
        $group: {
          _id: null,
          paid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
          created: { $sum: { $cond: [{ $eq: ["$status", "created"] }, 1, 0] } },
          amountPaise: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$amountPaise", 0] } },
        },
      },
    ]),
  ]);
  return {
    payments: docs.map(toPaymentRow),
    summary: summary[0] ? { paid: summary[0].paid, failed: summary[0].failed, created: summary[0].created, amountPaise: summary[0].amountPaise } : { paid: 0, failed: 0, created: 0, amountPaise: 0 },
    pagination: pagination(query.page, query.limit, total),
  };
}

/** Distinct payment methods seen, for the history filter. */
export async function paymentMethods(): Promise<string[]> {
  await connectToDatabase();
  const methods = (await KidsChallengePaymentModel.distinct("method", { method: { $ne: null } })) as string[];
  return methods.sort();
}

/** Every ledger row matching the filters, newest first (CSV export). */
export async function listAdminPayments(query: Omit<AdminPaymentsQuery, "page" | "limit" | "order">): Promise<AdminPaymentRow[]> {
  await connectToDatabase();
  const docs = await KidsChallengePaymentModel.find(paymentsFilter(query)).select(PAYMENT_FIELDS).sort({ createdAt: -1, _id: -1 }).lean<PaymentDoc[]>();
  return docs.map(toPaymentRow);
}

/* ------------------------------------------------------------------ one registration */

export type AdminRegistrationDetail = AdminRegistrationRow & {
  razorpayOrderId: string | null;
  consent: boolean;
  updatedAt: string | null;
  payments: AdminPaymentRow[];
  /** Admin-written emails this parent was sent, newest first. */
  customEmails: RegistrationMessage[];
};

export async function getAdminRegistrationDetail(id: string): Promise<AdminRegistrationDetail | null> {
  await connectToDatabase();
  const [d, payments, customEmails] = await Promise.all([
    KidsChallengeRegistrationModel.findById(id).select({ userId: 0, __v: 0 }).lean<RegDoc>(),
    KidsChallengePaymentModel.find({ registrationId: new Types.ObjectId(id) }).select(PAYMENT_FIELDS).sort({ createdAt: -1 }).lean<PaymentDoc[]>(),
    emailsForRegistration(id),
  ]);
  if (!d) return null;
  return {
    ...toRegistrationRow(d),
    razorpayOrderId: d.razorpayOrderId ?? null,
    consent: Boolean(d.consent),
    updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : null,
    payments: payments.map(toPaymentRow),
    customEmails,
  };
}

export type SyncResult =
  | { ok: true; status: "paid" | "already_paid" | "still_pending"; checkedOrders: number; failedAttemptsFound: number }
  | { ok: false; reason: "not_found" | "not_configured" | "no_orders" };

/**
 * Reconcile one registration with Razorpay: look at every payment on every order we created for it.
 * A captured payment for the exact fee marks it paid (same checks as checkout/webhook); failures fill the history.
 * For stuck registrations, e.g. a parent paid but neither the checkout callback nor the webhook reached us.
 */
export async function syncRegistrationPayments(id: string): Promise<SyncResult> {
  if (!isRazorpayConfigured()) return { ok: false, reason: "not_configured" };
  await connectToDatabase();
  const reg = await KidsChallengeRegistrationModel.findById(id).select({ paymentStatus: 1, razorpayOrderId: 1 }).lean();
  if (!reg) return { ok: false, reason: "not_found" };
  const ledgerOrders = await KidsChallengePaymentModel.find({ registrationId: reg._id }).select({ orderId: 1 }).lean();
  const orderIds = [...new Set([...ledgerOrders.map((o) => o.orderId), ...(reg.razorpayOrderId ? [reg.razorpayOrderId] : [])])];
  if (orderIds.length === 0) return { ok: false, reason: "no_orders" };

  let failedAttemptsFound = 0;
  let status: "paid" | "already_paid" | "still_pending" = reg.paymentStatus === "paid" ? "already_paid" : "still_pending";
  for (const orderId of orderIds) {
    const payments = await fetchOrderPayments(orderId);
    for (const p of payments) {
      if (p.status === "failed") {
        await recordPaymentFailed(orderId, p);
        failedAttemptsFound++;
      } else if (p.status === "captured") {
        const result = await markPaid(id, orderId, p.id, p);
        if (result.status === "paid" || result.status === "already_paid") {
          await recordPaymentSucceeded(orderId, p, "admin_sync");
          if (status !== "already_paid") status = result.status;
        }
      }
    }
  }
  return { ok: true, status, checkedOrders: orderIds.length, failedAttemptsFound };
}
