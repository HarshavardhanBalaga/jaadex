"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ButtonLink } from "@/components/ButtonLink";
import { postJson } from "@/lib/admin-client/auth-fetch";

/**
 * Header slot for website users: guests see "Login", signed-in users see
 * "Free Demo" + an account icon whose dropdown offers "Profile" and "Log out". Display only — /contact and /api/contact
 * re-verify the session on the server.
 *
 * After hydration a display-only hint (boolean, no tokens) from the last check
 * is shown, then the live /me check revalidates it. The hint must not be read
 * during the first render: the server has no sessionStorage, so the HTML would differ.
 */
const HINT_KEY = "jaadex.nav.user";
const subscribeToNothing = () => () => {};

function readHint(): boolean | null {
  try {
    if (!window.sessionStorage) return null;
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
  // Server + hydration render get null; React then re-renders with the stored hint.
  const hint = useSyncExternalStore(subscribeToNothing, readHint, () => null);
  const [liveStatus, setLoggedIn] = useState<boolean | null>(null);
  // Name comes only from the live /me check (never stored), so the header shows who is signed in.
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const loggedIn = liveStatus ?? hint;
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);
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
          const d = (await me.json().catch(() => null)) as
            | { authenticated?: boolean; user?: { name?: string; email?: string } }
            | null;
          const user = d?.authenticated === true;
          writeHint(user);
          setLoggedIn(user);
          setUserName(user ? (d?.user?.name?.trim() || null) : null);
          setUserEmail(user ? (d?.user?.email?.trim() || null) : null);
          return;
        }
      } catch {
        // Network failure: keep the last-known hint.
      }
      if (!cancelled) setLoggedIn((prev) => prev ?? readHint() ?? false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, refresh]);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      // postJson retries once with a fresh CSRF token (the cached one may have expired).
      const { ok } = await postJson("/api/auth/logout", {}).catch(() => ({ ok: false }));
      if (ok) {
        writeHint(false);
        setLoggedIn(false);
        setUserName(null);
        setUserEmail(null);
        setMenuOpen(false);
        router.refresh();
      } else {
        // Not confirmed: re-check the real session state instead of guessing.
        setRefresh((r) => r + 1);
      }
    } finally {
      setBusy(false);
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
  const firstName = userName?.split(/\s+/)[0] ?? "";
  const initial = firstName.charAt(0).toUpperCase();
  return (
    <>
      <ButtonLink href="/contact?interest=Product%20Demonstration" size="normal" className={buttonClass}>
        Free Demo
      </ButtonLink>
      <div ref={menuRef} className="relative shrink-0">
        <button type="button" aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Account menu"
          onClick={() => setMenuOpen((o) => !o)}
          className="grid size-8 cursor-pointer place-items-center rounded-full bg-royal text-[13px] font-black text-white sm:size-9 sm:text-[15px]">
          {initial || "U"}
        </button>
        {menuOpen ? (
          <div role="menu"
            className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-white shadow-lg">
            <div className="border-b border-line px-4 py-3">
              {userName ? <p className="truncate text-[14px] font-bold text-navy">{userName}</p> : null}
              {userEmail ? <p className="truncate text-[12px] text-slate-500">{userEmail}</p> : null}
            </div>
            <Link href="/profile" role="menuitem" onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-[14px] font-semibold text-navy hover:bg-royal/5">
              Profile
            </Link>
            <button type="button" role="menuitem" onClick={logout} disabled={busy}
              className="block w-full cursor-pointer px-4 py-2.5 text-left text-[14px] font-semibold text-royal hover:bg-royal/5 disabled:opacity-60">
              {busy ? "Logging out…" : "Log out"}
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
