/* eslint-disable react-hooks/incompatible-library */
import { useRef, useMemo, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { NotePayload } from "@/types/note";

const VIRTUAL_SCROLL_THRESHOLD = 50;

const getColumnsCount = (): number => {
  if (typeof window === "undefined") return 3;
  const width = window.innerWidth;
  if (width >= 1280) return 3; // xl
  if (width >= 640) return 2; // sm
  return 1; // mobile
};

export function useVirtualizedGrid(notes: NotePayload[]) {
  "use no memo";

  const parentRef = useRef<HTMLDivElement>(null);
  const [columnsCount, setColumnsCount] = useState(() => getColumnsCount());

  // Update columns on window resize
  useEffect(() => {
    const handleResize = () => {
      setColumnsCount(getColumnsCount());
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const shouldVirtualize = notes.length > VIRTUAL_SCROLL_THRESHOLD;

  // Group notes into rows for virtual scrolling
  const rows = useMemo(() => {
    if (!shouldVirtualize) return [];
    const rows: NotePayload[][] = [];
    for (let i = 0; i < notes.length; i += columnsCount) {
      rows.push(notes.slice(i, i + columnsCount));
    }
    return rows;
  }, [notes, columnsCount, shouldVirtualize]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 320, // Estimated height of a note card row
    overscan: 2, // Render 2 extra rows for smoother scrolling
    enabled: shouldVirtualize,
  });

  return {
    parentRef,
    columnsCount,
    shouldVirtualize,
    rows,
    rowVirtualizer,
  };
}
