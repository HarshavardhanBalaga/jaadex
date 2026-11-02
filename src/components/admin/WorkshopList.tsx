"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getCsrfToken, authFetch } from "@/lib/admin-client/auth-fetch";
import { isWorkshopUpcoming, workshopWhenWhere } from "@/lib/workshops/format";
import { Icon } from "@/components/Icon";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Toast } from "@/components/admin/Toast";
import { WorkshopForm } from "@/components/admin/WorkshopForm";

export type WorkshopListItem = {
  id: string;
  title: string;
  description: string;
  date: string | null; // ISO, null = to be announced
  location: string; // "" = to be announced
  image: string; // data URL
};

const rowButton =
  "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-muted transition-colors";

/** Dashboard list of published workshops: add, remove, and edit for upcoming ones. Server data, client actions. */
export function WorkshopList({ workshops }: { workshops: WorkshopListItem[] }) {
  const router = useRouter();
  const [formTarget, setFormTarget] = useState<WorkshopListItem | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkshopListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isRefreshing, startRefresh] = useTransition();
  const dismissToast = useCallback(() => setToast(null), []);
  const deleteBusy = deleting || isRefreshing;

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const csrf = await getCsrfToken();
      const res = await authFetch(`/api/workshops/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "x-csrf-token": csrf },
      });
      const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!res.ok) throw new Error(json?.error?.message ?? "Could not remove the workshop. Try again.");
      // In one transition: the dialog closes and the toast shows once the refreshed list has arrived.
      startRefresh(() => {
        router.refresh();
        setDeleteTarget(null);
        setToast(`“${deleteTarget.title}” was removed.`);
      });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <p className="text-[13px] text-muted">
          {workshops.length} workshop{workshops.length === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          onClick={() => setFormTarget("new")}
          aria-haspopup="dialog"
          className="inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-royal px-4 text-[13px] font-semibold text-white transition-colors hover:bg-royal-dark"
        >
          <Icon name="plus" size={18} />
          Add new workshop
        </button>
      </div>

      {workshops.length === 0 ? (
        <p className="px-5 py-8 text-center text-[13px] text-muted">No workshops published yet. Click “Add new workshop” to publish your first one.</p>
      ) : (
        <div className="divide-y divide-line">
          {workshops.map((w) => (
            <div key={w.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 sm:flex-nowrap">
              <div className="flex min-w-0 flex-1 basis-full items-center gap-4 sm:basis-0">
                {/* Data-URL image: plain img (next/image does not accept data: URLs). */}
                <img src={w.image} alt="" className="h-14 w-20 shrink-0 rounded-lg border border-line object-cover" />
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-[14px] font-semibold text-navy">{w.title}</h4>
                  <p className="mt-0.5 text-[12px] text-muted">{workshopWhenWhere(w.date, w.location)}</p>
                </div>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                {isWorkshopUpcoming(w.date) && (
                  <button
                    type="button"
                    onClick={() => setFormTarget(w)}
                    aria-haspopup="dialog"
                    aria-label={`Edit ${w.title}`}
                    className={`${rowButton} hover:border-royal/40 hover:text-royal`}
                  >
                    <Icon name="pencil" size={14} />
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteTarget(w);
                  }}
                  aria-haspopup="dialog"
                  aria-label={`Remove ${w.title}`}
                  className={`${rowButton} hover:border-[#c1440e]/40 hover:bg-[#fdece4] hover:text-[#c1440e]`}
                >
                  <Icon name="trash" size={14} />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formTarget && (
        <WorkshopForm
          key={formTarget === "new" ? "new" : formTarget.id}
          workshop={formTarget === "new" ? undefined : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={(message) => {
            setFormTarget(null);
            setToast(message);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Remove this workshop?"
          description="It will disappear from the public Workshops page. This can’t be undone."
          confirmLabel="Remove workshop"
          busyLabel="Removing…"
          busy={deleteBusy}
          error={deleteError}
          onConfirm={() => void confirmDelete()}
          onClose={() => setDeleteTarget(null)}
        >
          <div className="flex items-center gap-3 rounded-xl border border-line bg-[#f5f8ff] p-3">
            <img src={deleteTarget.image} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-navy">{deleteTarget.title}</p>
              <p className="mt-0.5 text-[12px] text-muted">{workshopWhenWhere(deleteTarget.date, deleteTarget.location)}</p>
            </div>
          </div>
        </ConfirmDialog>
      )}

      {toast && <Toast message={toast} onDismiss={dismissToast} />}
    </>
  );
}
