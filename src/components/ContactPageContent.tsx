"use client";

import { useSearchParams } from "next/navigation";
import { ContactForm } from "./ContactForm";

export function ContactPageContent() {
  const params = useSearchParams();
  return <ContactForm initialInterest={params.get("interest") ?? ""} />;
}
