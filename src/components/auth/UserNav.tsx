"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ButtonLink } from "@/components/ButtonLink";
import { getCsrfToken, clearCsrfCache } from "@/lib/admin-client/auth-fetch";

/**
 * Header slot for website users: guests see "Login", signed-in users see
 * "Book A Demo" + "Log out". Display only — /contact and /api/contact
 * re-verify the session on the server.
 *
 * First paint uses a display-only hint (boolean, no tokens) from the last
 * check, then the live /me check revalidates it (same pattern as AdminNavLink).
 */
const HINT_KEY = "jaadex.nav.user";

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

const buttonClass = "px-3 py-1.5 text-[11px] whitespace-nowrap sm:px-4 sm:py-[8px] sm:text-[15px]";

export function UserNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(() => readHint());
  const [busy, setBusy] = useState(false);
  // Bumped on tab focus so a login/logout in another tab is reflected.
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const onFocus = () => setRefresh((r) => r + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        if (!cancelled && me.ok) {
          const d = (await me.json().catch(() => null)) as { authenticated?: boolean } | null;
          const user = d?.authenticated === true;
          writeHint(user);
          setLoggedIn(user);
          return;
        }
      } catch {
        // Network failure: keep the last-known hint.
      }
      if (!cancelled) setLoggedIn((prev) => (prev === null ? false : prev));
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, refresh]);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      const csrf = await getCsrfToken().catch(() => "");
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { "x-csrf-token": csrf },
      }).catch(() => undefined);
    } finally {
      clearCsrfCache();
      writeHint(false);
      setLoggedIn(false);
      setBusy(false);
      router.refresh();
    }
  }

  if (loggedIn === null) return null;
  if (!loggedIn) {
    const next = pathname === "/login" || pathname === "/register" ? "/" : pathname;
    return (
      <ButtonLink href={`/login?next=${encodeURIComponent(next)}`} size="normal" className={buttonClass}>
        Login
      </ButtonLink>
    );
  }
  return (
    <>
      <ButtonLink href="/contact?interest=Product%20Demonstration" size="normal" className={buttonClass}>
        Book A Demo
      </ButtonLink>
      <button type="button" onClick={logout} disabled={busy}
        className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-white px-3 py-1.5 text-[11px] font-black whitespace-nowrap text-royal disabled:opacity-60 sm:px-4 sm:py-[8px] sm:text-[15px]">
        {busy ? "…" : "Log out"}
      </button>
    </>
  );
}
