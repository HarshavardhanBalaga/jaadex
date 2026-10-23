import type { Metadata } from "next";
import { AdminAuthCard } from "@/components/admin/AdminAuthCard";
import { AdminRegisterForm } from "@/components/admin/AdminRegisterForm";

export const metadata: Metadata = { title: "Admin Registration", description: "First-time JaaDeX admin setup." };

export default function AdminRegisterPage() {
  return (
    <AdminAuthCard
      title="Create admin account"
      description="A verification code is sent to the administrator inbox. The account activates once the code is entered."
    >
      <AdminRegisterForm />
    </AdminAuthCard>
  );
}
