"use client";

import { SpecPlate } from "@/components/redesign/SpecPlate";
import { projectToSpecPlate } from "@/components/redesign/Hundred";
import { Empty, Button } from "@/components/redesign/ui";
import type { Project } from "@/types/project";

export function PlatesView({
  projects,
  onTogglePin,
  onClearFilters,
}: {
  projects: Project[];
  onTogglePin: (p: Project) => void;
  onClearFilters: () => void;
}) {
  if (projects.length === 0) {
    return (
      <Empty
        title="No project plates match your criteria"
        action={
          <Button size="s" variant="secondary" onClick={onClearFilters}>
            Clear filters
          </Button>
        }
      >
        Try selecting different filters or searching for another term.
      </Empty>
    );
  }

  return (
    <div
      role="region"
      aria-label="Project specification plates"
      className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 min-[1440px]:grid-cols-4"
    >
      {projects.map((p) => {
        const spec = projectToSpecPlate(p);
        return (
          <SpecPlate
            key={p.number}
            p={spec}
            pinned={p.bookmarked}
            onTogglePin={() => onTogglePin(p)}
          />
        );
      })}
    </div>
  );
}
