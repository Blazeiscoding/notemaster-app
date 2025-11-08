import type {
  AccentPalette,
  NotePayload,
  NotebookPayload,
  NoteRevisionPayload,
} from "@/types/note";

export type ViewSection = "notes" | "archive" | "bin";
export type SortBy = "updated" | "created" | "title";

export type AppState = {
  notes: NotePayload[];
  notebooks: NotebookPayload[];
  currentNote: NotePayload | null;
  searchQuery: string;
  filterTag: string;
  activeSection: ViewSection;
  activeNotebookId: string;
  sortBy: SortBy;
  showSidebar: boolean;
  showPreview: boolean;
  darkMode: boolean;
  accent: AccentPalette;
  isLoading: boolean;
  isSavingNote: boolean;
  isRevisionOpen: boolean;
  revisions: NoteRevisionPayload[];
  isLoadingRevisions: boolean;
  revisionTargetId: string | null;
};
