/**
 * Browser client: CSRF handling + single-flight refresh coordination.
 * Exactly one refresh request in flight per tab; concurrent 401s share it,
 * so coordinated retries never trigger reuse detection.
 */
"use client";

let csrfCache: string | null = null;
let refreshPromise: Promise<boolean> | null = null;
// Shared in-flight issuance: concurrent callers (e.g. StrictMode remounts)
// must share one GET /csrf instead of racing two token rotations.
let csrfInflight: Promise<string> | null = null;

export async function getCsrfToken(): Promise<string> {
  if (csrfCache) return csrfCache;
  if (!csrfInflight) {
    csrfInflight = (async () => {
      const res = await fetch("/api/admin/auth/csrf", { credentials: "include" });
      if (!res.ok) throw new Error("csrf_unavailable");
      const data = (await res.json()) as { csrfToken?: string };
      if (!data.csrfToken) throw new Error("csrf_unavailable");
      csrfCache = data.csrfToken;
      return csrfCache;
    })();
    // Clear the slot (success or failure) without swallowing the result.
    void csrfInflight.catch(() => undefined).finally(() => {
      csrfInflight = null;
    });
  }
  return csrfInflight;
}

export function clearCsrfCache(): void {
  csrfCache = null;
}

async function doRefresh(): Promise<boolean> {
  try {
    const csrf = await getCsrfToken();
    const res = await fetch("/api/admin/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { "x-csrf-token": csrf },
    });
    return res.ok;
  } catch {
    return false;
  }
}

function singleFlightRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** CSRF-protected JSON POST. Never throws on HTTP errors; returns the parsed body. */
export async function postJson(url: string, body: unknown, retried = false): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const csrf = await getCsrfToken();
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json", "x-csrf-token": csrf },
    body: JSON.stringify(body),
  });
  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }
  // One retry with a fresh token: the cached token may predate a rotation
  // (e.g. logout rotated the cookie in another tab). Never loops.
  if (!res.ok && !retried) {
    const code = typeof data?.error === "object" && data.error !== null && "code" in data.error
      ? (data.error as { code?: string }).code
      : undefined;
    if (code === "csrf_invalid") {
      clearCsrfCache();
      return postJson(url, body, true);
    }
  }
  return { ok: res.ok, data };
}

/** Authenticated fetch with coordinated refresh-then-retry (one retry max). */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const first = await fetch(input, { ...init, credentials: "include" });
  if (first.status !== 401) return first;
  const renewed = await singleFlightRefresh();
  if (!renewed) return first;
  return fetch(input, { ...init, credentials: "include" });
}
