"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  ChevronDown,
  Download,
  Palette as PaletteIcon,
  Upload,
} from "lucide-react";
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
import SmartFiltersSection from "./SmartFiltersSection";
import type {
  SmartFilter,
  SmartFilterCriteria,
} from "@/components/note-app/types";

const SIDEBAR_PANEL_STATE_KEY = "notemaster:sidebar-panel-state";

type CollapsibleState = {
  smartFiltersOpen: boolean;
  notebooksOpen: boolean;
};

const DEFAULT_PANEL_STATE: CollapsibleState = {
  smartFiltersOpen: true,
  notebooksOpen: true,
};

const readPanelStateFromStorage = (): CollapsibleState => {
  if (typeof window === "undefined") {
    return DEFAULT_PANEL_STATE;
  }
  try {
    const raw = window.localStorage?.getItem(SIDEBAR_PANEL_STATE_KEY);
    if (!raw) {
      return DEFAULT_PANEL_STATE;
    }
    const parsed = JSON.parse(raw) as Partial<CollapsibleState>;
    return {
      smartFiltersOpen:
        typeof parsed.smartFiltersOpen === "boolean"
          ? parsed.smartFiltersOpen
          : DEFAULT_PANEL_STATE.smartFiltersOpen,
      notebooksOpen:
        typeof parsed.notebooksOpen === "boolean"
          ? parsed.notebooksOpen
          : DEFAULT_PANEL_STATE.notebooksOpen,
    };
  } catch (error) {
    console.error("Failed to read sidebar state", error);
    return DEFAULT_PANEL_STATE;
  }
};

type SortKey = "updated" | "created" | "title";

type SidebarPanelProps = {
  show: boolean;
  sortBy: SortKey;
  onSortChange: (value: SortKey) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
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
  onQuickAddNotebook: (
    parentId: string | null,
    name: string
  ) => Promise<boolean> | boolean;
  onRenameNotebook: (id: string, name: string) => Promise<boolean> | boolean;
  onMoveNotebook: (
    id: string,
    targetParentId: string | null,
    targetIndex: number
  ) => Promise<boolean> | boolean;
  activeNotebookId: string;
  onSelectNotebookFilter: (id: string) => void;
  onDeleteNotebook: (id: string) => void;
};

const SidebarPanel: React.FC<SidebarPanelProps> = ({
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
  onQuickAddNotebook,
  onRenameNotebook,
  onMoveNotebook,
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

  const [panelState, setPanelState] = React.useState<CollapsibleState>(
    readPanelStateFromStorage
  );

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage?.setItem(
        SIDEBAR_PANEL_STATE_KEY,
        JSON.stringify(panelState)
      );
    } catch (error) {
      console.error("Failed to persist sidebar state", error);
    }
  }, [panelState]);

  const toggleSection = (section: keyof CollapsibleState) => {
    setPanelState((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const { smartFiltersOpen, notebooksOpen } = panelState;

  return (
    <aside
      className={cn(
        "space-y-6 rounded-2xl border bg-card/95 backdrop-blur-sm p-5 shadow-lg transition-all duration-300",
        "fixed inset-y-0 left-0 z-50 w-[280px] overflow-y-auto",
        "lg:static lg:z-auto lg:w-auto lg:translate-x-0 lg:block",
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
            {notes.length}
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
        totalNotes={notes.length}
        onSelect={onTagSelect}
        onClear={onClearTags}
      />

      <div className="rounded-xl border border-(--interactive-accent-soft) bg-muted/30 p-3 transition-colors hover:bg-muted/50">
        <button
          type="button"
          onClick={() => toggleSection("smartFiltersOpen")}
          className="flex w-full items-center justify-between text-sm font-semibold text-(--interactive-accent) transition-all hover:text-(--interactive-accent-strong)"
        >
          <span>Smart filters</span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200",
              smartFiltersOpen ? "rotate-0" : "-rotate-90"
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

      <div className="rounded-xl border border-(--interactive-accent-soft) bg-muted/30 p-3 transition-colors hover:bg-muted/50">
        <button
          type="button"
          onClick={() => toggleSection("notebooksOpen")}
          className="flex w-full items-center justify-between text-sm font-semibold text-(--interactive-accent) transition-all hover:text-(--interactive-accent-strong)"
        >
          <span>Notebooks</span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200",
              notebooksOpen ? "rotate-0" : "-rotate-90"
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
              onQuickAddNotebook={onQuickAddNotebook}
              onRenameNotebook={onRenameNotebook}
              onMoveNotebook={onMoveNotebook}
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
