"use client";

import React, { useCallback, useMemo } from "react";
import { Archive, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SectionKey } from "@/types/note";

type SectionFiltersProps = {
  activeSection: SectionKey;
  counts: Record<SectionKey, number>;
  onSelect: (section: SectionKey) => void;
};

const sections: Array<{
  key: SectionKey;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "notes", label: "Notes", Icon: FileText },
  { key: "archive", label: "Archive", Icon: Archive },
  { key: "bin", label: "Bin", Icon: Trash2 },
];

const SectionFilters: React.FC<SectionFiltersProps> = React.memo(
  ({ activeSection, counts, onSelect }) => {
    const handleClick = useCallback(
      (section: SectionKey) => () => {
        onSelect(section);
      },
      [onSelect]
    );

    const sectionButtons = useMemo(
      () =>
        sections.map(({ key, label, Icon }) => {
          const isActive = activeSection === key;
          const count = counts[key];
          return (
            <Button
              key={key}
              variant={isActive ? "accent" : "ghost"}
              size="sm"
              onClick={handleClick(key)}
              className={cn(
                "flex-1 justify-start gap-2 transition-all duration-200",
                isActive && "shadow-md shadow-(--interactive-accent)/20"
              )}
            >
              <Icon className="size-4" />
              <span className="flex-1 text-left">{label}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  isActive
                    ? "bg-(--interactive-accent-contrast)/20 text-(--interactive-accent-contrast)"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            </Button>
          );
        }),
      [activeSection, counts, handleClick]
    );

    return <div className="flex flex-col gap-1">{sectionButtons}</div>;
  }
);

SectionFilters.displayName = "SectionFilters";

export default SectionFilters;
