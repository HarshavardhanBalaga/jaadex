import { NextResponse } from "next/server";
import { checkMongoHealth } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = await checkMongoHealth();
    return NextResponse.json({ status: "ok", ...health });
  } catch (error) {
    // Log only the error name server-side; never echo driver error text or
    // connection details to the client (may contain host/credential fragments).
    console.error(
      "[mongodb] Health check failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      {
        status: "error",
        env: process.env.NODE_ENV ?? "development",
        message: "Database unavailable",
      },
      { status: 503 },
    );
  }
}
