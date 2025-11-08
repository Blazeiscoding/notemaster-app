"use client";
import React from "react";
import { cn } from "@/lib/utils";
import type { AccentPalette } from "@/types/note";

type AccentPickerProps = {
  palettes: AccentPalette[];
  activePaletteId: string;
  onSelect: (palette: AccentPalette) => void;
};

const AccentPicker: React.FC<AccentPickerProps> = ({
  palettes,
  activePaletteId,
  onSelect,
}) => {
  return (
    <div className="grid grid-cols-5 gap-2">
      {palettes.map((palette) => (
        <button
          key={palette.id}
          className={cn(
            "h-10 rounded-full border transition",
            palette.id === activePaletteId
              ? "ring-2 ring-offset-2 ring-(--accent-primary)"
              : "hover:ring-1"
          )}
          style={{
            background: `linear-gradient(135deg, ${palette.primary}, ${palette.accent})`,
          }}
          aria-label={`Switch to ${palette.name}`}
          onClick={() => onSelect(palette)}
        />
      ))}
    </div>
  );
};

export default AccentPicker;
