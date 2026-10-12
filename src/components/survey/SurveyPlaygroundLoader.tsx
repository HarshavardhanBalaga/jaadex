"use client";

import dynamic from "next/dynamic";

// Creator is browser-only and heavy: never SSR it, keep it out of the shared
// bundle. This wrapper must stay a Client Component (`ssr: false` is not
// allowed in Server Components).
export const SurveyPlaygroundClient = dynamic(
  () => import("@/components/survey/SurveyPlaygroundClient").then((m) => m.SurveyPlaygroundClient),
  {
    ssr: false,
    loading: () => <div className="rounded-2xl bg-[#eef3ff] p-6 text-royal">Loading form builder…</div>,
  },
);
