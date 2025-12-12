"use client";
import React from "react";
import { cn } from "@/lib/utils";
import type { AccentPalette } from "@/types/note";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
          <TooltipProvider key={palette.id} delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "group relative flex h-12 flex-col items-center justify-center rounded-full border text-[11px] font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isPreview
                      ? "scale-110 border-primary shadow-lg shadow-primary/20"
                      : isActive
                        ? "scale-100 ring-2 ring-offset-2 ring-primary border-transparent"
                        : "hover:scale-105 hover:border-primary/50 hover:shadow-md",
                  )}
                  style={{
                    background: `linear-gradient(135deg, ${palette.primary}, ${palette.accent})`,
                  }}
                  aria-label={`Select ${palette.name} theme`}
                  onMouseEnter={() => onPreview?.(palette)}
                  onFocus={() => onPreview?.(palette)}
                  onClick={() => onApply(palette)}
                >
                  <span className="sr-only">{palette.name}</span>
                  {isActive && (
                    <span className="absolute inset-0 flex items-center justify-center animate-in zoom-in duration-200">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-4 text-white drop-shadow-md"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {palette.name}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
};

export default AccentPicker;
