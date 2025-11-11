import type {
  AccentPalette,
  NotePayload,
  NotebookPayload,
  NoteRevisionPayload,
} from "@/types/note";

export type ViewSection = "notes" | "archive" | "bin";
export type SortBy = "updated" | "created" | "title";

export type SmartFilterCriteria = {
  section?: ViewSection | "any";
  search?: string;
  tag?: string;
  notebookId?: string;
  sortBy?: SortBy;
  pinned?: boolean;
  tags?: string[];
  dueWithinDays?: number;
};

export type SmartFilter = {
  id: string;
  name: string;
  description?: string;
  criteria: SmartFilterCriteria;
  isDefault?: boolean;
};

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
  accentPreview: AccentPalette | null;
  smartFilters: SmartFilter[];
  activeSmartFilterId: string | null;
  isLoading: boolean;
  isSavingNote: boolean;
  isRevisionOpen: boolean;
  revisions: NoteRevisionPayload[];
  isLoadingRevisions: boolean;
  revisionTargetId: string | null;
};
