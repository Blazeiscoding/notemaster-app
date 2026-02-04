"use client";

import React, { useCallback, useMemo } from "react";
import { Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TagFiltersProps = {
  tags: string[];
  activeTag: string;
  notesCountByTag: Record<string, number>;
  totalNotes: number;
  onSelect: (tag: string) => void;
  onClear: () => void;
};

const TagFilters: React.FC<TagFiltersProps> = React.memo(
  ({ tags, activeTag, notesCountByTag, totalNotes, onSelect, onClear }) => {
    const sortedTags = useMemo(
      () =>
        [...tags].sort((a, b) => {
          const countA = notesCountByTag[a] ?? 0;
          const countB = notesCountByTag[b] ?? 0;
          return countB - countA;
        }),
      [tags, notesCountByTag]
    );

    const handleTagClick = useCallback(
      (tag: string) => () => {
        onSelect(tag);
      },
      [onSelect]
    );

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Tag className="size-3" />
            Tags
          </span>
          {activeTag !== "all" && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClear}
              className="h-5 w-5"
            >
              <X className="size-3" />
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {/* All tags button */}
          <Badge
            variant={activeTag === "all" ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-all duration-150",
              activeTag === "all"
                ? "bg-(--interactive-accent) text-(--interactive-accent-contrast) shadow-sm"
                : "border-(--interactive-accent)/30 text-(--interactive-accent) hover:bg-(--interactive-accent-soft) hover:border-(--interactive-accent)/50"
            )}
            onClick={handleTagClick("all")}
          >
            All
            <span
              className={cn(
                "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                activeTag === "all"
                  ? "bg-(--interactive-accent-contrast)/20"
                  : "bg-muted"
              )}
            >
              {totalNotes}
            </span>
          </Badge>
          {tags.length === 0 && (
            <span className="text-xs text-muted-foreground py-1">No tags yet</span>
          )}
          {sortedTags.map((tag) => {
            const isActive = activeTag === tag;
            const count = notesCountByTag[tag] ?? 0;
            return (
              <Badge
                key={tag}
                variant={isActive ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-all duration-150",
                  isActive
                    ? "bg-(--interactive-accent) text-(--interactive-accent-contrast) shadow-sm"
                    : "border-(--interactive-accent)/30 text-(--interactive-accent) hover:bg-(--interactive-accent-soft) hover:border-(--interactive-accent)/50"
                )}
                onClick={handleTagClick(tag)}
              >
                #{tag}
                <span
                  className={cn(
                    "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    isActive
                      ? "bg-(--interactive-accent-contrast)/20"
                      : "bg-muted"
                  )}
                >
                  {count}
                </span>
              </Badge>
            );
          })}
        </div>
      </div>
    );
  }
);

TagFilters.displayName = "TagFilters";

export default TagFilters;
