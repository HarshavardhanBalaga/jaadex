"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Modal window on the native <dialog>, which gives the focus trap and focus return.
 * Esc asks to close through `onClose`; while `busy` it cannot be dismissed.
 * Tall content scrolls inside the window. Set max-width through `className`.
 */
export function Modal({
  labelledBy,
  describedBy,
  busy = false,
  dismissOnBackdrop = false,
  className = "",
  onClose,
  children,
}: {
  labelledBy: string;
  describedBy?: string;
  busy?: boolean;
  dismissOnBackdrop?: boolean;
  className?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-busy={busy}
      // Esc: keep our state in charge, and ignore it mid-action.
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      // A click whose target is the <dialog> itself landed on the backdrop.
      onClick={(e) => {
        if (dismissOnBackdrop && e.target === ref.current && !busy) onClose();
      }}
      className={`m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] overflow-y-auto overscroll-contain rounded-2xl bg-white p-0 shadow-soft transition-[opacity,translate] duration-200 backdrop:bg-navy/50 backdrop:backdrop-blur-[2px] starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none ${className}`}
    >
      {children}
    </dialog>
  );
}
