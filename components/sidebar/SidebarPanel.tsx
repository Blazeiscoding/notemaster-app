"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

import type {
  SectionKey,
} from "@/types/note";
import SearchBar from "./SearchBar";
import SectionFilters from "./SectionFilters";
import TagFilters from "./TagFilters";
import { cn } from "@/lib/utils";



type SortKey = "updated" | "created" | "title";

type SidebarPanelProps = {
  show: boolean;
  sortBy: SortKey;
  onSortChange: (value: SortKey) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  activeSection: SectionKey;
  sectionCounts: Record<SectionKey, number>;
  onSectionChange: (section: SectionKey) => void;
  filterTag: string;
  tags: string[];
  totalNotesCount: number;
  notesCountByTag: Record<string, number>;
  onTagSelect: (tag: string) => void;
  onClearTags: () => void;
};

const SidebarPanel: React.FC<SidebarPanelProps> = React.memo(({
  show,
  sortBy,
  onSortChange,
  searchQuery,
  onSearchChange,
  searchInputRef,
  activeSection,
  sectionCounts,
  onSectionChange,
  filterTag,
  tags,
  totalNotesCount,
  notesCountByTag,
  onTagSelect,
  onClearTags,
}) => {



  return (
    <aside
      className={cn(
        "space-y-6 rounded-2xl border border-white/15 bg-[var(--sidebar)]/95 text-(--sidebar-foreground) backdrop-blur-2xl p-5 shadow-[var(--glass-shadow)] transition-all duration-300",
        "fixed inset-y-0 left-0 z-50 w-[85vw] max-w-sm overflow-y-auto",
        "lg:border-[var(--glass-border)] lg:bg-[var(--glass-bg)] lg:text-inherit lg:w-auto lg:max-w-none lg:static lg:z-auto lg:translate-x-0 lg:block",
        show ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <SearchBar value={searchQuery} onChange={onSearchChange} inputRef={searchInputRef} />

      <div className="flex gap-2">
        <Button
          variant={filterTag === "all" ? "accent" : "outline"}
          size="sm"
          className={cn(
            "flex-1 transition-all duration-200",
            filterTag === "all" && "shadow-md shadow-(--interactive-accent)/20"
          )}
          onClick={() => onTagSelect("all")}
        >
          All
          <span
            className={cn(
              "ml-2 rounded-full px-2 py-0.5 text-xs font-medium",
              filterTag === "all"
                ? "bg-(--interactive-accent-contrast)/20 text-(--interactive-accent-contrast)"
                : "bg-background text-muted-foreground"
            )}
          >
            {totalNotesCount}
          </span>
        </Button>
        <Select
          value={sortBy}
          onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
            onSortChange(event.target.value as SortKey)
          }
          className="w-36"
        >
          <option value="updated">Last updated</option>
          <option value="created">Date created</option>
          <option value="title">Title</option>
        </Select>
      </div>

      <SectionFilters
        activeSection={activeSection}
        counts={sectionCounts}
        onSelect={onSectionChange}
      />

        <TagFilters
          tags={tags}
          activeTag={filterTag}
          notesCountByTag={notesCountByTag}
          totalNotes={totalNotesCount}
          onSelect={onTagSelect}
          onClear={onClearTags}
        />


    </aside>
  );
});

SidebarPanel.displayName = "SidebarPanel";

export default SidebarPanel;
