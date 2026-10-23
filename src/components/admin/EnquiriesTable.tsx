import { formatDateTime } from "@/lib/format";

export interface EnquiryRow {
  name: string;
  email: string;
  organization: string;
  interest: string;
  message: string;
  status: string;
  createdAt: Date | string | null;
}

const COLUMNS = ["Status", "Name", "Email", "Organization", "Interest", "Message", "Received"];

/** Demo and contact requests, newest first. Rendered on the server. */
export function EnquiriesTable({ requests }: { requests: EnquiryRow[] }) {
  if (requests.length === 0) {
    return <p className="px-5 py-6 text-sm text-slate-500">No enquiries yet. Book-a-Demo and contact submissions will appear here.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <tr>
            {COLUMNS.map((column) => (
              <th key={column} className="px-5 py-3 font-semibold">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {requests.map((r, i) => (
            <tr key={`${i}-${r.email}`}>
              <td className="px-5 py-3 whitespace-nowrap">
                {r.status === "new" ? (
                  <span className="font-semibold text-blue-700">New</span>
                ) : (
                  <span className="text-slate-500">{r.status}</span>
                )}
              </td>
              <td className="px-5 py-3 break-all text-slate-900">{r.name}</td>
              <td className="px-5 py-3 break-all text-slate-600">{r.email}</td>
              <td className="px-5 py-3 break-all text-slate-600">{r.organization}</td>
              <td className="px-5 py-3 break-all text-slate-600">{r.interest}</td>
              <td className="max-w-[320px] px-5 py-3 break-words text-slate-600">{r.message}</td>
              <td className="px-5 py-3 whitespace-nowrap text-slate-500">{formatDateTime(r.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
