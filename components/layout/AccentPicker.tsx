"use client";
import React from "react";
import { cn } from "@/lib/utils";
import type { AccentPalette } from "@/types/note";

type AccentPickerProps = {
  palettes: AccentPalette[];
  activePaletteId: string;
  previewPaletteId?: string | null;
  onPreview?: (palette: AccentPalette) => void;
  onCancelPreview?: () => void;
  onApply: (palette: AccentPalette) => void;
};

const AccentPicker: React.FC<AccentPickerProps> = ({
  palettes,
  activePaletteId,
  previewPaletteId,
  onPreview,
  onCancelPreview,
  onApply,
}) => {
  return (
    <div
      className="grid grid-cols-5 gap-2"
      onMouseLeave={() => onCancelPreview?.()}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          onCancelPreview?.();
        }
      }}
    >
      {palettes.map((palette) => {
        const isActive = palette.id === activePaletteId;
        const isPreview = palette.id === previewPaletteId;
        return (
          <button
            key={palette.id}
            type="button"
            className={cn(
              "flex h-12 flex-col items-center justify-center rounded-full border text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)",
              isPreview
                ? "border-(--accent-primary) shadow-sm shadow-(--interactive-accent)/40"
                : isActive
                  ? "ring-2 ring-offset-2 ring-(--accent-primary)"
                  : "hover:ring-1",
            )}
            style={{
              background: `linear-gradient(135deg, ${palette.primary}, ${palette.accent})`,
            }}
            aria-label={`Preview ${palette.name} theme`}
            onMouseEnter={() => onPreview?.(palette)}
            onFocus={() => onPreview?.(palette)}
            onClick={() => onApply(palette)}
          >
            <span className="sr-only">{palette.name}</span>
          </button>
        );
      })}
    </div>
  );
};

export default AccentPicker;
