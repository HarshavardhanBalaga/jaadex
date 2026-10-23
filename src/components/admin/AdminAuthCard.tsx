import type { ReactNode } from "react";

/** Centered card shell for the public admin pages (login, register, password reset). */
export function AdminAuthCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <p className="text-center text-xs font-semibold tracking-widest text-blue-700 uppercase">JaaDeX Admin</p>
        <h1 className="mt-2 text-center text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-center text-sm text-slate-600">{description}</p>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">{children}</div>
      </div>
    </div>
  );
}
