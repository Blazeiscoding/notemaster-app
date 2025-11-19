"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SectionKey = "notes" | "archive" | "bin";

type SectionFiltersProps = {
  activeSection: SectionKey;
  counts: Record<SectionKey, number>;
  onSelect: (section: SectionKey) => void;
};

const SectionFilters: React.FC<SectionFiltersProps> = ({
  activeSection,
  counts,
  onSelect,
}) => {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Sections
      </p>
      <div className="flex flex-col gap-2">
        {(Object.keys(counts) as SectionKey[]).map((section) => (
          <Button
            key={section}
            variant={activeSection === section ? "accent" : "ghost"}
            size="sm"
            className={cn(
              "justify-between capitalize transition-all duration-200",
              activeSection === section && "shadow-md shadow-(--interactive-accent)/20"
            )}
            onClick={() => onSelect(section)}
          >
            <span className="font-medium">{section}</span>
            <span className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              activeSection === section
                ? "bg-(--interactive-accent-contrast)/20 text-(--interactive-accent-contrast)"
                : "bg-background text-muted-foreground"
            )}>
              {counts[section] ?? 0}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default SectionFilters;
