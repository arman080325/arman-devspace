"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Mark, Wordmark } from "@/components/redesign/brand";
import { IconButton, useFocusTrap } from "@/components/redesign/ui";
import { Sidebar } from "./sidebar";
import type { SessionUser } from "@/types/project";

export function MobileNavDrawer({
  open,
  onClose,
  sessionUser,
  onSignOut,
  activeProjectNumber,
}: {
  open: boolean;
  onClose: () => void;
  sessionUser?: SessionUser | null;
  onSignOut?: () => void;
  activeProjectNumber?: number;
}) {
  const drawerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, drawerRef, onClose);

  // Manage body scroll lock
  useEffect(() => {
    if (open) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div role="presentation" className="fixed inset-0 z-[90] md:hidden">
      {/* Backdrop */}
      <div
        className="anim-fade fixed inset-0 bg-scrim"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="anim-drawer fixed inset-y-0 left-0 z-10 flex w-[280px] max-w-[85vw] flex-col border-r border-edge bg-surface shadow-pop"
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-line pl-4 pr-2">
          <div className="flex items-center gap-2">
            <Mark size={24} />
            <Wordmark className="text-[15px]" />
          </div>
          <IconButton label="Close navigation" size="touch" onClick={onClose}>
            <X size={18} strokeWidth={1.5} />
          </IconButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <Sidebar
            collapsed={false}
            onNavigate={onClose}
            sessionUser={sessionUser}
            onSignOut={() => {
              onClose();
              onSignOut?.();
            }}
            activeProjectNumber={activeProjectNumber}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
