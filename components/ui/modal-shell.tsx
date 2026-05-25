"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ModalShell({
  open,
  ariaLabel,
  title,
  description,
  onClose,
  maxWidthClassName = "max-w-3xl",
  children,
  footer,
  headerActions
}: {
  open: boolean;
  ariaLabel: string;
  title: string;
  description?: string;
  onClose: () => void;
  maxWidthClassName?: string;
  children: ReactNode;
  footer?: ReactNode;
  headerActions?: ReactNode;
}) {
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onMouseDown={(event) => {
        if (!panelRef.current) return;
        if (panelRef.current.contains(event.target as Node)) return;
        onClose();
      }}
    >
      <div className="flex min-h-full items-center justify-center">
        <section
          ref={panelRef}
          className={cn(
            "flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-xl border bg-card shadow-xl",
            maxWidthClassName
          )}
          data-testid="modal-panel"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="flex shrink-0 items-start justify-between gap-3 border-b bg-card px-4 py-3">
            <div>
              <h3 className="text-lg font-semibold">{title}</h3>
              {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              {headerActions}
              <Button variant="outline" className="min-h-11" onClick={onClose} aria-label={`Close ${title}`}>
                Close
              </Button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3" data-testid="modal-body">
            {children}
          </div>

          {footer ? (
            <footer className="shrink-0 border-t bg-card px-4 py-3" data-testid="modal-footer">
              {footer}
            </footer>
          ) : null}
        </section>
      </div>
    </div>
  );
}
