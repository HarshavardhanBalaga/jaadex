/**
 * Google sign-in for WEBSITE USERS (SERVER-ONLY). Google has already verified the
 * email (verifyGoogleIdToken requires email_verified), so:
 *  - unknown email  -> a new active account is created (no OTP step);
 *  - active account -> linked to this Google `sub` on first sign-in;
 *  - pending (never verified) password registration -> activated, and its
 *    stored password and open OTPs are discarded, so a pre-registration can't
 *    keep a password after the real owner proves the email;
 *  - disabled account -> refused.
 * A different Google account can never take over an already linked user.
 */
import "server-only";
import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { UserOtpModel } from "@/models/UserOtp";
import type { GoogleProfile } from "@/lib/oauth/google";
import { displayNameFromProfile } from "./google-profile";

export type UserGoogleOutcome = { outcome: "ok"; userId: Types.ObjectId } | { outcome: "invalid" };

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000;
}

export async function loginOrCreateUserWithGoogle(profile: GoogleProfile): Promise<UserGoogleOutcome> {
  await connectToDatabase();
  // One retry covers a concurrent first sign-in that wins the unique email/googleSub index.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await linkOrCreate(profile);
    } catch (err) {
      if (!isDuplicateKeyError(err) || attempt === 1) return { outcome: "invalid" };
    }
  }
  return { outcome: "invalid" };
}

async function linkOrCreate(profile: GoogleProfile): Promise<UserGoogleOutcome> {
  const user =
    (await UserModel.findOne({ googleSub: profile.sub })) ??
    (await UserModel.findOne({ email: profile.email }));

  if (!user) {
    const created = await UserModel.create({
      name: displayNameFromProfile(profile),
      email: profile.email,
      status: "active",
      emailVerifiedAt: new Date(),
      googleSub: profile.sub,
    });
    return { outcome: "ok", userId: created._id };
  }

  if (user.status === "disabled") return { outcome: "invalid" };
  if (user.googleSub && user.googleSub !== profile.sub) return { outcome: "invalid" };
  const now = new Date();

  if (user.status === "pending") {
    // Conditional on still pending, so a concurrent verify or sign-in can't double-activate.
    const activated = await UserModel.updateOne(
      { _id: user._id, status: "pending" },
      {
        $set: {
          name: displayNameFromProfile(profile),
          status: "active",
          googleSub: profile.sub,
          emailVerifiedAt: now,
        },
        $unset: { passwordHash: 1 },
      },
    );
    if (activated.modifiedCount !== 1) return { outcome: "invalid" };
    await UserOtpModel.updateMany({ userId: user._id, status: "active" }, { $set: { status: "expired" } });
    return { outcome: "ok", userId: user._id };
  }

  if (!user.googleSub) {
    // Conditional link so two concurrent first sign-ins can't race.
    const set: Record<string, unknown> = { googleSub: profile.sub };
    if (!user.emailVerifiedAt) set.emailVerifiedAt = now;
    const linked = await UserModel.updateOne({ _id: user._id, googleSub: null }, { $set: set });
    if (linked.modifiedCount !== 1) {
      const fresh = await UserModel.findById(user._id).select({ googleSub: 1 }).lean();
      if (fresh?.googleSub !== profile.sub) return { outcome: "invalid" };
    }
  }
  return { outcome: "ok", userId: user._id };
}
