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
  {
    id: "lemon-chiffon",
    name: "Lemon Chiffon",
    primary: "#FBF8CC",
    accent: "#E8E0A8",
    fontScale: 1,
    background:
      "linear-gradient(135deg, rgba(251,248,204,0.4) 0%, rgba(233,228,170,0.25) 60%, rgba(255,255,255,0.5) 100%)",
    texture:
      "radial-gradient(circle at 25% 25%, rgba(255,255,255,0.25) 0%, transparent 55%)",
  },
  {
    id: "champagne-pink",
    name: "Champagne Pink",
    primary: "#FDE4CF",
    accent: "#F5C7A8",
    fontScale: 1,
    background:
      "linear-gradient(140deg, rgba(253,228,207,0.4) 0%, rgba(245,199,168,0.22) 60%, rgba(255,241,232,0.5) 100%)",
    texture:
      "radial-gradient(circle at 70% 30%, rgba(255,255,255,0.2) 0%, transparent 55%)",
  },
  {
    id: "baby-pink",
    name: "Baby Pink",
    primary: "#FFCFD2",
    accent: "#F8AFC1",
    fontScale: 1,
    background:
      "linear-gradient(135deg, rgba(255,207,210,0.42) 0%, rgba(248,175,193,0.24) 60%, rgba(255,240,246,0.5) 100%)",
    texture:
      "radial-gradient(circle at 30% 70%, rgba(255,255,255,0.22) 0%, transparent 60%)",
  },
  {
    id: "pink-lavender",
    name: "Pink Lavender",
    primary: "#F1C0E8",
    accent: "#E3A2D8",
    fontScale: 1,
    background:
      "linear-gradient(135deg, rgba(241,192,232,0.42) 0%, rgba(227,162,216,0.24) 60%, rgba(249,231,246,0.5) 100%)",
    texture:
      "radial-gradient(circle at 80% 40%, rgba(255,255,255,0.2) 0%, transparent 55%)",
  },
  {
    id: "lavender-blue",
    name: "Lavender Blue",
    primary: "#CFBAF0",
    accent: "#B599DF",
    fontScale: 1,
    background:
      "linear-gradient(140deg, rgba(207,186,240,0.38) 0%, rgba(181,153,223,0.22) 60%, rgba(238,232,250,0.5) 100%)",
    texture:
      "radial-gradient(circle at 60% 20%, rgba(255,255,255,0.24) 0%, transparent 55%)",
  },
  {
    id: "baby-blue-eyes",
    name: "Baby Blue Eyes",
    primary: "#A3C4F3",
    accent: "#7CA3E4",
    fontScale: 1,
    background:
      "linear-gradient(135deg, rgba(163,196,243,0.4) 0%, rgba(124,163,228,0.24) 60%, rgba(218,234,255,0.5) 100%)",
    texture:
      "radial-gradient(circle at 15% 35%, rgba(255,255,255,0.2) 0%, transparent 60%)",
  },
  {
    id: "sky-blue",
    name: "Sky Blue",
    primary: "#90DBF4",
    accent: "#63BFE8",
    fontScale: 1,
    background:
      "linear-gradient(135deg, rgba(144,219,244,0.4) 0%, rgba(99,191,232,0.26) 60%, rgba(214,245,255,0.5) 100%)",
    texture:
      "radial-gradient(circle at 75% 25%, rgba(255,255,255,0.18) 0%, transparent 55%)",
  },
  {
    id: "electric-blue",
    name: "Electric Blue",
    primary: "#8EECF5",
    accent: "#5ACFE6",
    fontScale: 1,
    background:
      "linear-gradient(135deg, rgba(142,236,245,0.4) 0%, rgba(90,207,230,0.24) 60%, rgba(209,249,255,0.5) 100%)",
    texture:
      "radial-gradient(circle at 35% 25%, rgba(255,255,255,0.2) 0%, transparent 58%)",
  },
  {
    id: "magic-mint",
    name: "Magic Mint",
    primary: "#98F5E1",
    accent: "#57D8BE",
    fontScale: 1,
    background:
      "linear-gradient(135deg, rgba(152,245,225,0.4) 0%, rgba(87,216,190,0.24) 60%, rgba(217,255,244,0.5) 100%)",
    texture:
      "radial-gradient(circle at 50% 70%, rgba(255,255,255,0.2) 0%, transparent 55%)",
  },
  {
    id: "granny-smith-apple",
    name: "Granny Smith Apple",
    primary: "#B9FBC0",
    accent: "#7FD890",
    fontScale: 1,
    background:
      "linear-gradient(140deg, rgba(185,251,192,0.4) 0%, rgba(127,216,144,0.24) 60%, rgba(228,255,232,0.5) 100%)",
    texture:
      "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.2) 0%, transparent 55%)",
  },
];
