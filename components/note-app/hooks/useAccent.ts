import { useState, useEffect, useCallback } from "react";
import {
  ACCENT_PALETTES,
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT,
} from "@/components/note-app/constants";
import { pickAccessibleTextColor, hexToRgba } from "@/components/note-app/util";
import type { AccentPalette } from "@/types/note";

export function useAccent() {
  const [accent, setAccent] = useState<AccentPalette>(() => {
    if (typeof window === "undefined") return DEFAULT_ACCENT;
    try {
      const raw = window.localStorage?.getItem(ACCENT_STORAGE_KEY);
      if (!raw) return DEFAULT_ACCENT;
      const parsed = JSON.parse(raw) as Partial<AccentPalette> | null;
      if (!parsed?.id) return DEFAULT_ACCENT;

      const base = ACCENT_PALETTES.find((palette) => palette.id === parsed.id);
      if (base) {
        return {
          ...base,
          ...parsed,
          fontScale: parsed.fontScale ?? base.fontScale ?? 1,
          background: parsed.background ?? base.background,
          texture: parsed.texture ?? base.texture ?? null,
        } as AccentPalette;
      }

      if (parsed.primary && parsed.accent) {
        return {
          ...DEFAULT_ACCENT,
          ...parsed,
          fontScale: parsed.fontScale ?? 1,
          background: parsed.background ?? DEFAULT_ACCENT.background,
          texture: parsed.texture ?? DEFAULT_ACCENT.texture ?? null,
        } as AccentPalette;
      }
    } catch (error) {
      console.error("Failed to read accent palette", error);
    }
    return DEFAULT_ACCENT;
  });

  const [accentPreview, setAccentPreview] = useState<AccentPalette | null>(null);

  const handlePreviewAccent = useCallback((palette: AccentPalette) => {
    setAccentPreview(palette);
  }, []);

  const handleCancelAccentPreview = useCallback(() => {
    setAccentPreview(null);
  }, []);

  const handleSelectAccent = useCallback(
    (palette?: AccentPalette) => {
      const next = palette ?? accentPreview;
      if (!next) return;
      setAccent(next);
      setAccentPreview(null);
    },
    [accentPreview]
  );

  const appliedAccent = accentPreview ?? accent;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const accentForeground = pickAccessibleTextColor(appliedAccent.primary);
    const accentRing = hexToRgba(appliedAccent.primary, 0.45);
    const accentSoft = hexToRgba(appliedAccent.primary, 0.12);
    const accentBgLight = hexToRgba(appliedAccent.primary, 0.03); // 3% opacity for subtle tint
    
    console.log("Applying accent:", appliedAccent.name, appliedAccent.background);

    root.style.setProperty("--accent-foreground", accentForeground);
    root.style.setProperty("--accent-background-light", accentBgLight);
    
    root.style.setProperty("--accent-primary", appliedAccent.primary);
    root.style.setProperty("--accent-secondary", appliedAccent.accent);
    root.style.setProperty("--interactive-accent", appliedAccent.primary);
    root.style.setProperty("--interactive-accent-strong", appliedAccent.accent);
    root.style.setProperty("--interactive-accent-contrast", accentForeground);
    root.style.setProperty("--interactive-accent-soft", accentSoft);
    root.style.setProperty("--interactive-accent-ring", accentRing);
    root.style.setProperty(
      "--app-font-scale",
      appliedAccent.fontScale.toString()
    );
    root.style.setProperty(
      "--app-background-gradient",
      appliedAccent.background ?? "none"
    );
    root.style.setProperty(
      "--app-background-texture",
      appliedAccent.texture ?? "none"
    );
  }, [appliedAccent]);

  useEffect(() => {
    if (accentPreview) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage?.setItem(ACCENT_STORAGE_KEY, JSON.stringify(accent));
    } catch (error) {
      console.error("Failed to persist accent", error);
    }
  }, [accent, accentPreview]);

  return {
    accent,
    accentPreview,
    handlePreviewAccent,
    handleCancelAccentPreview,
    handleSelectAccent,
    accentPalettes: ACCENT_PALETTES,
  };
}

