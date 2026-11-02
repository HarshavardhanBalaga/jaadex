/** Workshop display text shared by server + client. A blank date or location means "to be announced". */
function formatWorkshopDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** A workshop with no date yet counts as upcoming, and a dated one stays upcoming through its whole day. */
export function isWorkshopUpcoming(date: string | null): boolean {
  return date === null || new Date(date).getTime() + DAY_MS >= Date.now();
}

export function workshopWhenWhere(date: string | null, location: string): string {
  if (!date && !location) return "Date and location to be announced";
  const when = date ? formatWorkshopDate(date) : "Date to be announced";
  return `${when} · ${location || "Location to be announced"}`;
}
