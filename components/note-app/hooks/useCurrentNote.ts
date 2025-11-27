import { useRef, useCallback, type ChangeEvent } from "react";
import type { NotePayload, Attachment } from "@/types/note";
import { generateId, toBase64, parseInputToIso } from "@/components/note-app/util";

type CurrentNoteState = {
  currentNote: NotePayload | null;
  setCurrentNote: React.Dispatch<React.SetStateAction<NotePayload | null>>;
};

interface ImageKitUploadResult {
  fileId: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  height: number;
  width: number;
  size: number;
  filePath: string;
  tags?: string[];
  isPrivateFile?: boolean;
  customCoordinates?: string | null;
  metadata?: unknown;
  fileType: string;
}

export function useCurrentNote({ currentNote, setCurrentNote }: CurrentNoteState) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const triggerAttachmentPicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAttachmentsSelected = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || !currentNote) return;

      try {
        const ImageKit = (await import("imagekit-javascript")).default;
        const imagekit = new ImageKit({
          publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
          urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
        });

        const attachments: Attachment[] = [];
        for (const file of Array.from(files)) {
          // Only process images
          if (!file.type.startsWith("image/")) continue;

          // Manually fetch authentication parameters
          const authResponse = await fetch("/api/auth/imagekit");
          if (!authResponse.ok) {
            throw new Error("Failed to fetch authentication parameters");
          }
          const authData = await authResponse.json();
          const { token, signature, expire } = authData;

          const uploadResult = await new Promise<ImageKitUploadResult>((resolve, reject) => {
            imagekit.upload(
              {
                file,
                fileName: file.name,
                tags: ["note-attachment"],
                token,
                signature,
                expire,
              },
              (err: Error | null, result: ImageKitUploadResult | null) => {
                if (err) reject(err);
                else if (result) resolve(result);
                else reject(new Error("Upload failed"));
              }
            );
          });

          attachments.push({
            id: generateId(),
            name: file.name,
            type: file.type,
            size: file.size,
            data: uploadResult.url, // Store the URL instead of base64
          });
        }

        if (attachments.length > 0) {
          setCurrentNote({
            ...currentNote,
            attachments: [...currentNote.attachments, ...attachments],
          });
        }
      } catch (error) {
        console.error("Failed to upload files to ImageKit", error);
        // Optionally show a toast error here
      } finally {
        event.target.value = "";
      }
    },
    [currentNote, setCurrentNote]
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

  const handleNotebookChange = useCallback(
    (notebookId: string | null) => {
      setCurrentNote((prev) => (prev ? { ...prev, notebookId } : prev));
    },
    [setCurrentNote]
  );

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
    handleNotebookChange,
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
  };
}

