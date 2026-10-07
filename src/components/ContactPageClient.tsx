"use client";

import { Suspense } from "react";
import { ContactPageContent } from "./ContactPageContent";

export function ContactPageClient() {
  return (
    <Suspense fallback={<div className="rounded-2xl bg-[#eef3ff] p-6 text-royal">Loading enquiry form…</div>}>
      <ContactPageContent />
    </Suspense>
  );
}
