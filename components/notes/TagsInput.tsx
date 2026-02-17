"use client";
import React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type TagsInputProps = {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
};

const TagsInput: React.FC<TagsInputProps> = ({ tags, onAddTag, onRemoveTag }) => {
  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Tags
        </h3>
      </header>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="flex items-center gap-1 border-(--interactive-accent)/30 bg-(--interactive-accent-soft) text-(--interactive-accent) transition-colors hover:border-(--interactive-accent)/50"
          >
            #{tag}
            <button
              type="button"
              aria-label={`Remove ${tag} tag`}
              className="rounded-full p-0.5 text-(--interactive-accent) transition-colors hover:bg-(--interactive-accent)/15"
              onClick={() => onRemoveTag(tag)}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        {tags.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No tags yet. Add one below to organize this note.
          </p>
        )}
      </div>
      <Input
        placeholder="Add a tag and press Enter"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            const value = event.currentTarget.value.trim();
            if (value) {
              onAddTag(value);
              event.currentTarget.value = "";
            }
          }
        }}
      />
    </section>
  );
};

export default TagsInput;
