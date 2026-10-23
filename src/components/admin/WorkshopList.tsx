import { formatDateTime } from "@/lib/format";
import { WorkshopDeleteButton } from "./WorkshopDeleteButton";

export interface WorkshopListItem {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  image: string;
}

/** Published workshops with delete. Rendered on the server so dates are formatted once. */
export function WorkshopList({ workshops }: { workshops: WorkshopListItem[] }) {
  if (workshops.length === 0) {
    return <p className="px-5 py-6 text-sm text-slate-500">No workshops published yet.</p>;
  }
  return (
    <ul className="divide-y divide-slate-200">
      {workshops.map((w) => (
        <li key={w.id} className="flex flex-wrap items-start gap-4 px-5 py-4">
          {/* Data URLs cannot go through next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={w.image} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold break-words text-slate-900">{w.title}</p>
            <p className="text-xs text-slate-500">
              {formatDateTime(w.date)} · {w.location}
            </p>
            <p className="mt-1 line-clamp-2 text-sm text-slate-600">{w.description}</p>
          </div>
          <WorkshopDeleteButton id={w.id} title={w.title} />
        </li>
      ))}
    </ul>
  );
}
