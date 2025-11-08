"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CalendarClock,
  Check,
  Clock,
  Eye,
  EyeOff,
  Folder,
  History,
  Loader2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import Checklist from "./Checklist";
import TagsInput from "./TagsInput";
import AttachmentsList from "./AttachmentsList";
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
  showPreview: boolean;
  isSaving: boolean;
  canViewHistory: boolean;
  historyTitle: string;
  notebooksById: Map<string, NotebookPayload>;
  notebookOptions: NotebookOption[];
  dueDateValue: string;
  onClose: () => void;
  onTogglePreview: () => void;
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
  showPreview,
  isSaving,
  canViewHistory,
  historyTitle,
  notebooksById,
  notebookOptions,
  dueDateValue,
  onClose,
  onTogglePreview,
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

  return (
    <Card className="border bg-card/60 backdrop-blur animate-in fade-in slide-in-from-bottom-4">
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 space-y-3">
          <Input
            value={note.title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Title"
            className="border-none px-0 text-xl font-semibold focus-visible:ring-0"
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
            <Button variant="outline" size="sm" onClick={onTogglePreview}>
              {showPreview ? (
                <>
                  <EyeOff className="size-4" />
                  Editor
                </>
              ) : (
                <>
                  <Eye className="size-4" />
                  Preview
                </>
              )}
            </Button>
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
            <select
              value={note.notebookId ?? ""}
              onChange={(event) =>
                onNotebookChange(event.target.value ? event.target.value : null)
              }
              className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:border-(--accent-primary) focus:outline-none focus:ring-2 focus:ring-(--accent-primary)/50"
            >
              <option value="">Inbox</option>
              {notebookOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
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

        {showPreview ? (
          <div className="rounded-2xl border bg-muted/40 p-4">
            <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {note.content.trim().length > 0
                  ? note.content
                  : "_Nothing to preview yet. Start writing in the editor._"}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <Textarea
            value={note.content}
            onChange={(event) => onContentChange(event.target.value)}
            placeholder="Capture your thoughts..."
            className="min-h-[240px] resize-y border-none bg-transparent px-0 text-base focus-visible:ring-0"
          />
        )}

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
