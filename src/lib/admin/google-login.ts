/**
 * Google sign-in for EXISTING admins (SERVER-ONLY). Google only proves
 * identity; it never creates or activates an admin. The admin must already
 * be active + email-verified, and the Google email must be Google-verified
 * (enforced in verifyGoogleIdToken). First successful sign-in links the
 * Google `sub`; afterwards a different Google account is refused even if it
 * reports the same email.
 */
import "server-only";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminModel } from "@/models/Admin";
import type { GoogleProfile } from "@/lib/oauth/google";
import { issueAdminSession, type LoginOutcome } from "./session-auth";

export async function loginAdminWithGoogle(
  profile: GoogleProfile,
  meta: { ipHash: string | null; uaHash: string | null },
): Promise<LoginOutcome> {
  await connectToDatabase();
  const admin =
    (await AdminModel.findOne({ googleSub: profile.sub })) ??
    (await AdminModel.findOne({ email: profile.email }));
  if (!admin || admin.status !== "active" || !admin.emailVerifiedAt) return { outcome: "invalid" };
  if (admin.googleSub && admin.googleSub !== profile.sub) return { outcome: "invalid" };
  if (!admin.googleSub) {
    // Conditional link so two concurrent first sign-ins can't race.
    try {
      const linked = await AdminModel.updateOne(
        { _id: admin._id, googleSub: null },
        { $set: { googleSub: profile.sub } },
      );
      if (linked.modifiedCount !== 1) {
        const fresh = await AdminModel.findById(admin._id).select("googleSub").lean();
        if (fresh?.googleSub !== profile.sub) return { outcome: "invalid" };
      }
    } catch {
      // Unique-index violation: this Google account is linked to another admin.
      return { outcome: "invalid" };
    }
  }
  return issueAdminSession({ _id: admin._id, role: admin.role }, meta, "google");
}
