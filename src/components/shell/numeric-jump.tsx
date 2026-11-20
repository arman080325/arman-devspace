"use client";

import { CornerDownLeft, X } from "lucide-react";
import { projects as canonicalProjects } from "@/data/projects";
import { Kbd } from "@/components/redesign/ui";

export function NumericJump({
  buffer,
  onDismiss,
}: {
  buffer: string;
  onDismiss: () => void;
}) {
  if (!buffer) return null;

  const num = parseInt(buffer, 10);
  const project =
    num >= 1 && num <= 100 ? canonicalProjects.find((p) => p.number === num) : null;
  const padded = String(num).padStart(3, "0");

  return (
    <div
      role="status"
      aria-live="polite"
      className="anim-pop fixed bottom-5 right-5 z-[80] flex items-center gap-3 rounded-dialog border border-edge bg-elevated px-4 py-2.5 shadow-pop"
    >
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-sm font-bold text-sodium-text">#{padded}</span>
          {project ? (
            <span className="max-w-[200px] truncate text-xs font-medium text-fg">
              {project.title}
            </span>
          ) : (
            <span className="text-xs text-fg3">Project not found</span>
          )}
        </div>
        <p className="text-2xs text-fg3">
          Press <Kbd>↵</Kbd> to jump, <Kbd>Esc</Kbd> to cancel
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <CornerDownLeft size={16} strokeWidth={1.5} className="text-sodium-text" />
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss jump"
          className="rounded-ctl p-1 text-fg3 transition-colors hover:bg-surface hover:text-fg"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
