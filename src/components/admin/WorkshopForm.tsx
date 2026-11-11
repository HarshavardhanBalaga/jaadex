"use client";

/* eslint-disable @next/next/no-img-element */

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getCsrfToken, authFetch } from "@/lib/admin-client/auth-fetch";
import { Icon } from "@/components/Icon";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Modal } from "@/components/admin/Modal";
import type { WorkshopListItem } from "@/components/admin/WorkshopList";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB source file ≈ 4 MB base64.
const DESCRIPTION_MAX = 3000;

const field =
  "w-full rounded-xl border border-[#8d9bc4] bg-white px-4 py-3 text-[15px] leading-snug text-navy outline-none transition-[border-color,box-shadow] placeholder:text-muted/70 hover:border-royal focus:border-royal focus:ring-4 focus:ring-royal/15 disabled:cursor-not-allowed disabled:bg-[#f5f8ff] disabled:opacity-70";
const label = "text-[13px] font-semibold text-navy";

/** Visual only: screen readers get the `required` attribute on the input. */
function RequiredMark() {
  return (
    <span className="text-[#c1440e]" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

/**
 * Add/edit workshop modal: image, title, description, date, location.
 * Submits JSON with the image as a data URL to the admin-protected /api/workshops
 * route, then refreshes the server-rendered list. Pass `workshop` to edit it;
 * choosing no new image keeps the current one. Closing with unsaved input asks first.
 */
export function WorkshopForm({
  workshop,
  onSaved,
  onClose,
}: {
  workshop?: WorkshopListItem;
  onSaved: (message: string) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const id = useId();
  const [preview, setPreview] = useState<string | null>(workshop?.image ?? null);
  const [descriptionLength, setDescriptionLength] = useState(workshop?.description.length ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();
  const saving = busy || isRefreshing;

  function requestClose() {
    if (saving) return;
    if (dirty) setConfirmingDiscard(true);
    else onClose();
  }

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);
    if (!file) {
      setPreview(workshop?.image ?? null);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      e.target.value = "";
      setPreview(workshop?.image ?? null);
      setError("Image is too large — please choose one under 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const picked = data.get("image");
    const image = picked instanceof File && picked.size > 0 ? picked : null;
    if (!image && !workshop) {
      setError("Please choose an image for the workshop.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const dataUrl = image
        ? await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("read_failed"));
            reader.readAsDataURL(image);
          })
        : null;
      const payload = {
        title: String(data.get("title") ?? "").trim(),
        description: String(data.get("description") ?? "").trim(),
        date: String(data.get("date") ?? "").trim(),
        time: String(data.get("time") ?? "").trim(),
        location: String(data.get("location") ?? "").trim(),
        ...(dataUrl ? { image: dataUrl } : {}),
      };
      const csrf = await getCsrfToken();
      const res = await authFetch(workshop ? `/api/workshops/${workshop.id}` : "/api/workshops", {
        method: workshop ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrf },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: { message?: string; fields?: Record<string, string[] | undefined> };
      } | null;
      if (!res.ok || !json?.success) {
        const fieldError = Object.values(json?.error?.fields ?? {}).flat()[0];
        throw new Error(fieldError ?? json?.error?.message ?? `Could not ${workshop ? "update" : "create"} the workshop. Try again.`);
      }
      // In one transition: the modal stays in its saving state until the refreshed list has arrived.
      startRefresh(() => {
        router.refresh();
        onSaved(`“${payload.title}” was ${workshop ? "updated" : "published"}.`);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Modal labelledBy={`${id}-heading`} busy={saving} className="max-w-[620px]" onClose={requestClose}>
        <form onSubmit={onSubmit} onInput={() => setDirty(true)} noValidate aria-busy={saving}>
          {/* Disabling the fieldset locks every control while saving. */}
          <fieldset disabled={saving} className="min-w-0">
            <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-white px-6 py-4">
              <h2 id={`${id}-heading`} className="font-display text-[18px] font-bold text-navy">
                {workshop ? "Edit workshop" : "Add new workshop"}
              </h2>
              <button
                type="button"
                onClick={requestClose}
                aria-label="Close"
                className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-muted transition-colors hover:bg-[#f5f8ff] hover:text-navy disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name="close" size={21} />
              </button>
            </header>

            <div className="grid gap-6 p-6">
              <div className="grid gap-2">
                <p className={label}>
                  Image
                  {/* An edit keeps the current image, so choosing one is only required when adding. */}
                  {!workshop && <RequiredMark />}
                </p>
                <label
                  htmlFor={`${id}-image`}
                  className="relative block cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-[#8d9bc4] bg-[#f5f8ff] transition-colors hover:border-royal focus-within:border-royal focus-within:ring-4 focus-within:ring-royal/15"
                >
                  <input
                    id={`${id}-image`}
                    name="image"
                    type="file"
                    required={!workshop}
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={onPickImage}
                    className="sr-only"
                  />
                  {preview ? (
                    <>
                      <img src={preview} alt="Workshop image preview" className="h-52 w-full object-cover" />
                      <span className="absolute right-3 bottom-3 rounded-lg bg-navy/85 px-3 py-1.5 text-[12px] font-semibold text-white">
                        Change image
                      </span>
                    </>
                  ) : (
                    <span className="flex h-44 flex-col items-center justify-center gap-2 px-6 text-center">
                      <span className="grid size-11 place-items-center rounded-xl bg-white text-royal shadow-soft">
                        <Icon name="image" size={22} />
                      </span>
                      <span className="text-[14px] font-semibold text-navy">Choose an image</span>
                    </span>
                  )}
                </label>
              </div>

              <div className="grid gap-2">
                <label className={label} htmlFor={`${id}-title`}>
                  Title
                  <RequiredMark />
                </label>
                <input id={`${id}-title`} name="title" type="text" required maxLength={140} defaultValue={workshop?.title} placeholder="e.g. Animation & Storytelling Bootcamp" className={field} />
              </div>

              <div className="grid gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <label className={label} htmlFor={`${id}-description`}>
                    Description
                    <RequiredMark />
                  </label>
                  <span className="text-[12px] text-muted tabular-nums">
                    {descriptionLength} / {DESCRIPTION_MAX}
                  </span>
                </div>
                <textarea
                  id={`${id}-description`}
                  name="description"
                  required
                  minLength={10}
                  maxLength={DESCRIPTION_MAX}
                  rows={5}
                  defaultValue={workshop?.description}
                  placeholder="What is this workshop about? Who should attend?"
                  onChange={(e) => setDescriptionLength(e.currentTarget.value.length)}
                  className={`${field} resize-y`}
                />
              </div>

              <div className="grid gap-2">
                <div className="grid gap-5 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <label className={label} htmlFor={`${id}-date`}>
                      Date (optional)
                    </label>
                    <input id={`${id}-date`} name="date" type="date" defaultValue={workshop?.date?.slice(0, 10)} className={field} />
                  </div>
                  <div className="grid gap-2">
                    <label className={label} htmlFor={`${id}-time`}>
                      Time (optional)
                    </label>
                    <input id={`${id}-time`} name="time" type="text" maxLength={60} defaultValue={workshop?.time} placeholder="e.g. 10:00 AM – 1:00 PM" className={field} />
                  </div>
                  <div className="grid gap-2">
                    <label className={label} htmlFor={`${id}-location`}>
                      Location (optional)
                    </label>
                    <input id={`${id}-location`} name="location" type="text" maxLength={200} defaultValue={workshop?.location} placeholder="e.g. RTIH, Mangalagiri" className={field} />
                  </div>
                </div>
                <p className="text-[12px] text-muted">Not confirmed yet? Leave the date, time or location blank, and the website will show “To be announced”.</p>
              </div>
            </div>

            {/* Sticky, and holds the error, so both stay visible however far the form is scrolled. */}
            <footer className="sticky bottom-0 z-10 grid gap-3 border-t border-line bg-white px-6 py-4">
              {error && (
                <p role="alert" className="rounded-xl bg-[#fdece4] px-4 py-3 text-[13px] font-medium text-[#c1440e]">
                  {error}
                </p>
              )}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={requestClose}
                  className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-line bg-white px-5 text-[14px] font-semibold text-muted transition-colors hover:border-navy/30 hover:text-navy disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-royal px-5 text-[14px] font-semibold text-white transition-colors hover:bg-royal-dark disabled:cursor-not-allowed disabled:opacity-80"
                >
                  {saving && <Icon name="loader" size={18} className="inline-block animate-spin" />}
                  {workshop ? (saving ? "Saving…" : "Save changes") : saving ? "Publishing…" : "Publish workshop"}
                </button>
              </div>
            </footer>
          </fieldset>
        </form>
      </Modal>

      {confirmingDiscard && (
        <ConfirmDialog
          title="Discard your changes?"
          description="What you’ve entered in this form will be lost."
          confirmLabel="Discard changes"
          cancelLabel="Keep editing"
          onConfirm={onClose}
          onClose={() => setConfirmingDiscard(false)}
        />
      )}
    </>
  );
}
