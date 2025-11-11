"use client";

import React from "react";
import AppHeader from "@/components/layout/AppHeader";
import InstallPromptAlert from "@/components/layout/InstallPromptAlert";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import NoteEditor from "@/components/notes/NoteEditor";
import NotesGrid from "@/components/notes/NotesGrid";
import SidebarPanel from "@/components/sidebar/SidebarPanel";
import { Button } from "@/components/ui/button";
import { formatDateTimeForInput } from "@/components/note-app/util";
import { useNoteApp } from "@/components/note-app/hooks/useNoteAppState";
import { Plus } from "lucide-react";

const NoteApp = () => {
  const state = useNoteApp();

  const {
    isLoading,
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
    canInstall,
    installApp,
    showIosInstallTip,
    setShowIosInstallTip,
    showPreview,
    togglePreview,
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
    handleDueDateChange,
    handleClearDueDate,
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
    activeNotebookId,
    handleSelectNotebookFilter,
    handleDeleteNotebook,
    handleOpenRevisions,
  } = state;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="mt-4 text-gray-600">Loading your notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-6 pb-36 sm:pb-16 lg:px-8">
        <AppHeader
          userFirstName={userFirstName}
          onToggleSidebar={() => setShowSidebar((prev) => !prev)}
          canInstall={canInstall}
          onInstall={installApp}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((prev) => !prev)}
          onCreateNote={createNote}
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
            onClose={() => setShowSidebar(false)}
            sortBy={sortBy}
            onSortChange={setSortBy}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
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
            activeNotebookId={activeNotebookId}
            onSelectNotebookFilter={handleSelectNotebookFilter}
            onDeleteNotebook={handleDeleteNotebook}
          />

          <main className="space-y-6 pb-14 sm:pb-0">
            {currentNote ? (
              <NoteEditor
                note={currentNote}
                showPreview={showPreview}
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
                dueDateValue={formatDateTimeForInput(currentNote.dueAt)}
                onClose={handleCloseEditor}
                onTogglePreview={togglePreview}
                onOpenHistory={() => handleOpenRevisions(currentNote.id)}
                onSave={saveCurrentNote}
                onNotebookChange={handleNotebookChange}
                onTitleChange={handleTitleChange}
                onContentChange={handleContentChange}
                onDueDateChange={handleDueDateChange}
                onClearDueDate={handleClearDueDate}
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
            ) : (
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
