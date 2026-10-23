import Link from "next/link";

interface AdminStatCardProps {
  label: string;
  value: string;
  hint: string;
  href?: string;
  highlight?: boolean;
}

export function AdminStatCard({ label, value, hint, href, highlight = false }: AdminStatCardProps) {
  const className = `block rounded-xl border p-5 ${highlight ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"} ${
    href ? "transition-colors hover:border-blue-400" : ""
  }`;
  const body = (
    <>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </>
  );
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
