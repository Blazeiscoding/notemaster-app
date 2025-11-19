"use client";

import React from "react";
import {
  CalendarClock,
  Check,
  Clock,
  Folder,
  History,
  Loader2,
  X,
  Download,
  FileDown,
  Printer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import Checklist from "./Checklist";
import TagsInput from "./TagsInput";
import AttachmentsList from "./AttachmentsList";
import { exportNoteToMarkdown, exportNoteToPDF, printNote } from "@/lib/export-utils";
import type {
  Attachment,
  NotePayload,
  NotebookPayload,
} from "@/types/note";

type NotebookOption = {
  id: string;
  label: string;
};

type NoteEditorProps = {
  note: NotePayload;
  isSaving: boolean;
  canViewHistory: boolean;
  historyTitle: string;
  notebooksById: Map<string, NotebookPayload>;
  notebookOptions: NotebookOption[];
  dueDateValue: string;
  onClose: () => void;
  onOpenHistory: () => void;
  onSave: () => void;
  onNotebookChange: (notebookId: string | null) => void;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onClearDueDate: () => void;
  onAddChecklistItem: () => void;
  onMarkAllChecklist: (checked: boolean) => void;
  onClearCompletedChecklist: () => void;
  onUpdateChecklistItem: (
    itemId: string,
    field: "text" | "checked",
    value: string | boolean,
  ) => void;
  onDeleteChecklistItem: (itemId: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onTriggerAttachmentPicker: () => void;
  onDownloadAttachment: (attachment: Attachment) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onClearAttachments: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFilesSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  isSaving,
  canViewHistory,
  historyTitle,
  notebooksById,
  notebookOptions,
  dueDateValue,
  onClose,
  onOpenHistory,
  onSave,
  onNotebookChange,
  onTitleChange,
  onContentChange,
  onDueDateChange,
  onClearDueDate,
  onAddChecklistItem,
  onMarkAllChecklist,
  onClearCompletedChecklist,
  onUpdateChecklistItem,
  onDeleteChecklistItem,
  onAddTag,
  onRemoveTag,
  onTriggerAttachmentPicker,
  onDownloadAttachment,
  onRemoveAttachment,
  onClearAttachments,
  fileInputRef,
  onFilesSelected,
}) => {
  const notebookName = note.notebookId
    ? notebooksById.get(note.notebookId)?.name ?? "Notebook"
    : "Inbox";

  const handleExportMarkdown = () => {
    const markdown = exportNoteToMarkdown(note);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${note.title || "note"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    await exportNoteToPDF(note);
  };

  const handlePrint = () => {
    printNote(note);
  };

  return (
    <Card className="border bg-card/95 backdrop-blur-sm shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
        <div className="flex-1 space-y-3">
          <Input
            value={note.title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Title"
            className="border-none px-0 text-xl font-semibold focus-visible:ring-0 placeholder:text-muted-foreground/50"
          />
          <CardDescription className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Clock className="size-3.5" />
              Edited {new Date(note.updatedAt).toLocaleString()}
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Folder className="size-3.5" />
              {notebookName}
            </span>
            {note.dueAt && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <CalendarClock className="size-3.5" />
                Due {new Date(note.dueAt).toLocaleString()}
              </span>
            )}
          </CardDescription>
        </div>
        <div className="flex w-full flex-col items-end gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenHistory}
              disabled={!canViewHistory}
              title={historyTitle}
            >
              <History className="size-4" />
              History
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={handleExportMarkdown}
                title="Export as Markdown"
              >
                <FileDown className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={handleExportPDF}
                title="Export as PDF"
              >
                <Download className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={handlePrint}
                title="Print"
              >
                <Printer className="size-4" />
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose}>
              <X className="size-4" />
              Close
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="bg-(--accent-primary) text-white hover:bg-(--accent-secondary)"
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {isSaving ? "Saving" : "Save"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notebook
            </label>
            <Select
              value={note.notebookId ?? ""}
              onChange={(event) =>
                onNotebookChange(event.target.value ? event.target.value : null)
              }
              className="w-full"
            >
              <option value="">Inbox</option>
              {notebookOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Reminder
            </label>
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={dueDateValue}
                onChange={(event) => onDueDateChange(event.target.value)}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:border-(--accent-primary) focus:outline-none focus:ring-2 focus:ring-(--accent-primary)/50"
              />
              {note.dueAt && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={onClearDueDate}
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Textarea
            value={note.content}
            onChange={(event) => onContentChange(event.target.value)}
            placeholder="Capture your thoughts..."
            className="min-h-[400px] resize-y text-base leading-relaxed placeholder:text-muted-foreground/50"
          />
          <div className="flex items-center justify-end gap-4 text-xs text-muted-foreground">
            <span>
              {note.content.trim()
                ? `${note.content.trim().split(/\s+/).filter(Boolean).length} words`
                : "0 words"}
            </span>
            <span>{note.content.length} characters</span>
          </div>
        </div>

        <Checklist
          items={note.checklist}
          onAddItem={onAddChecklistItem}
          onMarkAll={onMarkAllChecklist}
          onClearCompleted={onClearCompletedChecklist}
          onUpdateItem={onUpdateChecklistItem}
          onDeleteItem={onDeleteChecklistItem}
        />

        <TagsInput tags={note.tags} onAddTag={onAddTag} onRemoveTag={onRemoveTag} />

        <AttachmentsList
          attachments={note.attachments}
          onTriggerPicker={onTriggerAttachmentPicker}
          onDownload={onDownloadAttachment}
          onRemove={onRemoveAttachment}
          onClearAll={onClearAttachments}
          fileInputRef={fileInputRef}
          onFilesSelected={onFilesSelected}
        />
      </CardContent>
    </Card>
  );
};

export default NoteEditor;
