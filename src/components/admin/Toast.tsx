"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";

const VISIBLE_MS = 4000;

/**
 * Success toast. Render only after a client action (it portals to document.body,
 * which does not exist during server rendering).
 */
export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  return createPortal(
    <div
      role="status"
      className="fixed right-4 bottom-4 left-4 z-50 mx-auto flex max-w-[420px] items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-soft transition-[opacity,translate] duration-200 starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none sm:left-auto sm:mx-0"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-green text-white">
        <Icon name="check" size={18} />
      </span>
      <p className="min-w-0 flex-1 text-[14px] font-medium break-words text-navy">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-muted transition-colors hover:bg-[#f5f8ff] hover:text-navy"
      >
        <Icon name="close" size={18} />
      </button>
    </div>,
    document.body,
  );
}
