import type { Metadata } from "next";
import { AdminAuthCard } from "@/components/admin/AdminAuthCard";
import { AdminPasswordResetForm } from "@/components/admin/AdminPasswordResetForm";

export const metadata: Metadata = { title: "Reset Admin Password", description: "Reset a JaaDeX admin password." };

export default function AdminForgotPasswordPage() {
  return (
    <AdminAuthCard title="Reset password" description="We send a one-time code to the administrator inbox.">
      <AdminPasswordResetForm />
    </AdminAuthCard>
  );
}
