"use client";

import { useEffect, useState } from "react";
import { Toast } from "@/components/admin/Toast";
import { KidsChallengeOverview } from "./KidsChallengeOverview";
import { KidsChallengePayments } from "./KidsChallengePayments";
import { KidsChallengeRegistrations } from "./KidsChallengeRegistrations";
import { KidsChallengeEmails } from "./KidsChallengeEmails";
import { KIDS_CHALLENGE_TABS } from "@/lib/kids-challenge/admin-tabs";

type TabId = (typeof KIDS_CHALLENGE_TABS)[number]["id"];
const PREFIX = "kids-challenge/";

/**
 * Kids Creative Challenge admin: analytics, registrations and payment history.
 * The tab lives in the URL hash (#kids-challenge/payments …), matching the sidebar sub-items,
 * so links, refresh and the back button all work.
 */
export function KidsChallengeAdmin() {
  const [hash, setHash] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    function syncFromHash() {
      setHash(window.location.hash.slice(1));
    }
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const requested = hash.startsWith(PREFIX) ? hash.slice(PREFIX.length) : "";
  const tab: TabId = KIDS_CHALLENGE_TABS.find((t) => t.id === requested)?.id ?? KIDS_CHALLENGE_TABS[0].id;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-bold tracking-[1.2px] text-[#4a5a85] uppercase">Kids Creative Challenge</p>
          <h2 className="mt-1 font-display text-[20px] font-bold text-navy">Registrations &amp; payments</h2>
        </div>
        <nav aria-label="Kids Challenge views" className="inline-flex overflow-hidden rounded-lg border border-[#8d9bc4] bg-white">
          {KIDS_CHALLENGE_TABS.map((t) => (
            <a
              key={t.id}
              href={`#${PREFIX}${t.id}`}
              aria-current={tab === t.id ? "page" : undefined}
              className={`inline-flex h-10 items-center px-4 text-[14px] font-semibold transition-colors ${tab === t.id ? "bg-royal text-white" : "text-[#2b3a63] hover:bg-[#f5f8ff]"}`}
            >
              {t.label}
            </a>
          ))}
        </nav>
      </div>

      {tab === "overview" && <KidsChallengeOverview />}
      {tab === "registrations" && <KidsChallengeRegistrations onChanged={setToast} />}
      {tab === "payments" && <KidsChallengePayments onChanged={setToast} />}
      {tab === "emails" && <KidsChallengeEmails onChanged={setToast} />}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
