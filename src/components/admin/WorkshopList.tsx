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
import { WorkshopRegistrationsDialog } from "@/components/admin/WorkshopRegistrationsDialog";

export type WorkshopListItem = {
  id: string;
  title: string;
  description: string;
  date: string | null; // ISO, null = to be announced
  location: string; // "" = to be announced
  image: string; // data URL
  registration: { enabled: boolean; capacity: number | null; count: number }; // capacity null = unlimited
};

function registrationSummary({ enabled, capacity, count }: WorkshopListItem["registration"]): string {
  const seats = capacity === null ? `${count} registered` : `${count} / ${capacity} seats`;
  if (!enabled) return count > 0 ? `Registration off · ${seats}` : "Registration off";
  return capacity !== null && count >= capacity ? `Registration full · ${seats}` : `Registration open · ${seats}`;
}

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
  const [registrationsTarget, setRegistrationsTarget] = useState<WorkshopListItem | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<{ id: string; message: string } | null>(null);
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

  async function toggleRegistration(w: WorkshopListItem) {
    if (togglingId) return;
    const enabled = !w.registration.enabled;
    setTogglingId(w.id);
    setToggleError(null);
    try {
      const csrf = await getCsrfToken();
      const res = await authFetch(`/api/workshops/${w.id}/registration`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrf },
        body: JSON.stringify({ enabled, capacity: w.registration.capacity }),
      });
      const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!res.ok) throw new Error(json?.error?.message ?? "Could not change registration. Try again.");
      startRefresh(() => {
        router.refresh();
        setToast(enabled ? `Registration opened for “${w.title}”.` : `Registration closed for “${w.title}”.`);
      });
    } catch (err) {
      setToggleError({ id: w.id, message: err instanceof Error ? err.message : "Something went wrong. Try again." });
    } finally {
      setTogglingId(null);
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
                  <p className={`mt-0.5 text-[12px] font-medium ${w.registration.enabled ? "text-green" : "text-muted"}`}>
                    {registrationSummary(w.registration)}
                  </p>
                  {toggleError?.id === w.id && (
                    <p role="alert" className="mt-0.5 text-[12px] font-medium text-[#c1440e]">
                      {toggleError.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
                {/* Opening needs an upcoming workshop; an open one can always be closed. */}
                {(isWorkshopUpcoming(w.date) || w.registration.enabled) && (
                  <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] font-medium text-muted has-disabled:cursor-wait">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={w.registration.enabled}
                      aria-label={`Registration for ${w.title}`}
                      disabled={togglingId !== null || isRefreshing}
                      onClick={() => void toggleRegistration(w)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-wait disabled:opacity-60 ${
                        w.registration.enabled ? "bg-green" : "bg-[#c5cee6]"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`size-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${
                          w.registration.enabled ? "translate-x-[22px]" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                    Register now
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => setRegistrationsTarget(w)}
                  aria-haspopup="dialog"
                  aria-label={`Registrations for ${w.title}`}
                  className={`${rowButton} hover:border-royal/40 hover:text-royal`}
                >
                  <Icon name="users" size={14} />
                  Registrations ({w.registration.count})
                </button>
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
          description={
            deleteTarget.registration.count > 0
              ? `It will disappear from the public Workshops page, and its ${deleteTarget.registration.count} registration${deleteTarget.registration.count === 1 ? "" : "s"} will be deleted. This can’t be undone.`
              : "It will disappear from the public Workshops page. This can’t be undone."
          }
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

      {registrationsTarget && (
        <WorkshopRegistrationsDialog
          key={registrationsTarget.id}
          // Read from the latest server list so counts stay current after a save.
          workshop={workshops.find((w) => w.id === registrationsTarget.id) ?? registrationsTarget}
          onClose={() => setRegistrationsTarget(null)}
          onSaved={(message) => setToast(message)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={dismissToast} />}
    </>
  );
}
