import { useRef, useCallback, type ChangeEvent } from "react";
import type { NotePayload, Attachment } from "@/types/note";
import { generateId, parseInputToIso } from "@/components/note-app/util";
import { useAttachmentUpload } from "./useAttachmentUpload";

type CurrentNoteState = {
  currentNote: NotePayload | null;
  setCurrentNote: React.Dispatch<React.SetStateAction<NotePayload | null>>;
};

export function useCurrentNote({ currentNote, setCurrentNote }: CurrentNoteState) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { uploadFiles, isUploading } = useAttachmentUpload();

  const triggerAttachmentPicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAttachmentsSelected = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || !currentNote) return;

      try {
        const newAttachments = await uploadFiles(files);

        if (newAttachments.length > 0) {
          setCurrentNote((prev) =>
            prev ? { ...prev, attachments: [...prev.attachments, ...newAttachments] } : prev
          );
        }
      } catch (error) {
        console.error("Failed to upload files", error);
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [currentNote, setCurrentNote, uploadFiles]
  );

  const handleRemoveAttachment = useCallback(
    (attachmentId: string) => {
      setCurrentNote((prev) =>
        prev
          ? { ...prev, attachments: prev.attachments.filter((item) => item.id !== attachmentId) }
          : prev
      );
    },
    [setCurrentNote]
  );

  const handleDownloadAttachment = useCallback((attachment: Attachment) => {
    try {
      const link = document.createElement("a");
      link.href = attachment.data;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download attachment", error);
    }
  }, []);

  const handleClearAttachments = useCallback(() => {
    setCurrentNote((prev) => (prev ? { ...prev, attachments: [] } : prev));
  }, [setCurrentNote]);

  const handleTitleChange = useCallback(
    (value: string) => {
      setCurrentNote((prev) => (prev ? { ...prev, title: value } : prev));
    },
    [setCurrentNote]
  );

  const handleContentChange = useCallback(
    (value: string) => {
      setCurrentNote((prev) => (prev ? { ...prev, content: value } : prev));
    },
    [setCurrentNote]
  );

  const handleDueDateChange = useCallback(
    (value: string) => {
      const iso = parseInputToIso(value);
      setCurrentNote((prev) => (prev ? { ...prev, dueAt: iso } : prev));
    },
    [setCurrentNote]
  );

  const handleClearDueDate = useCallback(() => {
    setCurrentNote((prev) => (prev ? { ...prev, dueAt: null } : prev));
  }, [setCurrentNote]);

  const handleCloseEditor = useCallback(() => {
    setCurrentNote(null);
  }, [setCurrentNote]);

  const addChecklistItem = useCallback(() => {
    setCurrentNote((prev) =>
      prev
        ? {
            ...prev,
            checklist: [...prev.checklist, { id: generateId(), text: "", checked: false }],
          }
        : prev
    );
  }, [setCurrentNote]);

  const markAllChecklist = useCallback(
    (checked: boolean) => {
      setCurrentNote((prev) =>
        prev
          ? { ...prev, checklist: prev.checklist.map((item) => ({ ...item, checked })) }
          : prev
      );
    },
    [setCurrentNote]
  );

  const clearCompletedChecklist = useCallback(() => {
    setCurrentNote((prev) =>
      prev ? { ...prev, checklist: prev.checklist.filter((i) => !i.checked) } : prev
    );
  }, [setCurrentNote]);

  const updateChecklistItem = useCallback(
    (itemId: string, field: "text" | "checked", value: string | boolean) => {
      setCurrentNote((prev) =>
        prev
          ? {
              ...prev,
              checklist: prev.checklist.map((item) =>
                item.id === itemId ? { ...item, [field]: value as never } : item
              ),
            }
          : prev
      );
    },
    [setCurrentNote]
  );

  const deleteChecklistItem = useCallback(
    (itemId: string) => {
      setCurrentNote((prev) =>
        prev
          ? { ...prev, checklist: prev.checklist.filter((item) => item.id !== itemId) }
          : prev
      );
    },
    [setCurrentNote]
  );

  const addTag = useCallback(
    (tag: string) => {
      if (!tag) return;
      setCurrentNote((prev) =>
        prev && !prev.tags.includes(tag) ? { ...prev, tags: [...prev.tags, tag] } : prev
      );
    },
    [setCurrentNote]
  );

  const removeTag = useCallback(
    (tag: string) => {
      setCurrentNote((prev) =>
        prev ? { ...prev, tags: prev.tags.filter((t) => t !== tag) } : prev
      );
    },
    [setCurrentNote]
  );

  return {
    fileInputRef,
    triggerAttachmentPicker,
    handleAttachmentsSelected,
    handleRemoveAttachment,
    handleDownloadAttachment,
    handleClearAttachments,
    handleTitleChange,
    handleContentChange,
    handleDueDateChange,
    handleClearDueDate,
    handleCloseEditor,
    addChecklistItem,
    markAllChecklist,
    clearCompletedChecklist,
    updateChecklistItem,
    deleteChecklistItem,
    addTag,
    removeTag,
    isUploading,
  };
}
