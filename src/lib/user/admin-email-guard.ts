/**
 * Role boundary for website-user auth (SERVER-ONLY). Admin and superadmin
 * accounts live in the separate `admins` collection; the user-facing Google
 * link and password-setup flows must never act on an email that belongs to
 * one. Read-only: this never writes to `admins`.
 */
import "server-only";
import { AdminModel } from "@/models/Admin";

export async function isPrivilegedEmail(email: string): Promise<boolean> {
  return (await AdminModel.exists({ email: email.trim().toLowerCase() })) !== null;
}
