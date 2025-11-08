import type { AccentPalette } from "@/types/note";

export const THEME_STORAGE_KEY = "notemaster-theme";
export const ACCENT_STORAGE_KEY = "notemaster-accent";

export const DEFAULT_ACCENT: AccentPalette = {
  id: "azure",
  name: "Azure",
  primary: "#2563EB",
  accent: "#1D4ED8",
};

export const ACCENT_PALETTES: AccentPalette[] = [
  DEFAULT_ACCENT,
  { id: "violet", name: "Violet", primary: "#7C3AED", accent: "#5B21B6" },
  { id: "rose", name: "Rose", primary: "#E11D48", accent: "#BE123C" },
  { id: "pink", name: "Pink", primary: "#EC4899", accent: "#DB2777" },
  { id: "emerald", name: "Emerald", primary: "#10B981", accent: "#047857" },
  { id: "amber", name: "Amber", primary: "#F59E0B", accent: "#B45309" },
  { id: "olive", name: "Olive", primary: "#708238", accent: "#556B2F" },
];
