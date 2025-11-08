"use client";

import React from "react";
import { Button } from "@/components/ui/button";

type TagFiltersProps = {
  tags: string[];
  activeTag: string;
  notesCountByTag: Record<string, number>;
  totalNotes: number;
  onSelect: (tag: string) => void;
  onClear: () => void;
};

const TagFilters: React.FC<TagFiltersProps> = ({
  tags,
  activeTag,
  notesCountByTag,
  totalNotes,
  onSelect,
  onClear,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          Tags
        </div>
        {tags.length > 0 && (
          <button
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            onClick={onClear}
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeTag === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect("all")}
        >
          All
          <span className="ml-2 rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
            {totalNotes}
          </span>
        </Button>
        {tags.map((tag) => (
          <Button
            key={tag}
            variant={activeTag === tag ? "default" : "outline"}
            size="sm"
            onClick={() => onSelect(tag)}
          >
            #{tag}
            <span className="ml-2 rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
              {notesCountByTag[tag] ?? 0}
            </span>
          </Button>
        ))}
        {tags.length === 0 && (
          <p className="text-sm text-muted-foreground">No tags yet</p>
        )}
      </div>
    </div>
  );
};

export default TagFilters;
