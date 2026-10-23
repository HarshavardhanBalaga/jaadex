/** Session revocation helper (SERVER-ONLY). */
import "server-only";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminSessionModel } from "@/models/AdminSession";

export async function revokeFamily(familyId: string, reason: string): Promise<void> {
  try {
    await connectToDatabase();
  } catch {
    return;
  }
  await AdminSessionModel.updateOne(
    { familyId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokeReason: reason } },
  );
}

/** Revokes every session family of one admin (e.g. after a password reset). */
export async function revokeAllSessions(adminId: string, reason: string): Promise<void> {
  try {
    await connectToDatabase();
  } catch {
    return;
  }
  await AdminSessionModel.updateMany(
    { adminId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokeReason: reason } },
  );
}
