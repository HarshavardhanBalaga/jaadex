"use client";

import "@bpmn-io/form-js/dist/assets/form-js.css";
import "@bpmn-io/form-js/dist/assets/form-js-editor.css";
import "@bpmn-io/form-js/dist/assets/properties-panel.css";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { FormEditor } from "@bpmn-io/form-js";
import { authFetch, getCsrfToken } from "@/lib/admin-client/auth-fetch";

type FormSchema = Record<string, unknown>;

export type FormBuilderProps = {
  workshopId: string;
  workshopTitle: string;
  /** The saved form-js schema, or null when the workshop has no form yet. */
  initialSchema: FormSchema | null;
};

/**
 * Visual form builder (@bpmn-io/form-js) for one workshop. The schema is saved to our
 * own API: POST creates the workshop's form, PUT edits it. Nothing leaves our backend.
 */
export function FormBuilder({ workshopId, workshopTitle, initialSchema }: FormBuilderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<FormEditor | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  // Starts as the saved state. Flips to true after the first successful create.
  const [exists, setExists] = useState(initialSchema !== null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;
      try {
        // Loaded on the client only: form-js touches the DOM as soon as it is created.
        const { createFormEditor, schemaVersion } = await import("@bpmn-io/form-js");
        const editor = await createFormEditor({
          container: containerRef.current,
          schema: initialSchema ?? { type: "default", components: [], schemaVersion },
        });
        if (cancelled) {
          editor.destroy();
          return;
        }
        editor.on("changed", () => {
          if (!cancelled) setDirty(true);
        });
        editorRef.current = editor;
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void init();
    return () => {
      cancelled = true;
      editorRef.current?.destroy();
      editorRef.current = null;
    };
  }, [initialSchema]);

  async function onSave() {
    const editor = editorRef.current;
    if (!editor) return;
    setSaving(true);
    setMessage(null);
    try {
      const schema = editor.saveSchema() as FormSchema;
      const csrf = await getCsrfToken();
      const headers = { "Content-Type": "application/json", "x-csrf-token": csrf };
      const res = exists
        ? await authFetch(`/api/admin/workshop-forms/${workshopId}`, {
            method: "PUT",
            headers,
            body: JSON.stringify({ schema }),
          })
        : await authFetch("/api/admin/workshop-forms", {
            method: "POST",
            headers,
            body: JSON.stringify({ workshopId, schema }),
          });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: { message?: string } } | null;
      if (res.status === 409) {
        // Another admin created the form first. Do not overwrite it from here.
        setExists(true);
        throw new Error("This workshop already has a form. Reload the page to edit it.");
      }
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message ?? "Could not save the form. Try again.");
      }
      setExists(true);
      setDirty(false);
      setMessage({ kind: "ok", text: "Form saved." });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong. Try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link href="/admin/forms" className="text-[13px] font-semibold text-royal hover:underline">
            ← All forms
          </Link>
          <h1 className="mt-2 truncate font-display text-[26px] leading-tight font-bold tracking-[-0.5px] text-navy md:text-[30px]">
            {workshopTitle}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {dirty && <span className="text-[13px] font-semibold text-navy">Unsaved changes</span>}
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving || status !== "ready"}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-royal px-6 text-[14px] font-semibold text-white shadow-pop-royal transition-[background-color,transform] hover:bg-royal-dark active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : exists ? "Save changes" : "Create form"}
          </button>
        </div>
      </div>

      {message && (
        <p role="status" className={`text-[13px] font-medium ${message.kind === "ok" ? "text-green" : "text-[#c1440e]"}`}>
          {message.text}
        </p>
      )}

      <div className="relative h-[calc(100vh-240px)] min-h-[560px] overflow-hidden rounded-2xl border border-[#8d9bc4] bg-white shadow-soft">
        <div ref={containerRef} className="h-full w-full" />
        {status === "loading" && (
          <p className="absolute inset-0 grid place-items-center text-[14px] text-muted">Loading form editor…</p>
        )}
        {status === "error" && (
          <p className="absolute inset-0 grid place-items-center px-6 text-center text-[14px] text-[#c1440e]">
            The form editor could not load. Refresh the page and try again.
          </p>
        )}
      </div>
    </div>
  );
}
