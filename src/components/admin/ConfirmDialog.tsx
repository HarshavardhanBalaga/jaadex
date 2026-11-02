"use client";

import { useId, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/admin/Modal";

/** Confirmation for destructive actions. Stays open while `busy`, until the action settles. */
export function ConfirmDialog({
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  busyLabel,
  busy = false,
  error = null,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const id = useId();

  return (
    <Modal
      labelledBy={`${id}-title`}
      describedBy={`${id}-description`}
      busy={busy}
      dismissOnBackdrop
      className="max-w-[440px]"
      onClose={onClose}
    >
      <div className="grid gap-5 p-6">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#fdece4] text-[#c1440e]">
            <Icon name="trash" size={21} />
          </span>
          <div className="min-w-0">
            <h2 id={`${id}-title`} className="font-display text-[18px] leading-snug font-bold text-navy">
              {title}
            </h2>
            <p id={`${id}-description`} className="mt-1 text-[14px] leading-relaxed text-muted">
              {description}
            </p>
          </div>
        </div>
        {children}
        {error && (
          <p role="alert" className="rounded-xl bg-[#fdece4] px-4 py-3 text-[13px] font-medium text-[#c1440e]">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-line px-5 text-[14px] font-semibold text-muted transition-colors hover:border-navy/30 hover:text-navy disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#c1440e] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#a3390b] disabled:cursor-not-allowed disabled:opacity-80"
          >
            {busy && <Icon name="loader" size={18} className="inline-block animate-spin" />}
            {busy ? (busyLabel ?? confirmLabel) : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
