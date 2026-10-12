"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Navbar integration: shows Dashboard when an admin session exists,
 * otherwise Login/Register per bootstrap status. Display only — every
 * protected route re-verifies on the server.
 */
export function AdminNavLink({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [state, setState] = useState<"loading" | "admin" | "open" | "closed">("loading");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Session check only on admin routes: on public pages the visitor is
      // almost always logged out, and an expected 401 from /me would just
      // add console noise + a wasted round-trip on every navigation.
      if (pathname.startsWith("/admin")) {
        try {
          const me = await fetch("/api/admin/auth/me", { credentials: "include" });
          if (!cancelled && me.ok) {
            const d = (await me.json().catch(() => null)) as { authenticated?: boolean } | null;
            if (d && d.authenticated === true) {
              setState("admin");
              return;
            }
            // 200 + authenticated:false (or unreadable body) simply means logged out.
          }
          // fall through to status check
        } catch {
          // Network failure: fall through to status check.
        }
      }
      try {
        const s = await fetch("/api/admin/auth/register/status", { credentials: "include" });
        const d = (await s.json()) as { registrationOpen?: boolean };
        if (!cancelled) setState(d.registrationOpen ? "open" : "closed");
      } catch {
        if (!cancelled) setState("closed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);
  if (state === "loading") return null;
  if (state === "admin") {
    const active = pathname.startsWith("/admin");
    return (
      <Link href="/admin/dashboard" onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`hover:text-orange ${active ? "text-orange" : ""}`}>
        Dashboard
      </Link>
    );
  }
  const href = state === "open" ? "/admin/register" : "/admin/login";
  const label = state === "open" ? "Admin Setup" : "Admin Login";
  return (
    <Link href={href} onClick={onNavigate} className="hover:text-orange">
      {label}
    </Link>
  );
}
