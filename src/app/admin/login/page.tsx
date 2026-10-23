import type { Metadata } from "next";
import { AdminAuthCard } from "@/components/admin/AdminAuthCard";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = { title: "Admin Login", description: "JaaDeX admin sign in." };

export default function AdminLoginPage() {
  return (
    <AdminAuthCard title="Admin login" description="Sign in with your administrator email and password.">
      <AdminLoginForm />
    </AdminAuthCard>
  );
}
