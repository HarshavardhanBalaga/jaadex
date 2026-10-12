import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { getAdminAuthConfig } from "@/lib/admin/auth-config";
import { Container } from "@/components/Container";
import { Section } from "@/components/Section";
import { SectionHeading } from "@/components/SectionHeading";
import { SurveyPlaygroundClient } from "@/components/survey/SurveyPlaygroundLoader";

export const metadata: Metadata = { title: "SurveyJS Playground", description: "Evaluate customizable SurveyJS forms inside JaaDeX." };
export const dynamic = "force-dynamic";

/** Admin-only evaluation page: same server guard as the dashboard. */
export default async function SurveyPlaygroundPage() {
  try {
    const c = getAdminAuthConfig();
    const store = await cookies();
    const checked = await requireAdminFromToken(store.get(c.accessCookieName)?.value ?? null);
    if (!checked.ok) redirect("/admin/login");
  } catch {
    redirect("/admin/login");
  }
  return (
    <Section>
      <Container className="max-w-[1020px]">
        <SectionHeading
          eyebrow="Evaluation"
          title="SurveyJS Playground"
          description="Build a form visually, preview exactly what visitors would see, and test a submission — all inside JaaDeX styling."
          align="left"
        />
        <SurveyPlaygroundClient />
      </Container>
    </Section>
  );
}
