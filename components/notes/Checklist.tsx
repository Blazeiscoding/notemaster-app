"use client";
import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ChecklistItem } from "@/types/note";

type ChecklistProps = {
  items: ChecklistItem[];
  onAddItem: () => void;
  onMarkAll: (checked: boolean) => void;
  onClearCompleted: () => void;
  onUpdateItem: (
    itemId: string,
    field: "text" | "checked",
    value: string | boolean,
  ) => void;
  onDeleteItem: (itemId: string) => void;
};

const Checklist: React.FC<ChecklistProps> = ({
  items,
  onAddItem,
  onMarkAll,
  onClearCompleted,
  onUpdateItem,
  onDeleteItem,
}) => {
  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Checklist
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onMarkAll(true)}>
            Mark all
          </Button>
          <Button variant="outline" size="sm" onClick={() => onMarkAll(false)}>
            Unmark all
          </Button>
          <Button variant="outline" size="sm" onClick={onClearCompleted}>
            Clear done
          </Button>
          <Button variant="outline" size="sm" onClick={onAddItem}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      </header>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-2 rounded-lg border border-dashed px-3 py-2 sm:flex-row sm:items-center"
          >
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(event) =>
                  onUpdateItem(item.id, "checked", event.target.checked)
                }
                className="size-4 rounded border-muted-foreground"
              />
            </label>
            <Input
              value={item.text}
              onChange={(event) => onUpdateItem(item.id, "text", event.target.value)}
              placeholder="Checklist item"
              className={cn(
                "flex-1 border-none px-0 focus-visible:ring-0",
                item.checked && "text-muted-foreground line-through",
              )}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDeleteItem(item.id)}
              className="ml-auto text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No checklist items yet. Add one to keep track of tasks.
          </p>
        )}
      </div>
    </section>
  );
};

export default Checklist;
