"use client";

import React, { useCallback, useRef, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Image from "@tiptap/extension-image";
import { common, createLowlight } from "lowlight";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Code2,
  Heading1,
  Heading2,
  Quote,
  ImagePlus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Create lowlight instance - lazy loaded
let lowlightInstance: ReturnType<typeof createLowlight> | null = null;
const getLowlight = () => {
  if (!lowlightInstance) {
    lowlightInstance = createLowlight(common);
  }
  return lowlightInstance;
};

// Supported languages for the dropdown
const LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "css", label: "CSS" },
  { value: "html", label: "HTML" },
  { value: "json", label: "JSON" },
  { value: "bash", label: "Bash" },
  { value: "sql", label: "SQL" },
  { value: "markdown", label: "Markdown" },
  { value: "plaintext", label: "Plain Text" },
];

type RichTextEditorProps = {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = "Start typing...",
  className,
}) => {
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image upload function using ImageKit
  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    try {
      // Get auth params from ImageKit
      const authResponse = await fetch("/api/auth/imagekit");
      if (!authResponse.ok) throw new Error("Failed to get upload auth");
      const authParams = await authResponse.json();

      const ImageKit = (await import("imagekit-javascript")).default;
      const imagekit = new ImageKit({
        publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
        urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
      });

      return new Promise((resolve, reject) => {
        imagekit.upload(
          {
            file,
            fileName: `note-image-${Date.now()}-${file.name}`,
            folder: "/note-images",
            ...authParams,
          },
          (err: Error | null, result: { url?: string } | null) => {
            if (err) reject(err);
            else resolve(result?.url || null);
          }
        );
      });
    } catch (error) {
      console.error("Image upload failed:", error);
      return null;
    }
  }, []);

  // Handle image file selection
  const handleImageSelect = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 10 * 1024 * 1024) {
        alert("Image must be less than 10MB");
        return;
      }

      setIsUploading(true);
      const url = await uploadImage(file);
      setIsUploading(false);

      if (url && editor) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    },
    [uploadImage]
  );

  // Handle paste event for images
  const handlePaste = useCallback(
    (view: unknown, event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return false;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          event.preventDefault();
          const file = item.getAsFile();
          if (file) {
            handleImageSelect(file);
            return true;
          }
        }
      }
      return false;
    },
    [handleImageSelect]
  );

  // Handle drop event for images
  const handleDrop = useCallback(
    (view: unknown, event: DragEvent) => {
      const files = event.dataTransfer?.files;
      if (!files || files.length === 0) return false;

      for (const file of files) {
        if (file.type.startsWith("image/")) {
          event.preventDefault();
          handleImageSelect(file);
          return true;
        }
      }
      return false;
    },
    [handleImageSelect]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
        // Disable the default code block in favor of CodeBlockLowlight
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-muted-foreground/30 before:float-left before:pointer-events-none",
      }),
      CodeBlockLowlight.configure({
        lowlight: getLowlight(),
        defaultLanguage: "plaintext",
        HTMLAttributes: {
          class: "not-prose",
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "rounded-lg max-w-full h-auto shadow-md my-4",
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-none min-h-[300px] leading-relaxed",
      },
      handlePaste,
      handleDrop,
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  // Trigger file input for image upload
  const handleImageButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle file input change
  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleImageSelect(file);
      }
      // Reset input so same file can be selected again
      event.target.value = "";
    },
    [handleImageSelect]
  );

  // Track editor state changes for toolbar updates
  // The editor instance itself is stable, but we derive state from it
  const isInCodeBlock = editor?.isActive("codeBlock") ?? false;
  const toolbarConfig = {
    heading1Active: editor?.isActive("heading", { level: 1 }) ?? false,
    heading2Active: editor?.isActive("heading", { level: 2 }) ?? false,
    boldActive: editor?.isActive("bold") ?? false,
    italicActive: editor?.isActive("italic") ?? false,
    bulletListActive: editor?.isActive("bulletList") ?? false,
    orderedListActive: editor?.isActive("orderedList") ?? false,
    blockquoteActive: editor?.isActive("blockquote") ?? false,
    codeBlockLanguage: editor?.getAttributes("codeBlock").language || "plaintext",
  };

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("relative group", className)}>
      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Floating Toolbar on top (visible on hover or focus) */}
      <div className="mb-2 flex flex-wrap items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={cn(
            "h-8 w-8",
            toolbarConfig.heading1Active &&
              "bg-primary/10 text-primary"
          )}
          title="Heading 1"
        >
          <Heading1 className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={cn(
            "h-8 w-8",
            toolbarConfig.heading2Active &&
              "bg-primary/10 text-primary"
          )}
          title="Heading 2"
        >
          <Heading2 className="size-4" />
        </Button>
        <div className="mx-1 h-4 w-px bg-border" />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "h-8 w-8",
            toolbarConfig.boldActive && "bg-primary/10 text-primary"
          )}
          title="Bold"
        >
          <Bold className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "h-8 w-8",
            toolbarConfig.italicActive && "bg-primary/10 text-primary"
          )}
          title="Italic"
        >
          <Italic className="size-4" />
        </Button>
        <div className="mx-1 h-4 w-px bg-border" />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            "h-8 w-8",
            toolbarConfig.bulletListActive && "bg-primary/10 text-primary"
          )}
          title="Bullet List"
        >
          <List className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            "h-8 w-8",
            toolbarConfig.orderedListActive && "bg-primary/10 text-primary"
          )}
          title="Ordered List"
        >
          <ListOrdered className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn(
            "h-8 w-8",
            toolbarConfig.blockquoteActive && "bg-primary/10 text-primary"
          )}
          title="Quote"
        >
          <Quote className="size-4" />
        </Button>
        <div className="mx-1 h-4 w-px bg-border" />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={cn(
            "h-8 w-8",
            isInCodeBlock && "bg-primary/10 text-primary"
          )}
          title="Code Block"
        >
          <Code2 className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleImageButtonClick}
          disabled={isUploading}
          className="h-8 w-8"
          title="Insert Image"
        >
          {isUploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
        </Button>

        {/* Language selector when in code block */}
        {isInCodeBlock && (
          <>
            <div className="mx-1 h-4 w-px bg-border" />
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              value={toolbarConfig.codeBlockLanguage}
              onChange={(e) => {
                editor
                  .chain()
                  .focus()
                  .updateAttributes("codeBlock", { language: e.target.value })
                  .run();
              }}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
