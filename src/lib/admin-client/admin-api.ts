/**
 * Browser client for the admin API. Attaches the CSRF header on unsafe
 * methods, retries once with a fresh token, and uses authFetch for
 * session-protected routes so an expired access token refreshes transparently.
 * Never stores tokens: auth cookies are HttpOnly and sent by the browser.
 */
import { authFetch, clearCsrfCache, getCsrfToken } from "./auth-fetch";

export interface AdminApiError {
  code: string;
  message: string;
  fields?: Record<string, string[] | undefined>;
  attemptsLeft?: number;
}

export type AdminApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: AdminApiError };

interface AdminRequestOptions {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  /** Session-protected route: refreshes the access token on 401 and retries once. */
  session?: boolean;
}

const UNAVAILABLE_ERROR: AdminApiError = {
  code: "unavailable",
  message: "Service temporarily unavailable. Try again shortly.",
};
const UNKNOWN_ERROR: AdminApiError = { code: "unknown", message: "Something went wrong. Try again." };

/** First readable message: a field-level error when the server sent one, otherwise the envelope message. */
export function errorMessage(error: AdminApiError): string {
  const field = Object.values(error.fields ?? {}).flat().find(Boolean);
  return field ?? error.message;
}

export async function adminRequest<T extends object = Record<string, unknown>>(
  path: string,
  { method = "GET", body, session = false }: AdminRequestOptions = {},
): Promise<AdminApiResult<T>> {
  const unsafe = method !== "GET";

  async function send(retried: boolean): Promise<AdminApiResult<T>> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["content-type"] = "application/json";
    let res: Response;
    try {
      if (unsafe) headers["x-csrf-token"] = await getCsrfToken();
      const init: RequestInit = {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: "include",
        cache: "no-store",
      };
      res = session ? await authFetch(path, init) : await fetch(path, init);
    } catch {
      return { ok: false, status: 0, error: UNAVAILABLE_ERROR };
    }
    const json = (await res.json().catch(() => null)) as { success?: boolean; error?: AdminApiError } | null;
    if (!res.ok || json?.success === false) {
      const error = json?.error ?? UNKNOWN_ERROR;
      // The cached CSRF token can predate a rotation (e.g. logout in another tab). Refetch once.
      if (unsafe && !retried && error.code === "csrf_invalid") {
        clearCsrfCache();
        return send(true);
      }
      return { ok: false, status: res.status, error };
    }
    return { ok: true, data: (json ?? {}) as T };
  }

  return send(false);
}
