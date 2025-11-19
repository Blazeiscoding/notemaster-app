"use client";

import React from "react";
import AppHeader from "@/components/layout/AppHeader";
import AccentPicker from "@/components/layout/AccentPicker";
import InstallPromptAlert from "@/components/layout/InstallPromptAlert";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import NoteEditor from "@/components/notes/NoteEditor";
import NotesGrid from "@/components/notes/NotesGrid";
import CalendarView from "@/components/notes/CalendarView";
import NoteCardSkeleton from "@/components/notes/NoteCardSkeleton";
import SidebarPanel from "@/components/sidebar/SidebarPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNoteApp } from "@/components/note-app/hooks/useNoteAppState";
import { useKeyboardShortcuts } from "@/components/note-app/hooks/useKeyboardShortcuts";
import { ErrorState } from "@/components/ErrorState";
import { Plus, X } from "lucide-react";

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
    setQuickFilterName((prev) =>
      prev.trim() ? prev : computeDefaultFilterName()
    );
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-6 pb-36 sm:pb-16 lg:px-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-6 w-32 animate-pulse rounded-md bg-muted" />
                <div className="h-4 w-48 animate-pulse rounded-md bg-muted" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
                <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
                <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <NoteCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-6 pb-36 sm:pb-16 lg:px-8">
        <AppHeader
          userFirstName={userFirstName}
          isDark={darkMode}
          toggleTheme={() => setDarkMode(!darkMode)}
          onOpenThemePicker={() => setShowThemePanel(true)}
          onSaveSmartFilter={handleOpenSaveFilter}
          canSaveSmartFilter={canSaveSmartFilter}
          onNewNote={createNote}
          onToggleSidebar={() => setShowSidebar((prev) => !prev)}
          canInstall={canInstall}
          onInstall={installApp}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        {showIosInstallTip && (
          <InstallPromptAlert onDismiss={() => setShowIosInstallTip(false)} />
        )}

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {showSidebar && (
            <div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setShowSidebar(false)}
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
            onClearTags={() => setFilterTag("all")}
            accent={accent}
            accentPreview={accentPreview}
            onAccentPreview={handlePreviewAccent}
            onAccentPreviewEnd={handleCancelAccentPreview}
            onAccentApply={handleSelectAccent}
            accentPalettes={accentPalettes}
            smartFilters={smartFilters}
            activeSmartFilterId={activeSmartFilterId}
            canSaveSmartFilter={canSaveSmartFilter}
            currentSmartFilterCriteria={currentSmartFilterCriteria}
            onAddSmartFilter={({ name, description }) =>
              addSmartFilter({ name, description })
            }
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

          <main className="space-y-6 pb-14 sm:pb-0">
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
                onOpenHistory={() => handleOpenRevisions(currentNote.id)}
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
      {currentNote === null && (
        <div className="sm:hidden">
          <MobileBottomNav
            activeSection={activeSection}
            sectionCounts={sectionCounts}
            onSelectSection={setActiveSection}
            onOpenSidebar={() => setShowSidebar(true)}
          />
        </div>
      )}
      {showThemePanel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          onClick={handleCloseThemePanel}
        >
          <div
            className="w-full max-w-lg rounded-2xl border bg-card/95 backdrop-blur-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Choose theme</h2>
                <p className="text-sm text-muted-foreground">
                  Preview palettes and click one to apply instantly.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleCloseThemePanel}
                aria-label="Close theme picker"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="mt-4">
              <AccentPicker
                palettes={accentPalettes}
                activePaletteId={accent.id}
                previewPaletteId={accentPreview?.id ?? null}
                onPreview={handlePreviewAccent}
                onCancelPreview={handleCancelAccentPreview}
                onApply={(palette) => {
                  handleSelectAccent(palette);
                  setShowThemePanel(false);
                }}
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloseThemePanel}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {showSaveFilterDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          onClick={handleCloseSaveFilter}
        >
          <form
            className="w-full max-w-md space-y-4 rounded-2xl border bg-card/95 backdrop-blur-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200"
            onSubmit={handleSubmitQuickFilter}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Save current filter</h2>
                <p className="text-sm text-muted-foreground">
                  Name your saved search so you can reuse it later.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleCloseSaveFilter}
                aria-label="Close save filter dialog"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Input
                value={quickFilterName}
                onChange={(event) => setQuickFilterName(event.target.value)}
                placeholder="Filter name"
                aria-label="Smart filter name"
              />
              <Textarea
                value={quickFilterDescription}
                onChange={(event) =>
                  setQuickFilterDescription(event.target.value)
                }
                placeholder="Description (optional)"
                aria-label="Smart filter description"
                className="min-h-[96px]"
              />
              {quickFilterError && (
                <p className="text-sm text-destructive">{quickFilterError}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCloseSaveFilter}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!canSaveSmartFilter}>
                Save filter
              </Button>
            </div>
          </form>
        </div>
      )}
      <div className="pointer-events-none sm:hidden">
        <Button
          aria-label="Create a new note"
          variant="accent"
          size="lg"
          className="pointer-events-auto fixed right-4 z-50 h-14 rounded-full px-6 font-semibold shadow-xl shadow-(--interactive-accent)/25 transition-transform duration-200 focus-visible:ring-2 focus-visible:ring-(--accent-primary)"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 16px) + 7.5rem)" }}
          onClick={() => {
            createNote();
          }}
        >
          <Plus className="mr-2 h-5 w-5" />
          New note
        </Button>
      </div>
    </div>
  );
};

export default NoteApp;
