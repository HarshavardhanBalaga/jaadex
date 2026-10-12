import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { DemoRequestModel } from "@/models/DemoRequest";
import { contactSchema } from "@/lib/contact/validation";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" } as const;

function ok(data: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json({ success: true, ...data }, { status, headers: NO_STORE });
}

function fail(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status, headers: NO_STORE });
}

/**
 * Public enquiry submission (Book a Demo / Contact us).
 * No login, no CSRF cookie: there is no authenticated session to forge, so
 * abuse is handled with validation + rate limiting + a honeypot field.
 */
export async function POST(request: Request) {
  const limited = await checkRateLimit(`contact:${clientIp(request)}`, 5, 60).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_request", "Invalid request body.", 400);
  }
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "validation_error", message: "Check the highlighted fields.", fields: parsed.error.flatten().fieldErrors },
      },
      { status: 400, headers: NO_STORE },
    );
  }
  // Honeypot filled → pretend success, store nothing (spam stays out silently).
  if (parsed.data.website) {
    return ok({ message: "Thanks — we'll be in touch shortly." });
  }
  try {
    await connectToDatabase();
    await DemoRequestModel.create({
      name: parsed.data.name,
      email: parsed.data.email,
      organization: parsed.data.organization || "",
      interest: parsed.data.interest,
      message: parsed.data.message,
      status: "new",
    });
    return ok({ message: "Thanks — we'll be in touch shortly." }, 201);
  } catch (err) {
    console.error("[contact] unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}
