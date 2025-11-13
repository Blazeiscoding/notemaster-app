import type { AccentPalette } from "@/types/note";

export const THEME_STORAGE_KEY = "notemaster-theme";
export const ACCENT_STORAGE_KEY = "notemaster-accent";
export const SMART_FILTERS_STORAGE_KEY = "notemaster-smart-filters";
export const NOTE_ORDER_STORAGE_KEY = "notemaster-note-order";

export const DEFAULT_ACCENT: AccentPalette = {
  id: "azure",
  name: "Azure",
  primary: "#2563EB",
  accent: "#1D4ED8",
  fontScale: 1,
  background:
    "linear-gradient(135deg, rgba(37,99,235,0.14) 0%, rgba(29,78,216,0.08) 50%, rgba(14,116,244,0.16) 100%)",
  texture:
    "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.08) 0%, transparent 55%)",
};

export const ACCENT_PALETTES: AccentPalette[] = [
  DEFAULT_ACCENT,
  {
    id: "violet",
    name: "Violet",
    primary: "#7C3AED",
    accent: "#5B21B6",
    fontScale: 1.02,
    background:
      "linear-gradient(140deg, rgba(124,58,237,0.16) 0%, rgba(91,33,182,0.08) 55%, rgba(139,92,246,0.2) 100%)",
    texture:
      "radial-gradient(circle at 80% 30%, rgba(255,255,255,0.1) 0%, transparent 60%)",
  },
  {
    id: "pink",
    name: "Pink",
    primary: "#EC4899",
    accent: "#DB2777",
    fontScale: 1.01,
    background:
      "linear-gradient(135deg, rgba(236,72,153,0.16) 0%, rgba(219,39,119,0.1) 55%, rgba(244,114,182,0.18) 100%)",
    texture:
      "radial-gradient(circle at 70% 20%, rgba(255,255,255,0.1) 0%, transparent 58%)",
  },
  {
    id: "emerald",
    name: "Emerald",
    primary: "#10B981",
    accent: "#047857",
    fontScale: 0.98,
    background:
      "linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(4,120,87,0.09) 55%, rgba(34,197,94,0.18) 100%)",
    texture:
      "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.1) 0%, transparent 60%)",
  },
  {
    id: "olive",
    name: "Olive",
    primary: "#708238",
    accent: "#556B2F",
    fontScale: 0.97,
    background:
      "linear-gradient(140deg, rgba(112,130,56,0.18) 0%, rgba(85,107,47,0.1) 50%, rgba(148,163,71,0.2) 100%)",
    texture:
      "radial-gradient(circle at 65% 70%, rgba(255,255,255,0.09) 0%, transparent 60%)",
  },
];
