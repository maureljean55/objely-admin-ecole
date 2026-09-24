"use client";

import { useEffect, useId, type ReactNode } from "react";
import { IconButton } from "./Button";

// Modal panel. `side` slides it in from the right (detail views); default is a centred dialog (forms, confirmations).
export function Dialog({
  title,
  onClose,
  children,
  footer,
  side = false,
  width = 520,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  side?: boolean;
  width?: number;
}) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className={`fixed inset-0 z-50 flex bg-ink/50 ${side ? "justify-end" : "items-center justify-center p-6"}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ width, maxWidth: "100%" }}
        className={`flex max-h-full animate-rise flex-col bg-white shadow-pop ${side ? "h-full" : "rounded-card"}`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
          <h2 id={titleId} className="text-h2 text-ink">{title}</h2>
          <IconButton icon="close" aria-label="Fermer" onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
