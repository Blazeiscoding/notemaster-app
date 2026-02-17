"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Clock, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRecentSearches } from "@/components/note-app/hooks/useRecentSearches";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

const SearchBar: React.FC<SearchBarProps> = React.memo(({
  value,
  onChange,
  debounceMs = 300,
  inputRef,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const actualInputRef = inputRef || internalInputRef;

  const { recentSearches, addSearch, clearSearches, removeSearch } =
    useRecentSearches();

  // Sync local value when external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChange, value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSearch = useCallback(
    (query: string) => {
      setLocalValue(query);
      onChange(query);
      if (query.trim()) {
        addSearch(query.trim());
      }
      setShowDropdown(false);
      setHighlightedIndex(-1);
    },
    [addSearch, onChange]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        if (showDropdown && highlightedIndex >= 0) {
          event.preventDefault();
          handleSelectSearch(recentSearches[highlightedIndex].query);
          return;
        }

        const query = localValue.trim();
        onChange(localValue);
        if (query) {
          addSearch(query);
        }
        setShowDropdown(false);
        setHighlightedIndex(-1);
        return;
      }

      if (event.key === "Escape") {
        setShowDropdown(false);
        setHighlightedIndex(-1);
        return;
      }

      if (!showDropdown || recentSearches.length === 0) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setHighlightedIndex((prev) =>
            prev < recentSearches.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : recentSearches.length - 1
          );
          break;
      }
    },
    [
      addSearch,
      handleSelectSearch,
      highlightedIndex,
      localValue,
      onChange,
      recentSearches,
      showDropdown,
    ]
  );

  const handleFocus = useCallback(() => {
    if (recentSearches.length > 0 && !localValue.trim()) {
      setShowDropdown(true);
    }
  }, [recentSearches.length, localValue]);

  const handleClear = useCallback(() => {
    setLocalValue("");
    onChange("");
    actualInputRef.current?.focus();
  }, [onChange, actualInputRef]);

  const hasValue = localValue.trim().length > 0;

  return (
    <div ref={containerRef} className="relative">
      <Search
        className={cn(
          "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 transition-colors",
          hasValue
            ? "text-(--interactive-accent)"
            : "text-muted-foreground"
        )}
      />
      <input
        ref={actualInputRef}
        type="text"
        autoComplete="off"
        spellCheck={false}
        value={localValue}
        onChange={(event) => setLocalValue(event.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder="Search notes"
        className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent pl-9 pr-8 py-1 text-base shadow-xs transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-(--interactive-accent) focus-visible:ring-(--interactive-accent-ring) focus-visible:ring-[3px] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden [&::-webkit-search-results-button]:hidden [&::-webkit-search-results-decoration]:hidden"
        style={
          {
            WebkitAppearance: "none",
            appearance: "none",
          } as React.CSSProperties
        }
      />
      {hasValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Clear search"
        >
          <X className="size-4" />
        </button>
      )}

      {/* Recent Searches Dropdown */}
      {showDropdown && recentSearches.length > 0 && !hasValue && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-md border bg-popover shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
            <span className="text-xs font-medium text-muted-foreground">
              Recent searches
            </span>
            <button
              type="button"
              onClick={() => clearSearches()}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Trash2 className="size-3" />
              Clear
            </button>
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {recentSearches.map((search, index) => (
              <li key={search.id}>
                <button
                  type="button"
                  onClick={() => handleSelectSearch(search.query)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                    highlightedIndex === index
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  )}
                >
                  <Clock className="size-3 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1">{search.query}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSearch(search.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                    aria-label="Remove from history"
                  >
                    <X className="size-3" />
                  </button>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});

SearchBar.displayName = "SearchBar";

export default SearchBar;
