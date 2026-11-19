/** Admin list/analytics query schemas for the Kids Challenge dashboard (client + server). Query-string values arrive as strings. */
import { z } from "zod";
import { INDIAN_STATES, MAX_CLASS, MIN_CLASS } from "./registration-validation.ts";

export const ADMIN_PAGE_LIMITS = [10, 25, 50, 100] as const;
export const ANALYTICS_RANGES = [7, 30, 90] as const;

const page = z.coerce.number("Page must be a number.").int().min(1, "Page starts at 1.").default(1);
const limit = z.coerce
  .number("Limit must be a number.")
  .refine((n) => (ADMIN_PAGE_LIMITS as readonly number[]).includes(n), `Limit must be one of ${ADMIN_PAGE_LIMITS.join(", ")}.`)
  .default(25);
const q = z.string().trim().max(100, "Keep the search under 100 characters.").default("");
const order = z.enum(["asc", "desc"], "Order must be asc or desc.").default("desc");
/** YYYY-MM-DD, read as an India-time calendar day. */
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.")
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00+05:30`)), "Invalid date.")
  .optional();

export const adminRegistrationsQuerySchema = z
  .object({
    page,
    limit,
    q,
    payment: z.enum(["all", "paid", "pending"], "Unknown payment filter.").default("all"),
    studentClass: z.union([z.literal("all"), z.coerce.number().int().min(MIN_CLASS).max(MAX_CLASS)], "Unknown class.").default("all"),
    state: z.union([z.literal("all"), z.enum(INDIAN_STATES)], "Unknown state.").default("all"),
    sort: z.enum(["createdAt", "studentName", "paidAt"], "Unknown sort field.").default("createdAt"),
    order,
  })
  .strict();

export type AdminRegistrationsQuery = z.infer<typeof adminRegistrationsQuerySchema>;

export const adminPaymentsQuerySchema = z
  .object({
    page,
    limit,
    q,
    status: z.enum(["all", "paid", "failed", "created"], "Unknown status filter.").default("all"),
    method: z
      .string()
      .regex(/^(all|[a-z_]{1,32})$/, "Unknown payment method.")
      .default("all"),
    from: day,
    to: day,
    order,
  })
  .strict()
  .refine((v) => !v.from || !v.to || v.from <= v.to, { message: "The start date must be before the end date.", path: ["to"] });

export type AdminPaymentsQuery = z.infer<typeof adminPaymentsQuerySchema>;

export const adminAnalyticsQuerySchema = z
  .object({
    days: z.coerce
      .number("Range must be a number of days.")
      .refine((n) => (ANALYTICS_RANGES as readonly number[]).includes(n), `Range must be one of ${ANALYTICS_RANGES.join(", ")} days.`)
      .default(30),
  })
  .strict();

export type AdminAnalyticsQuery = z.infer<typeof adminAnalyticsQuerySchema>;
