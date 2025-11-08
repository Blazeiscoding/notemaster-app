"use client";

import React from "react";
import { Button } from "@/components/ui/button";

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
            variant={activeSection === section ? "default" : "ghost"}
            size="sm"
            className="justify-between capitalize"
            onClick={() => onSelect(section)}
          >
            <span>{section}</span>
            <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
              {counts[section] ?? 0}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default SectionFilters;
