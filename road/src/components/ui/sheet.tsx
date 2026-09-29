"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  side?: "right" | "bottom";
  children: React.ReactNode;
  className?: string;
}

export function Sheet({
  isOpen,
  onClose,
  title,
  description,
  side = "right",
  children,
  className,
}: SheetProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-text-primary/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-0 pointer-events-none flex justify-end">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "sheet-title" : undefined}
          aria-describedby={description ? "sheet-desc" : undefined}
          className={cn(
            "pointer-events-auto w-full bg-surface border-border shadow-2xl flex flex-col z-10 transition-transform duration-200",
            side === "right"
              ? "max-w-md h-full border-l ml-auto"
              : "max-h-[85vh] rounded-t-3xl border-t mt-auto",
            className
          )}
        >
          {/* Header */}
          <div className="p-5 sm:p-6 pb-4 border-b border-border-subtle flex items-center justify-between shrink-0">
            <div>
              {title && (
                <h2 id="sheet-title" className="text-lg font-bold text-text-primary">
                  {title}
                </h2>
              )}
              {description && (
                <p id="sheet-desc" className="text-xs text-text-secondary mt-0.5">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors"
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
