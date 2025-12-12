"use client";

import React from "react";
import dynamic from "next/dynamic";
import AppHeader from "@/components/layout/AppHeader";
import InstallPromptAlert from "@/components/layout/InstallPromptAlert";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { MobileFloatingButton } from "@/components/layout/MobileFloatingButton";
import NotesGrid from "@/components/notes/NotesGrid";
import SidebarPanel from "@/components/sidebar/SidebarPanel";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { LoadingSkeleton } from "@/components/note-app/LoadingSkeleton";
import { SaveFilterForm } from "@/components/note-app/SaveFilterForm";
import { OfflineIndicator } from "@/components/ui/OfflineIndicator";
import { useNoteApp } from "@/components/note-app/hooks/useNoteAppState";
import { useKeyboardShortcuts } from "@/components/note-app/hooks/useKeyboardShortcuts";
import { ErrorState } from "@/components/ErrorState";
import type { AccentPalette } from "@/types/note";


// Dynamic imports for code splitting - only load when needed
const NoteEditor = dynamic(() => import("@/components/notes/NoteEditor"), {
  loading: () => (
    <div className="min-h-[500px] animate-pulse rounded-lg bg-muted" />
  ),
});

const CalendarView = dynamic(() => import("@/components/notes/CalendarView"), {
  loading: () => (
    <div className="min-h-[600px] animate-pulse rounded-lg bg-muted" />
  ),
});

const AccentPicker = dynamic(() => import("@/components/layout/AccentPicker"), {
  ssr: false,
});

