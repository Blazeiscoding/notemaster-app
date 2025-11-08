"use client";
import React from "react";
import { Folder, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NotebookTreeNode } from "@/types/note";

export type NotebookNodeProps = {
  node: NotebookTreeNode;
  activeId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  depth?: number;
};

const NotebookNode: React.FC<NotebookNodeProps> = ({
  node,
  activeId,
  onSelect,
  onDelete,
  depth = 0,
}) => {
  const isActive = node.id === activeId;
  const hasChildren = node.children.length > 0;

  return (
    <div className="space-y-1">
      <div
        className={cn(
          "flex items-center justify-between rounded-md px-2 py-1 text-sm transition hover:bg-muted",
          isActive && "bg-muted"
        )}
        style={{ marginLeft: depth * 12 }}
      >
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left"
          onClick={() => onSelect(node.id)}
        >
          <Folder className="size-4 text-muted-foreground" />
          <span className="truncate">{node.name}</span>
          {hasChildren && (
            <span className="text-xs text-muted-foreground">({node.children.length})</span>
          )}
        </button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(node.id)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      {hasChildren && (
        <div className="space-y-1">
          {node.children
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((child) => (
              <NotebookNode
                key={child.id}
                node={child}
                activeId={activeId}
                onSelect={onSelect}
                onDelete={onDelete}
                depth={depth + 1}
              />
            ))}
        </div>
      )}
    </div>
  );
};

export default NotebookNode;
