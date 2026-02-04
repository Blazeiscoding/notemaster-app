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
                "w-full justify-start gap-3 rounded-lg px-3 py-2.5 h-auto transition-all duration-200",
                isActive 
                  ? "shadow-md shadow-(--interactive-accent)/25" 
                  : "hover:bg-white/10 border border-transparent hover:border-white/10"
              )}
            >
              <Icon className={cn(
                "size-4 shrink-0",
                isActive ? "text-current" : "text-muted-foreground"
              )} />
              <span className="flex-1 text-left font-medium">{label}</span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-semibold min-w-[1.75rem] text-center",
                  isActive
                    ? "bg-(--interactive-accent-contrast)/20 text-(--interactive-accent-contrast)"
                    : "bg-[var(--interactive-accent)]/15 text-[var(--interactive-accent)]"
                )}
              >
                {count}
              </span>
            </Button>
          );
        }),
      [activeSection, counts, handleClick]
    );

    return <div className="flex flex-col gap-1.5">{sectionButtons}</div>;
  }
);

SectionFilters.displayName = "SectionFilters";

export default SectionFilters;
