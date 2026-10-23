import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { WorkshopModel } from "@/models/Workshop";
import { workshopSchema } from "@/lib/workshops/validation";
import { validateCsrf } from "@/lib/admin/csrf";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { readAuthCookies } from "@/lib/admin/cookies";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" } as const;

function fail(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status, headers: NO_STORE });
}

/** Public workshop list — newest date first. Drives the "Currently on the calendar" section. */
export async function GET() {
  try {
    await connectToDatabase();
    const docs = await WorkshopModel.find({})
      .select({ title: 1, description: 1, date: 1, location: 1, image: 1 })
      .sort({ date: -1 })
      .lean();
    return NextResponse.json(
      {
        success: true,
        workshops: docs.map((d) => ({
          id: String(d._id),
          title: d.title,
          description: d.description,
          date: d.date instanceof Date ? d.date.toISOString() : String(d.date),
          location: d.location,
          image: d.image,
        })),
      },
      { headers: NO_STORE },
    );
  } catch (err) {
    console.error("[workshops] unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable.", 503);
  }
}

/** Admin-only create: session token + CSRF double-submit. Image stored as data URL. */
export async function POST(request: Request) {
  const csrfError = await validateCsrf(request);
  if (csrfError) return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  const limited = await checkRateLimit(`workshop-create:${clientIp(request)}`, 10, 60).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_request", "Invalid request body.", 400);
  }
  const parsed = workshopSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "validation_error", message: "Check the highlighted fields.", fields: parsed.error.flatten().fieldErrors },
      },
      { status: 400, headers: NO_STORE },
    );
  }
  try {
    await connectToDatabase();
    const created = await WorkshopModel.create({
      title: parsed.data.title,
      description: parsed.data.description,
      date: parsed.data.date,
      location: parsed.data.location,
      image: parsed.data.image,
    });
    return NextResponse.json(
      { success: true, message: "Workshop published.", id: String(created._id) },
      { status: 201, headers: NO_STORE },
    );
  } catch (err) {
    console.error("[workshops] create unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}