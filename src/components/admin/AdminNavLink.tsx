"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Navbar integration: logged-out visitors see only the Admin Login link
 * (registration stays available at /admin/register by direct URL),
 * logged-in admins see only Dashboard. Display only — every protected
 * route re-verifies on the server.
 *
 * First paint is instant: a display-only hint (boolean, no tokens) from the
 * last verified check renders immediately, then the live /me check below
 * revalidates and corrects it if the session changed.
 */
const HINT_KEY = "jaadex.nav.admin";

function readHint(): boolean | null {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    const v = window.sessionStorage.getItem(HINT_KEY);
    if (v === "1") return true;
    if (v === "0") return false;
    return null;
  } catch {
    return null;
  }
}

function writeHint(value: boolean): void {
  try {
    window.sessionStorage.setItem(HINT_KEY, value ? "1" : "0");
  } catch {
    // Private mode etc. — hint is best-effort only.
  }
}

export function AdminNavLink({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(() => readHint());
  // Bumped whenever the tab regains focus, so a login/logout in another tab
  // (or an expired session) is reflected without needing a navigation.
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const onFocus = () => setRefresh((r) => r + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // /me answers 200 + authenticated flag (no 401 noise), so checking on
      // every page is cheap and keeps the links correct everywhere.
      try {
        const me = await fetch("/api/admin/auth/me", {
          credentials: "include",
          cache: "no-store",
        });
        if (!cancelled && me.ok) {
          const d = (await me.json().catch(() => null)) as { authenticated?: boolean } | null;
          const admin = d?.authenticated === true;
          writeHint(admin);
          setIsAdmin(admin);
          return;
        }
      } catch {
        // Network failure: keep the last-known hint instead of flashing logged-out.
      }
      // Unreachable or unreadable: fall back to logged-out links, but only if
      // we never had any signal (otherwise keep showing the hint).
      if (!cancelled) setIsAdmin((prev) => (prev === null ? false : prev));
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, refresh]);
  if (isAdmin === null) return null;
  if (isAdmin) {
    const active = pathname.startsWith("/admin");
    return (
      <Link href="/admin/dashboard" onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`hover:text-orange ${active ? "text-orange" : ""}`}>
        Dashboard
      </Link>
    );
  }
  const active = pathname === "/admin/login";
  return (
    <Link href="/admin/login" onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`hover:text-orange ${active ? "text-orange" : ""}`}>
      Admin Login
    </Link>
  );
}
