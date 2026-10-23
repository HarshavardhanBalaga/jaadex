import { formatDateTime } from "@/lib/format";

export interface AdministratorRow {
  name: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt: Date | string | null;
  createdAt: Date | string | null;
}

const COLUMNS = ["Name", "Email", "Role", "Status", "Last login", "Registered"];

/** Admin accounts with their most recent login. Rendered on the server. */
export function AdministratorsTable({ admins }: { admins: AdministratorRow[] }) {
  if (admins.length === 0) {
    return <p className="px-5 py-6 text-sm text-slate-500">No administrator accounts yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <tr>
            {COLUMNS.map((column) => (
              <th key={column} className="px-5 py-3 font-semibold">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {admins.map((a) => (
            <tr key={a.email}>
              <td className="px-5 py-3 break-all text-slate-900">{a.name}</td>
              <td className="px-5 py-3 break-all text-slate-900">{a.email}</td>
              <td className="px-5 py-3 text-slate-600">{a.role}</td>
              <td className="px-5 py-3 text-slate-600">{a.status}</td>
              <td className="px-5 py-3 whitespace-nowrap text-slate-600">{formatDateTime(a.lastLoginAt)}</td>
              <td className="px-5 py-3 whitespace-nowrap text-slate-600">{formatDateTime(a.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
