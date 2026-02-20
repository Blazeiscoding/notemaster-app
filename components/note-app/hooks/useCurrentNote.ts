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
          setCurrentNote({
            ...currentNote,
            attachments: [...currentNote.attachments, ...newAttachments],
          });
        }
      } catch (error) {
        console.error("Failed to upload files", error);
        // Optionally show a toast error here
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
      if (!currentNote) return;
      setCurrentNote({
        ...currentNote,
        attachments: currentNote.attachments.filter(
          (item) => item.id !== attachmentId
        ),
      });
    },
    [currentNote, setCurrentNote]
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
    if (currentNote) {
      setCurrentNote({
        ...currentNote,
        checklist: [
          ...currentNote.checklist,
          { id: generateId(), text: "", checked: false },
        ],
      });
    }
  }, [currentNote, setCurrentNote]);

  const markAllChecklist = useCallback(
    (checked: boolean) => {
      if (currentNote) {
        setCurrentNote({
          ...currentNote,
          checklist: currentNote.checklist.map((item) => ({
            ...item,
            checked,
          })),
        });
      }
    },
    [currentNote, setCurrentNote]
  );

  const clearCompletedChecklist = useCallback(() => {
    if (currentNote) {
      setCurrentNote({
        ...currentNote,
        checklist: currentNote.checklist.filter((i) => !i.checked),
      });
    }
  }, [currentNote, setCurrentNote]);

  const updateChecklistItem = useCallback(
    (itemId: string, field: "text" | "checked", value: string | boolean) => {
      if (currentNote) {
        setCurrentNote({
          ...currentNote,
          checklist: currentNote.checklist.map((item) =>
            item.id === itemId ? { ...item, [field]: value as never } : item
          ),
        });
      }
    },
    [currentNote, setCurrentNote]
  );

  const deleteChecklistItem = useCallback(
    (itemId: string) => {
      if (currentNote) {
        setCurrentNote({
          ...currentNote,
          checklist: currentNote.checklist.filter((item) => item.id !== itemId),
        });
      }
    },
    [currentNote, setCurrentNote]
  );

  const addTag = useCallback(
    (tag: string) => {
      if (currentNote && tag && !currentNote.tags.includes(tag)) {
        setCurrentNote({
          ...currentNote,
          tags: [...currentNote.tags, tag],
        });
      }
    },
    [currentNote, setCurrentNote]
  );

  const removeTag = useCallback(
    (tag: string) => {
      if (currentNote) {
        setCurrentNote({
          ...currentNote,
          tags: currentNote.tags.filter((t) => t !== tag),
        });
      }
    },
    [currentNote, setCurrentNote]
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

