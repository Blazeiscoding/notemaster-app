"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, Download, Palette as PaletteIcon, Upload, X } from "lucide-react";
import AccentPicker from "@/components/layout/AccentPicker";
import type {
  AccentPalette,
  NotebookPayload,
  NotebookTreeNode,
  NotePayload,
} from "@/types/note";
import SearchBar from "./SearchBar";
import SectionFilters from "./SectionFilters";
import TagFilters from "./TagFilters";
import NotebookList from "@/components/notebooks/NotebookList";
import { cn } from "@/lib/utils";
import SmartFiltersSection, {
  type SmartFiltersSectionProps,
} from "./SmartFiltersSection";
import type { SmartFilter, SmartFilterCriteria } from "@/components/note-app/types";

type SortKey = "updated" | "created" | "title";

type SidebarPanelProps = {
  show: boolean;
  onClose: () => void;
  sortBy: SortKey;
  onSortChange: (value: SortKey) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeSection: "notes" | "archive" | "bin";
  sectionCounts: Record<"notes" | "archive" | "bin", number>;
  onSectionChange: (section: "notes" | "archive" | "bin") => void;
  filterTag: string;
  tags: string[];
  notes: NotePayload[];
  onTagSelect: (tag: string) => void;
  onClearTags: () => void;
  accent: AccentPalette;
  accentPreview: AccentPalette | null;
  onAccentPreview: (palette: AccentPalette) => void;
  onAccentPreviewEnd: () => void;
  onAccentApply: (palette: AccentPalette) => void;
  accentPalettes: AccentPalette[];
  smartFilters: SmartFilter[];
  activeSmartFilterId: string | null;
  canSaveSmartFilter: boolean;
  currentSmartFilterCriteria: SmartFilterCriteria;
  onAddSmartFilter: (input: { name: string; description?: string }) => boolean;
  onApplySmartFilter: (id: string | null) => void;
  onRemoveSmartFilter: (id: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  notebooks: NotebookPayload[];
  notebookTree: NotebookTreeNode[];
  newNotebookName: string;
  newNotebookParent: string | null;
  isCreatingNotebook: boolean;
  onNotebookNameChange: (value: string) => void;
  onNotebookParentChange: (value: string | null) => void;
  onCreateNotebook: () => void;
  activeNotebookId: string;
  onSelectNotebookFilter: (id: string) => void;
  onDeleteNotebook: (id: string) => void;
};

const SidebarPanel: React.FC<SidebarPanelProps> = ({
  show,
  onClose,
  sortBy,
  onSortChange,
  searchQuery,
  onSearchChange,
  activeSection,
  sectionCounts,
  onSectionChange,
  filterTag,
  tags,
  notes,
  onTagSelect,
  onClearTags,
  accent,
  accentPreview,
  onAccentPreview,
  onAccentPreviewEnd,
  onAccentApply,
  accentPalettes,
  smartFilters,
  activeSmartFilterId,
  canSaveSmartFilter,
  currentSmartFilterCriteria,
  onAddSmartFilter,
  onApplySmartFilter,
  onRemoveSmartFilter,
  onExport,
  onImport,
  notebooks,
  notebookTree,
  newNotebookName,
  newNotebookParent,
  isCreatingNotebook,
  onNotebookNameChange,
  onNotebookParentChange,
  onCreateNotebook,
  activeNotebookId,
  onSelectNotebookFilter,
  onDeleteNotebook,
}) => {
  const notesCountByTag = React.useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach((note) => {
      note.tags.forEach((tag) => {
        counts[tag] = (counts[tag] ?? 0) + 1;
      });
    });
    return counts;
  }, [notes]);

  const [smartFiltersOpen, setSmartFiltersOpen] = React.useState(true);
  const [notebooksOpen, setNotebooksOpen] = React.useState(true);

  return (
    <aside
      className={cn(
        "space-y-6 rounded-2xl border bg-card p-4 shadow-sm transition-all duration-300",
        "fixed inset-y-0 left-0 z-50 w-[280px] overflow-y-auto",
        "lg:static lg:z-auto lg:w-auto lg:translate-x-0 lg:block",
        show ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute right-2 top-2 lg:hidden"
        onClick={onClose}
      >
        <X className="size-4" />
      </Button>

      <SearchBar value={searchQuery} onChange={onSearchChange} />

      <div className="flex gap-2">
        <Button
          variant={filterTag === "all" ? "default" : "outline"}
          size="sm"
          className="flex-1"
          onClick={() => onTagSelect("all")}
        >
          All
          <span className="ml-2 rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
            {notes.length}
          </span>
        </Button>
        <select
          value={sortBy}
          onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
            onSortChange(event.target.value as SortKey)
          }
          className="w-36 rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="updated">Last updated</option>
          <option value="created">Date created</option>
          <option value="title">Title</option>
        </select>
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
        totalNotes={notes.length}
        onSelect={onTagSelect}
        onClear={onClearTags}
      />

      <div className="rounded-xl border p-3">
        <button
          type="button"
          onClick={() => setSmartFiltersOpen((prev) => !prev)}
          className="flex w-full items-center justify-between text-sm font-semibold"
        >
          <span>Smart filters</span>
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              smartFiltersOpen ? "rotate-0" : "-rotate-90",
            )}
          />
        </button>
        {smartFiltersOpen && (
          <div className="pt-3">
            <SmartFiltersSection
              smartFilters={smartFilters}
              activeSmartFilterId={activeSmartFilterId}
              canSaveSmartFilter={canSaveSmartFilter}
              currentCriteria={currentSmartFilterCriteria}
              onAdd={onAddSmartFilter}
              onApply={onApplySmartFilter}
              onRemove={onRemoveSmartFilter}
            />
          </div>
        )}
      </div>

      <div className="rounded-xl border p-3">
        <button
          type="button"
          onClick={() => setNotebooksOpen((prev) => !prev)}
          className="flex w-full items-center justify-between text-sm font-semibold"
        >
          <span>Notebooks</span>
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              notebooksOpen ? "rotate-0" : "-rotate-90",
            )}
          />
        </button>
        {notebooksOpen && (
          <div className="pt-3">
            <NotebookList
              notebooks={notebooks}
              notebookTree={notebookTree}
              activeNotebookId={activeNotebookId}
              newNotebookName={newNotebookName}
              newNotebookParent={newNotebookParent}
              isCreatingNotebook={isCreatingNotebook}
              totalNotesCount={notes.length}
              onNotebookNameChange={onNotebookNameChange}
              onNotebookParentChange={onNotebookParentChange}
              onCreateNotebook={onCreateNotebook}
              onSelectNotebookFilter={onSelectNotebookFilter}
              onDeleteNotebook={onDeleteNotebook}
              onCloseSidebar={onClose}
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <PaletteIcon className="size-4" />
          Accent color
        </div>
        <AccentPicker
          palettes={accentPalettes}
          activePaletteId={accent.id}
          previewPaletteId={accentPreview?.id ?? null}
          onPreview={onAccentPreview}
          onCancelPreview={onAccentPreviewEnd}
          onApply={onAccentApply}
        />
      </div>

      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="w-full justify-between"
        >
          <span>Export notes</span>
          <Download className="size-4" />
        </Button>
        <label className="w-full">
          <input
            type="file"
            accept="application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImport(file);
            }}
            className="hidden"
          />
          <span className="flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground">
            Import notes
            <Upload className="size-4" />
          </span>
        </label>
      </div>
    </aside>
  );
};

export default SidebarPanel;
