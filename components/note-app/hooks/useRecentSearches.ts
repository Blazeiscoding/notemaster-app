"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches,
  removeRecentSearch,
  type RecentSearch,
} from "@/lib/indexeddb";

/**
 * Hook for managing recent searches with IndexedDB persistence.
 */
export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load recent searches on mount
  useEffect(() => {
    const load = async () => {
      try {
        const searches = await getRecentSearches();
        setRecentSearches(searches);
      } catch (error) {
        console.error("Failed to load recent searches:", error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Add a new search query
  const addSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    try {
      await addRecentSearch(query.trim());
      const updated = await getRecentSearches();
      setRecentSearches(updated);
    } catch (error) {
      console.error("Failed to save recent search:", error);
    }
  }, []);

  // Clear all recent searches
  const clearSearches = useCallback(async () => {
    try {
      await clearRecentSearches();
      setRecentSearches([]);
    } catch (error) {
      console.error("Failed to clear recent searches:", error);
    }
  }, []);

  // Remove a single search
  const removeSearch = useCallback(async (id: string) => {
    try {
      await removeRecentSearch(id);
      setRecentSearches((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error("Failed to remove recent search:", error);
    }
  }, []);

  return {
    recentSearches,
    isLoading,
    addSearch,
    clearSearches,
    removeSearch,
  };
}

export default useRecentSearches;
