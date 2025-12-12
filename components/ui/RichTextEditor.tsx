"use client";

import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Code,
  Heading1,
  Heading2,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-muted-foreground/30 before:float-left before:pointer-events-none",
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-none min-h-[300px] leading-relaxed",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("relative group", className)}>
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
            editor.isActive("heading", { level: 1 }) &&
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
            editor.isActive("heading", { level: 2 }) &&
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
            editor.isActive("bold") && "bg-primary/10 text-primary"
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
            editor.isActive("italic") && "bg-primary/10 text-primary"
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
            editor.isActive("bulletList") && "bg-primary/10 text-primary"
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
            editor.isActive("orderedList") && "bg-primary/10 text-primary"
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
            editor.isActive("blockquote") && "bg-primary/10 text-primary"
          )}
          title="Quote"
        >
          <Quote className="size-4" />
        </Button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
