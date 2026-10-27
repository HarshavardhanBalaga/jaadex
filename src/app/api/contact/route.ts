import { NextResponse, after } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { DemoRequestModel } from "@/models/DemoRequest";
import { contactSchema } from "@/lib/contact/validation";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { sendEnquiryNotification } from "@/lib/admin/mailer";
import { getCurrentUser } from "@/lib/user/session";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" } as const;

function ok(data: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json({ success: true, ...data }, { status, headers: NO_STORE });
}

function fail(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status, headers: NO_STORE });
}

/**
 * Enquiry submission (Book a Demo / Contact us). Requires a logged-in
 * website user. Abuse is also handled with validation + rate limiting +
 * a honeypot field; SameSite=Lax on the session cookie blocks cross-site POSTs.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return fail("unauthenticated", "Please log in to send an enquiry.", 401);
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
    const doc = await DemoRequestModel.create({
      name: parsed.data.name,
      email: parsed.data.email,
      organization: parsed.data.organization || "",
      interest: parsed.data.interest,
      message: parsed.data.message,
      status: "new",
    });
    // Notify the team after the response is sent: SMTP latency never slows the
    // submitter, and a mail failure never fails an enquiry that is already saved.
    after(() =>
      sendEnquiryNotification({
        name: doc.name,
        email: doc.email,
        organization: doc.organization,
        interest: doc.interest,
        message: doc.message,
        createdAt: doc.createdAt,
      }).catch(() => console.error("[contact] notify email failed")),
    );
    return ok({ message: "Thanks — we'll be in touch shortly." }, 201);
  } catch (err) {
    console.error("[contact] unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}
