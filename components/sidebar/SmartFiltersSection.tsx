"use client";

import React, { useMemo, useState } from "react";
import { Filter, Trash2 } from "lucide-react";
import type { SmartFilter, SmartFilterCriteria } from "@/components/note-app/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export type SmartFiltersSectionProps = {
  smartFilters: SmartFilter[];
  activeSmartFilterId: string | null;
  canSaveSmartFilter: boolean;
  currentCriteria: SmartFilterCriteria;
  onAdd: (input: { name: string; description?: string; criteria?: SmartFilterCriteria }) => boolean;
  onApply: (id: string | null) => void;
  onRemove: (id: string) => void;
};

const SmartFiltersSection: React.FC<SmartFiltersSectionProps> = ({
  smartFilters,
  activeSmartFilterId,
  canSaveSmartFilter,
  currentCriteria,
  onAdd,
  onApply,
  onRemove,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const criteriaChips = useMemo(() => {
    const chips: string[] = [];

    if (currentCriteria.search) {
      chips.push(`Search: "${currentCriteria.search}"`);
    }
    if (currentCriteria.tag) {
      chips.push(`#${currentCriteria.tag}`);
    }
    if (currentCriteria.tags?.length) {
      chips.push(...currentCriteria.tags.map((tag) => `+${tag}`));
    }
    if (typeof currentCriteria.pinned === "boolean") {
      chips.push(currentCriteria.pinned ? "Pinned" : "Not pinned");
    }
    if (typeof currentCriteria.dueWithinDays === "number") {
      chips.push(`Due ≤ ${currentCriteria.dueWithinDays}d`);
    }

    return chips;
  }, [currentCriteria]);

  const handleSave = () => {
    if (!name.trim()) return;
    const success = onAdd({
      name,
      description: description.trim() || undefined,
    });
    if (success) {
      setName("");
      setDescription("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="size-4" />
          Smart filters
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onApply(null)}
          disabled={!activeSmartFilterId}
        >
          Clear
        </Button>
      </div>

      {criteriaChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {criteriaChips.map((chip) => (
            <Badge key={chip} variant="outline" className="text-xs">
              {chip}
            </Badge>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {smartFilters.map((filter) => {
          const isActive = filter.id === activeSmartFilterId;
          return (
            <div
              key={filter.id}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 transition hover:border-primary/40"
              data-active={isActive}
            >
              <button
                type="button"
                onClick={() => onApply(filter.id)}
                className="flex flex-1 flex-col items-start text-left focus-visible:outline-none"
              >
                <span className={`text-sm font-semibold ${isActive ? "text-primary" : ""}`}>
                  {filter.name}
                </span>
                {filter.description ? (
                  <span className="text-xs text-muted-foreground">{filter.description}</span>
                ) : (
                  filter.isDefault && (
                    <span className="text-xs text-muted-foreground">Default filter</span>
                  )
                )}
              </button>
              {!filter.isDefault && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onRemove(filter.id)}
                  title="Delete smart filter"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-2 rounded-lg border p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Save current view
        </div>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Filter name"
          aria-label="Smart filter name"
        />
        <Input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description (optional)"
          aria-label="Smart filter description"
        />
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!canSaveSmartFilter || !name.trim()}
        >
          Save smart filter
        </Button>
        {!canSaveSmartFilter && (
          <p className="text-xs text-muted-foreground">
            Adjust your search, tags, or section to create a unique filter.
          </p>
        )}
      </div>
    </div>
  );
};

export default SmartFiltersSection;
