/** Kids Challenge admin views, in display order; the first is the default. Shared by the dashboard sidebar (server) and the section (client). */
export const KIDS_CHALLENGE_TABS = [
  { id: "registrations", label: "Registrations" },
  { id: "payments", label: "Payment history" },
  { id: "overview", label: "Analytics" },
] as const;
