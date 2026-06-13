"use client";

import React from "react";
import dynamic from "next/dynamic";
import AppHeader from "@/components/layout/AppHeader";
import InstallPromptAlert from "@/components/layout/InstallPromptAlert";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { MobileFloatingButton } from "@/components/layout/MobileFloatingButton";
import NotesGrid from "@/components/notes/NotesGrid";
import SidebarPanel from "@/components/sidebar/SidebarPanel";
import { Modal } from "@/components/ui/modal";
import { LoadingSkeleton } from "@/components/note-app/LoadingSkeleton";
import { OfflineIndicator } from "@/components/ui/OfflineIndicator";
import { useNoteApp } from "@/components/note-app/hooks/useNoteAppState";
import { useKeyboardShortcuts } from "@/components/note-app/hooks/useKeyboardShortcuts";
import { ErrorState } from "@/components/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RevisionHistoryModal } from "@/components/notes/RevisionHistoryModal";
import type { AccentPalette } from "@/types/note";


// Dynamic imports for code splitting - only load when needed
const NoteEditor = dynamic(() => import("@/components/notes/NoteEditor"), {
  loading: () => (
    <div className="min-h-125 animate-pulse rounded-lg bg-muted" />
  ),
});

const CalendarView = dynamic(() => import("@/components/notes/CalendarView"), {
  loading: () => (
    <div className="min-h-150 animate-pulse rounded-lg bg-muted" />
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
    openNote,
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
    handleTitleChange,
    handleContentChange,
    handleCloseEditor,
    showCloseConfirmation,
    confirmClose,
    cancelClose,
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
    handleOpenRevisions,
    handleCloseRevisions,
    handleRestoreRevision,
    revisions,
    isRevisionOpen,
    isLoadingRevisions,
    isRestoringRevision,
  } = state;

  const [showThemePanel, setShowThemePanel] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"grid" | "calendar">("grid");
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Delete forever confirmation state
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);

  const handleDeleteForeverRequest = React.useCallback((id: string) => {
    setPendingDeleteId(id);
  }, []);

  const handleConfirmDelete = React.useCallback(() => {
    if (pendingDeleteId) {
      deleteForever(pendingDeleteId);
      setPendingDeleteId(null);
    }
  }, [pendingDeleteId, deleteForever]);

  const handleCancelDelete = React.useCallback(() => {
    setPendingDeleteId(null);
  }, []);

  // Pre-compute tag counts for SidebarPanel to avoid passing the full notes array
  const notesCountByTag = React.useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach((note) => {
      note.tags.forEach((tag) => {
        counts[tag] = (counts[tag] ?? 0) + 1;
      });
    });
    return counts;
  }, [notes]);

  const noteIds = React.useMemo(() => new Set(notes.map((note) => note.id)), [notes]);
  const currentNoteId = currentNote?.id ?? null;

  // Memoize history visibility check using O(1) lookups
  const canViewHistory = React.useMemo(
    () =>
      isAuthenticated &&
      currentNoteId !== null &&
      noteIds.has(currentNoteId),
    [isAuthenticated, noteIds, currentNoteId]
  );

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



  const handleCloseThemePanel = React.useCallback(() => {
    handleCancelAccentPreview();
    setShowThemePanel(false);
  }, [handleCancelAccentPreview]);

  // Memoized callbacks for better performance
  const handleToggleTheme = React.useCallback(
    () => setDarkMode((prev) => !prev),
    [setDarkMode]
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
            totalNotesCount={notes.length}
            notesCountByTag={notesCountByTag}
            onTagSelect={setFilterTag}
            onClearTags={handleClearTags}
          />

          <main className="space-y-6">
            {currentNote ? (
              <NoteEditor
                note={currentNote}
                isSaving={isSavingNote}
                canViewHistory={canViewHistory}
                historyTitle={
                  isAuthenticated
                    ? "View revision history"
                    : "Sign in to see revision history"
                }
                onClose={handleCloseEditor}
                onOpenHistory={handleOpenRevisionsCallback}
                onSave={saveCurrentNote}
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
                onOpenNote={openNote}
                onPin={togglePin}
                onArchive={archiveNote}
                onTrash={trashNote}
                onUnarchive={unarchiveNote}
                onRestoreFromBin={restoreFromBin}
                onDeleteForever={handleDeleteForeverRequest}
              />
            ) : (
              <CalendarView notes={sortedNotes} onOpenNote={openNote} />
            )}
          </main>
        </div>
      </div>

      {/* Theme Picker Modal */}
      <Modal
        open={showThemePanel}
        onClose={handleCloseThemePanel}
        title="Choose Theme"
        description="Select your preferred accent color palette"
      >
        <AccentPicker
          palettes={accentPalettes}
          activePaletteId={accent.id}
          previewPaletteId={accentPreview?.id}
          onPreview={handlePreviewAccent}
          onCancelPreview={handleCancelAccentPreview}
          onApply={handleApplyAccent}
        />
      </Modal>

      {/* Unsaved Changes Confirmation */}
      <ConfirmDialog
        open={showCloseConfirmation}
        onConfirm={confirmClose}
        onCancel={cancelClose}
        title="Discard unsaved changes?"
        description="You have unsaved changes that will be lost if you close the editor."
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        variant="danger"
      />

      {/* Delete Forever Confirmation */}
      <ConfirmDialog
        open={pendingDeleteId !== null}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        title="Delete note permanently?"
        description="This note will be permanently deleted and cannot be recovered."
        confirmLabel="Delete Forever"
        cancelLabel="Cancel"
        variant="danger"
      />

      <RevisionHistoryModal
        open={isRevisionOpen}
        isLoading={isLoadingRevisions || isRestoringRevision}
        revisions={revisions}
        onClose={handleCloseRevisions}
        onRestore={(revisionId) => {
          if (currentNote) {
            void handleRestoreRevision(currentNote.id, revisionId);
          }
        }}
      />

      {/* Mobile Bottom Navigation - visible only on mobile */}
      <div className="lg:hidden">
        <MobileFloatingButton onCreateNote={createNote} />
        <MobileBottomNav
          activeSection={activeSection}
          sectionCounts={sectionCounts}
          onSelectSection={setActiveSection}
          onOpenSidebar={handleOpenSidebar}
        />
      </div>
    </div>
  );
};

export default NoteApp;
