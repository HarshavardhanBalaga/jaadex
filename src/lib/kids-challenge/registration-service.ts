/** Kids Creative Challenge registration rules (SERVER-ONLY). Routes handle auth, rate limits and validation, then call in here. */
import "server-only";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { isDuplicateKeyError } from "@/lib/workshops/queries";
import type { KidsChallengeRegistrationInput } from "@/lib/kids-challenge/registration-validation";
import type { CurrentUser } from "@/lib/user/session";
import { KidsChallengeRegistrationModel, STUDENT_NAME_COLLATION, type KidsChallengePaymentStatus } from "@/models/KidsChallengeRegistration";

export type KidsChallengeRegisterResult = { ok: true; registrationId: string } | { ok: false; reason: "already_registered" };

/** Save one student's registration. The unique index refuses the same student twice from one account, even on a racing double submit. */
export async function registerForKidsChallenge(user: CurrentUser, input: KidsChallengeRegistrationInput): Promise<KidsChallengeRegisterResult> {
  await connectToDatabase();
  const userId = new Types.ObjectId(user.id);
  const existing = await KidsChallengeRegistrationModel.exists({ userId, studentName: input.studentName }).collation(STUDENT_NAME_COLLATION);
  if (existing) return { ok: false, reason: "already_registered" };
  try {
    const created = await KidsChallengeRegistrationModel.create({
      userId,
      parentName: input.parentName,
      parentEmail: input.parentEmail,
      parentPhone: input.parentPhone,
      studentName: input.studentName,
      studentClass: input.studentClass,
      studentAge: input.studentAge,
      schoolName: input.schoolName,
      city: input.city,
      state: input.state,
      consent: input.consent,
      paymentStatus: "pending",
    });
    return { ok: true, registrationId: String(created._id) };
  } catch (err) {
    if (isDuplicateKeyError(err)) return { ok: false, reason: "already_registered" };
    throw err;
  }
}

export type KidsChallengeRegistrationRow = {
  id: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  studentName: string;
  studentClass: number;
  studentAge: number;
  schoolName: string;
  city: string;
  state: string;
  paymentStatus: KidsChallengePaymentStatus;
  createdAt: Date;
};

/** All registrations, newest first. Used by the admin dashboard and the CSV export. */
export async function listKidsChallengeRegistrations(): Promise<KidsChallengeRegistrationRow[]> {
  await connectToDatabase();
  const docs = await KidsChallengeRegistrationModel.find({})
    .select({ userId: 0, consent: 0, updatedAt: 0, __v: 0 })
    .sort({ createdAt: -1 })
    .lean();
  return docs.map((d) => ({
    id: String(d._id),
    parentName: d.parentName,
    parentEmail: d.parentEmail,
    parentPhone: d.parentPhone,
    studentName: d.studentName,
    studentClass: d.studentClass,
    studentAge: d.studentAge,
    schoolName: d.schoolName,
    city: d.city,
    state: d.state,
    paymentStatus: d.paymentStatus,
    createdAt: new Date(d.createdAt),
  }));
}

/** Names of the students this account has already registered, oldest first. */
export async function registeredStudentNames(user: CurrentUser): Promise<string[]> {
  await connectToDatabase();
  const docs = await KidsChallengeRegistrationModel.find({ userId: new Types.ObjectId(user.id) })
    .select({ studentName: 1 })
    .sort({ createdAt: 1 })
    .lean();
  return docs.map((d) => d.studentName);
}
