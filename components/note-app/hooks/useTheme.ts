import { useState, useEffect } from "react";
import { THEME_STORAGE_KEY } from "@/components/note-app/constants";

export function useTheme() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      const stored = window.localStorage?.getItem(THEME_STORAGE_KEY);
      if (stored === "dark") {
        return true;
      }
      if (stored === "light") {
        return false;
      }
      if (typeof window.matchMedia === "function") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
    } catch (error) {
      console.error("Failed to read theme preference", error);
    }
    return false;
  });

  useEffect(() => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (darkMode) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, [darkMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage?.setItem(
        THEME_STORAGE_KEY,
        darkMode ? "dark" : "light"
      );
    } catch (error) {
      console.error("Failed to persist theme preference", error);
    }
  }, [darkMode]);

  return { darkMode, setDarkMode };
}

