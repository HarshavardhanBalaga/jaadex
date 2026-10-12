/**
 * Mongo-backed distributed rate limiter (SERVER-ONLY).
 * Atomic $inc upsert; works across Vercel instances.
 * In-memory fallback only via explicit injectable store (tests).
 */
import "server-only";
import { connectToDatabase } from "@/lib/mongodb";
import { RateLimitModel } from "@/models/RateLimit";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  await connectToDatabase();
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);
  const doc = await RateLimitModel.findOneAndUpdate(
    { _id: key, resetAt: { $gt: now } },
    { $inc: { count: 1 }, $setOnInsert: { resetAt } },
      { upsert: true, returnDocument: "after" },
  ).lean<{ count: number; resetAt: Date }>();
  // Upsert-miss race: key expired between match and update -> retry once with fresh window.
  const current = doc ??
    (await RateLimitModel.findOneAndUpdate(
      { _id: key },
      { $inc: { count: 1 }, $setOnInsert: { resetAt } },
    { upsert: true, returnDocument: "after" },
    ).lean<{ count: number; resetAt: Date }>());
  const count = current?.count ?? limit + 1;
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: current?.resetAt ?? resetAt,
  };
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
