"use client";
import React from "react";
import { Folder, GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { NotebookTreeNode } from "@/types/note";

export type NotebookNodeProps = {
  node: NotebookTreeNode;
  activeId: string;
  index: number;
  dragDataType: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string | null, name: string) => Promise<boolean> | boolean;
  onRename: (id: string, name: string) => Promise<boolean> | boolean;
  onMove: (
    id: string,
    targetParentId: string | null,
    targetIndex: number
  ) => Promise<boolean> | boolean;
  depth?: number;
};

const NotebookNode: React.FC<NotebookNodeProps> = ({
  node,
  activeId,
  index,
  dragDataType,
  onSelect,
  onDelete,
  onAddChild,
  onRename,
  onMove,
  depth = 0,
}) => {
  const isActive = node.id === activeId;
  const hasChildren = node.children.length > 0;
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [renameValue, setRenameValue] = React.useState(node.name);
  const [isAddingChild, setIsAddingChild] = React.useState(false);
  const [childName, setChildName] = React.useState("");
  const [dragZone, setDragZone] = React.useState<"before" | "inside" | "after" | null>(null);

  React.useEffect(() => {
    setRenameValue(node.name);
  }, [node.name]);

  const determineDropZone = (event: React.DragEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    if (offsetY < rect.height * 0.25) return "before";
    if (offsetY > rect.height * 0.75) return "after";
    return "inside";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData(dragDataType);
    setDragZone(null);
    if (!sourceId || sourceId === node.id) return;
    const zone = determineDropZone(event);
    if (zone === "before") {
      onMove(sourceId, node.parentId, index);
      return;
    }
    if (zone === "after") {
      onMove(sourceId, node.parentId, index + 1);
      return;
    }
    onMove(sourceId, node.id, node.children.length);
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    if (isRenaming || isAddingChild) return;
    event.dataTransfer.setData(dragDataType, node.id);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleRenameSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const success = await onRename(node.id, renameValue);
    if (success) {
      setIsRenaming(false);
    }
  };

  const handleAddChildSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = childName.trim();
    if (!trimmed) return;
    const success = await onAddChild(node.id, trimmed);
    if (success) {
      setChildName("");
      setIsAddingChild(false);
    }
  };

  return (
    <div className="space-y-1">
      <div
        className={cn(
          "group rounded-md px-2 py-1 text-sm transition",
          isActive && "bg-muted border border-border/60",
          dragZone === "inside" && "bg-(--interactive-accent-soft)/30"
        )}
        style={{ marginLeft: depth * 12 }}
        draggable={!isRenaming && !isAddingChild}
        onDragStart={handleDragStart}
        onDragOver={(event) => {
          event.preventDefault();
          if (isRenaming || isAddingChild) return;
          setDragZone(determineDropZone(event));
          event.dataTransfer.dropEffect = "move";
        }}
        onDragLeave={() => setDragZone(null)}
        onDrop={handleDrop}
      >
        <div
          className={cn(
            "flex items-center gap-2 rounded-md px-1 py-0.5",
            dragZone === "before" && "ring-2 ring-(--interactive-accent)",
            dragZone === "after" && "ring-2 ring-(--interactive-accent)"
          )}
        >
          <GripVertical className="size-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-60" />
          {isRenaming ? (
            <form onSubmit={handleRenameSubmit} className="flex flex-1 items-center gap-2">
              <Input
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setIsRenaming(false);
                    setRenameValue(node.name);
                  }
                }}
              />
              <Button size="sm" type="submit">
                Save
              </Button>
              <Button
                size="icon-sm"
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsRenaming(false);
                  setRenameValue(node.name);
                }}
              >
                <X className="size-3.5" />
              </Button>
            </form>
          ) : (
            <button
              type="button"
              className="flex flex-1 items-center gap-2 text-left"
              onClick={() => onSelect(node.id)}
            >
              <Folder className="size-4 text-muted-foreground" />
              <span className="truncate">{node.name}</span>
              {hasChildren && (
                <span className="text-xs text-muted-foreground">
                  ({node.children.length})
                </span>
              )}
            </button>
          )}
          {!isRenaming && (
            <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-(--interactive-accent)"
                onClick={() => {
                  setIsAddingChild((prev) => !prev);
                  setChildName("");
                }}
                title="Add sub-notebook"
              >
                <Plus className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-(--interactive-accent)"
                onClick={() => setIsRenaming(true)}
                title="Rename notebook"
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(node.id)}
                title="Delete notebook"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
        {isAddingChild && (
          <form
            onSubmit={handleAddChildSubmit}
            className="mt-2 flex items-center gap-2 pl-6"
          >
            <Input
              value={childName}
              onChange={(event) => setChildName(event.target.value)}
              placeholder="Sub-notebook name"
              autoFocus
            />
            <Button type="submit" size="sm" disabled={!childName.trim()}>
              Add
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => {
                setIsAddingChild(false);
                setChildName("");
              }}
            >
              <X className="size-3.5" />
            </Button>
          </form>
        )}
      </div>
      {hasChildren && (
        <div className="space-y-1">
          {node.children.map((child, childIndex) => (
            <NotebookNode
              key={child.id}
              node={child}
              index={childIndex}
              dragDataType={dragDataType}
              activeId={activeId}
              onSelect={onSelect}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onRename={onRename}
              onMove={onMove}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default NotebookNode;