const NoteApp = () => {
  const state = useNoteApp();

  const {
    isLoading,
    dataError,
    retryLoadData,
    userFirstName,
    isAuthenticated,
    darkMode,
    setDarkMode,
    notes,
    sortedNotes,
    currentNote,
    setCurrentNote,
    showSidebar,
    setShowSidebar,
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
    activeSection,
    setActiveSection,
    sectionCounts,
    filterTag,
    setFilterTag,
    allTags,
    accent,
    accentPreview,
    handlePreviewAccent,
    handleCancelAccentPreview,
    accentPalettes,
    handleSelectAccent,
    smartFilters,
    activeSmartFilterId,
    currentSmartFilterCriteria,
    canSaveSmartFilter,
    addSmartFilter,
    applySmartFilter,
    removeSmartFilter,
    canInstall,
    installApp,
    showIosInstallTip,
    setShowIosInstallTip,
    createNote,
    saveCurrentNote,
    isSavingNote,
    triggerAttachmentPicker,
    handleAttachmentsSelected,
    handleRemoveAttachment,
    handleDownloadAttachment,
    handleClearAttachments,
    handleNotebookChange,
    handleTitleChange,
    handleContentChange,
    handleCloseEditor,
    fileInputRef,
    addChecklistItem,
    markAllChecklist,
    clearCompletedChecklist,
    updateChecklistItem,
    deleteChecklistItem,
    addTag,
    removeTag,
    togglePin,
    archiveNote,
    unarchiveNote,
    trashNote,
    restoreFromBin,
    deleteForever,
    exportNotes,
    importNotes,
    notebooks,
    notebookTree,
    notebooksById,
    notebookOptions,
    newNotebookName,
    setNewNotebookName,
    newNotebookParent,
    setNewNotebookParent,
    isCreatingNotebook,
    handleCreateNotebook,
    handleCreateNotebookChild,
    handleRenameNotebook,
    handleMoveNotebook,
    activeNotebookId,
    handleSelectNotebookFilter,
    handleDeleteNotebook,
    handleOpenRevisions,
  } = state;

  const [showThemePanel, setShowThemePanel] = React.useState(false);
  const [showSaveFilterDialog, setShowSaveFilterDialog] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"grid" | "calendar">("grid");
  const [quickFilterName, setQuickFilterName] = React.useState("");
  const [quickFilterDescription, setQuickFilterDescription] =
    React.useState("");
  const [quickFilterError, setQuickFilterError] = React.useState<string | null>(
    null
  );
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onCreateNote: createNote,
    onSaveNote: saveCurrentNote,
    onCloseEditor: handleCloseEditor,
    onFocusSearch: () => {
      searchInputRef.current?.focus();
    },
    currentNote,
    isSaving: isSavingNote,
  });

  const computeDefaultFilterName = React.useCallback(() => {
    const base = "Smart filter";
    const existing = new Set(
      smartFilters.map((filter) => filter.name.toLowerCase())
    );
    if (!existing.has(base.toLowerCase())) return base;
    let suffix = 2;
    let candidate = `${base} ${suffix}`;
    while (existing.has(candidate.toLowerCase())) {
      suffix += 1;
      candidate = `${base} ${suffix}`;
    }
    return candidate;
  }, [smartFilters]);

  const handleOpenSaveFilter = React.useCallback(() => {
    setQuickFilterError(null);
    setQuickFilterDescription("");
    setQuickFilterName(computeDefaultFilterName());
    setShowSaveFilterDialog(true);
  }, [computeDefaultFilterName]);

  const handleCloseSaveFilter = React.useCallback(() => {
    setShowSaveFilterDialog(false);
    setQuickFilterError(null);
    setQuickFilterDescription("");
    setQuickFilterName("");
  }, []);

  const handleSubmitQuickFilter = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = quickFilterName.trim();
      if (!trimmed) {
        setQuickFilterError("Give your filter a name.");
        return;
      }
      const success = addSmartFilter({
        name: trimmed,
        description: quickFilterDescription.trim() || undefined,
      });
      if (!success) {
        setQuickFilterError("Unable to save filter. Try a different name.");
        return;
      }
      handleCloseSaveFilter();
    },
    [
      addSmartFilter,
      handleCloseSaveFilter,
      quickFilterDescription,
      quickFilterName,
    ]
  );

  const handleCloseThemePanel = React.useCallback(() => {
    handleCancelAccentPreview();
    setShowThemePanel(false);
  }, [handleCancelAccentPreview]);

  // Memoized callbacks for better performance
  const handleToggleTheme = React.useCallback(
    () => setDarkMode(!darkMode),
    [darkMode, setDarkMode]
  );
  const handleOpenThemePicker = React.useCallback(
    () => setShowThemePanel(true),
    []
  );
  const handleToggleSidebar = React.useCallback(
    () => setShowSidebar((prev) => !prev),
    [setShowSidebar]
  );
  const handleCloseSidebar = React.useCallback(
    () => setShowSidebar(false),
    [setShowSidebar]
  );
  const handleDismissIosTip = React.useCallback(
    () => setShowIosInstallTip(false),
    [setShowIosInstallTip]
  );
  const handleClearTags = React.useCallback(
    () => setFilterTag("all"),
    [setFilterTag]
  );
  const handleAddSmartFilter = React.useCallback(
    ({ name, description }: { name: string; description?: string }) =>
      addSmartFilter({ name, description }),
    [addSmartFilter]
  );
  const handleOpenRevisionsCallback = React.useCallback(
    () => currentNote && handleOpenRevisions(currentNote.id),
    [currentNote, handleOpenRevisions]
  );
  const handleOpenSidebar = React.useCallback(
    () => setShowSidebar(true),
    [setShowSidebar]
  );
  const handleApplyAccent = React.useCallback(
    (palette: AccentPalette) => {
      handleSelectAccent(palette);
      setShowThemePanel(false);
    },
    [handleSelectAccent]
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (dataError && isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <ErrorState
          title="Failed to load your notes"
          message={dataError}
          onRetry={retryLoadData}
          retryLabel="Retry"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <OfflineIndicator />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-6 pb-36 sm:pb-16 lg:px-8">
        <AppHeader
          userFirstName={userFirstName}
          isDark={darkMode}
          toggleTheme={handleToggleTheme}
          onOpenThemePicker={handleOpenThemePicker}
          onSaveSmartFilter={handleOpenSaveFilter}
          canSaveSmartFilter={canSaveSmartFilter}
          onNewNote={createNote}
          onToggleSidebar={handleToggleSidebar}
          canInstall={canInstall}
          onInstall={installApp}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        {showIosInstallTip && (
          <InstallPromptAlert onDismiss={handleDismissIosTip} />
        )}

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {showSidebar && (
            <div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={handleCloseSidebar}
            />
          )}

          <SidebarPanel
            show={showSidebar}
            sortBy={sortBy}
            onSortChange={setSortBy}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchInputRef={searchInputRef}
            activeSection={activeSection}
            sectionCounts={sectionCounts}
            onSectionChange={setActiveSection}
            filterTag={filterTag}
            tags={allTags}
            notes={notes}
            onTagSelect={setFilterTag}
            onClearTags={handleClearTags}

            smartFilters={smartFilters}
            activeSmartFilterId={activeSmartFilterId}
            canSaveSmartFilter={canSaveSmartFilter}
            currentSmartFilterCriteria={currentSmartFilterCriteria}
            onAddSmartFilter={handleAddSmartFilter}
            onApplySmartFilter={applySmartFilter}
            onRemoveSmartFilter={removeSmartFilter}
            onExport={exportNotes}
            onImport={importNotes}
            notebooks={notebooks}
            notebookTree={notebookTree}
            newNotebookName={newNotebookName}
            newNotebookParent={newNotebookParent}
            isCreatingNotebook={isCreatingNotebook}
            onNotebookNameChange={setNewNotebookName}
            onNotebookParentChange={setNewNotebookParent}
            onCreateNotebook={handleCreateNotebook}
            onQuickAddNotebook={handleCreateNotebookChild}
            onRenameNotebook={handleRenameNotebook}
            onMoveNotebook={handleMoveNotebook}
            activeNotebookId={activeNotebookId}
            onSelectNotebookFilter={handleSelectNotebookFilter}
            onDeleteNotebook={handleDeleteNotebook}
          />

          <main className="space-y-6">
            {currentNote ? (
              <NoteEditor
                note={currentNote}
                isSaving={isSavingNote}
                canViewHistory={
                  isAuthenticated &&
                  notes.some((noteItem) => noteItem.id === currentNote.id)
                }
                historyTitle={
                  isAuthenticated
                    ? "View revision history"
                    : "Sign in to see revision history"
                }
                notebooksById={notebooksById}
                notebookOptions={notebookOptions}
                onClose={handleCloseEditor}
                onOpenHistory={handleOpenRevisionsCallback}
                onSave={saveCurrentNote}
                onNotebookChange={handleNotebookChange}
                onTitleChange={handleTitleChange}
                onContentChange={handleContentChange}
                onAddChecklistItem={addChecklistItem}
                onMarkAllChecklist={markAllChecklist}
                onClearCompletedChecklist={clearCompletedChecklist}
                onUpdateChecklistItem={updateChecklistItem}
                onDeleteChecklistItem={deleteChecklistItem}
                onAddTag={addTag}
                onRemoveTag={removeTag}
                onTriggerAttachmentPicker={triggerAttachmentPicker}
                onDownloadAttachment={handleDownloadAttachment}
                onRemoveAttachment={handleRemoveAttachment}
                onClearAttachments={handleClearAttachments}
                fileInputRef={fileInputRef}
                onFilesSelected={handleAttachmentsSelected}
              />
            ) : viewMode === "grid" ? (
              <NotesGrid
                notes={sortedNotes}
                activeSection={activeSection}
                onCreateNote={createNote}
                onOpenNote={setCurrentNote}
                onPin={togglePin}
                onArchive={archiveNote}
                onTrash={trashNote}
                onUnarchive={unarchiveNote}
                onRestoreFromBin={restoreFromBin}
                onDeleteForever={deleteForever}
              />
            ) : (
              <CalendarView notes={sortedNotes} onOpenNote={setCurrentNote} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default NoteApp;
