"use client";

import React, { useCallback, useMemo } from "react";
import { Filter, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  SmartFilter,
  SmartFilterCriteria,
} from "@/components/note-app/types";

type SmartFiltersSectionProps = {
  smartFilters: SmartFilter[];
  activeSmartFilterId: string | null;
  canSaveSmartFilter: boolean;
  currentCriteria: SmartFilterCriteria;
  onAdd: (input: { name: string; description?: string }) => boolean;
  onApply: (id: string | null) => void;
  onRemove: (id: string) => void;
};

const SmartFiltersSection: React.FC<SmartFiltersSectionProps> = React.memo(
  ({
    smartFilters,
    activeSmartFilterId,
    canSaveSmartFilter,
    currentCriteria,
    onAdd,
    onApply,
    onRemove,
  }) => {
    const handleApply = useCallback(
      (id: string | null) => () => {
        onApply(id);
      },
      [onApply]
    );

    const handleRemove = useCallback(
      (id: string) => (e: React.MouseEvent) => {
        e.stopPropagation();
        onRemove(id);
      },
      [onRemove]
    );

    const filterButtons = useMemo(
      () =>
        smartFilters.map((filter) => {
          const isActive = activeSmartFilterId === filter.id;
          return (
            <div
              key={filter.id}
              className={cn(
                "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-150 cursor-pointer",
                isActive
                  ? "bg-(--interactive-accent) text-(--interactive-accent-contrast) shadow-sm"
                  : "bg-muted/50 hover:bg-muted text-foreground"
              )}
              onClick={handleApply(filter.id)}
            >
              <Filter className="size-3.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{filter.name}</div>
                {filter.description && (
                  <div
                    className={cn(
                      "text-xs truncate",
                      isActive
                        ? "text-(--interactive-accent-contrast)/70"
                        : "text-muted-foreground"
                    )}
                  >
                    {filter.description}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleRemove(filter.id)}
                className={cn(
                  "opacity-0 group-hover:opacity-100 transition-opacity",
                  isActive
                    ? "text-(--interactive-accent-contrast)/70 hover:text-(--interactive-accent-contrast)"
                    : "text-muted-foreground hover:text-destructive"
                )}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          );
        }),
      [smartFilters, activeSmartFilterId, handleApply, handleRemove]
    );

    if (smartFilters.length === 0) {
      return (
        <p className="text-xs text-muted-foreground text-center py-2">
          No saved filters yet. Use the search and filters above, then save
          your combination.
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {activeSmartFilterId && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleApply(null)}
            className="w-full text-xs"
          >
            Clear active filter
          </Button>
        )}
        <div className="space-y-1.5">{filterButtons}</div>
      </div>
    );
  }
);

SmartFiltersSection.displayName = "SmartFiltersSection";

export default SmartFiltersSection;
