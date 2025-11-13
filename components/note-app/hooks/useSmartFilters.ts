import { useState, useEffect, useMemo, useCallback } from "react";
import {
  SMART_FILTERS_STORAGE_KEY,
} from "@/components/note-app/constants";
import { generateId } from "@/components/note-app/util";
import {
  hapticError,
  hapticLight,
  hapticMedium,
  hapticSuccess,
} from "@/lib/haptics";
import type { SmartFilter, SmartFilterCriteria } from "@/components/note-app/types";

type NoteAppSection = "notes" | "archive" | "bin";

const BUILT_IN_SMART_FILTERS: SmartFilter[] = Object.freeze([
  {
    id: "default-due-this-week",
    name: "Due this week",
    description: "Notes with a due date in the next 7 days",
    criteria: {
      section: "notes",
      dueWithinDays: 7,
    },
    isDefault: true,
  },
  {
    id: "default-pinned-work",
    name: "Pinned • Work",
    description: "Pinned notes tagged with #work",
    criteria: {
      section: "notes",
      pinned: true,
      tags: ["work"],
    },
    isDefault: true,
  },
]) as SmartFilter[];

const BUILT_IN_SMART_FILTER_IDS = new Set(
  BUILT_IN_SMART_FILTERS.map((filter) => filter.id)
);

function cleanSmartFilterCriteria(
  criteria: SmartFilterCriteria
): SmartFilterCriteria {
  const cleaned: SmartFilterCriteria = {};

  if (criteria.section && criteria.section !== "any") {
    cleaned.section = criteria.section;
  }
  if (criteria.search?.trim()) {
    cleaned.search = criteria.search.trim();
  }
  if (criteria.tag?.trim()) {
    cleaned.tag = criteria.tag.trim();
  }
  if (criteria.notebookId) {
    cleaned.notebookId = criteria.notebookId;
  }
  if (criteria.sortBy) {
    cleaned.sortBy = criteria.sortBy;
  }
  if (typeof criteria.pinned === "boolean") {
    cleaned.pinned = criteria.pinned;
  }
  if (Array.isArray(criteria.tags) && criteria.tags.length > 0) {
    cleaned.tags = Array.from(
      new Set(criteria.tags.map((tag) => tag.trim()))
    ).filter((tag) => tag.length > 0);
  }
  if (typeof criteria.dueWithinDays === "number") {
    cleaned.dueWithinDays = criteria.dueWithinDays;
  }

  return cleaned;
}

const mergeSmartFilters = (custom: SmartFilter[]): SmartFilter[] => {
  const sanitizedCustom = custom
    .filter((filter) => !BUILT_IN_SMART_FILTER_IDS.has(filter.id))
    .map((filter) => ({
      ...filter,
      isDefault: filter.isDefault ?? false,
      criteria: cleanSmartFilterCriteria(filter.criteria),
    }));

  return [...BUILT_IN_SMART_FILTERS, ...sanitizedCustom];
};

export function useSmartFilters(
  activeSection: NoteAppSection,
  sortBy: "updated" | "created" | "title",
  searchQuery: string,
  filterTag: string,
  activeNotebookId: string
) {
  const [customSmartFilters, setCustomSmartFilters] = useState<SmartFilter[]>(
    () => {
      if (typeof window === "undefined") return [];
      try {
        const stored = window.localStorage?.getItem(SMART_FILTERS_STORAGE_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored) as SmartFilter[];
        if (Array.isArray(parsed))
          return parsed
            .filter((filter) => !BUILT_IN_SMART_FILTER_IDS.has(filter.id))
            .map((filter) => ({
              ...filter,
              isDefault: false,
              criteria: cleanSmartFilterCriteria(filter.criteria),
            }));
      } catch (error) {
        console.error("Failed to read smart filters", error);
      }
      return [];
    }
  );

  const [activeSmartFilterId, setActiveSmartFilterId] = useState<string | null>(
    null
  );

  const smartFilters = useMemo(
    () => mergeSmartFilters(customSmartFilters),
    [customSmartFilters]
  );

  const appliedFilter = useMemo(() => {
    if (!activeSmartFilterId) return null;
    return (
      smartFilters.find((filter) => filter.id === activeSmartFilterId) ?? null
    );
  }, [activeSmartFilterId, smartFilters]);

  const baseSmartFilterCriteria = useMemo(
    () =>
      cleanSmartFilterCriteria({
        section: activeSection,
        sortBy,
        search: searchQuery,
        tag: filterTag === "all" ? undefined : filterTag,
        notebookId: activeNotebookId === "all" ? undefined : activeNotebookId,
      }),
    [activeSection, activeNotebookId, filterTag, searchQuery, sortBy]
  );

  const addSmartFilter = useCallback(
    (input: {
      name: string;
      description?: string;
      criteria?: SmartFilterCriteria;
    }) => {
      const trimmedName = input.name.trim();
      if (!trimmedName) {
        hapticError();
        return false;
      }

      const criteria = cleanSmartFilterCriteria(
        input.criteria ?? baseSmartFilterCriteria
      );
      const id = generateId();

      setCustomSmartFilters((prev) => [
        ...prev,
        {
          id,
          name: trimmedName,
          description: input.description?.trim() || undefined,
          criteria,
          isDefault: false,
        },
      ]);

      setActiveSmartFilterId(id);
      hapticSuccess();
      return true;
    },
    [baseSmartFilterCriteria]
  );

  const updateSmartFilter = useCallback(
    (
      id: string,
      updates: {
        name?: string;
        description?: string;
        criteria?: SmartFilterCriteria;
      }
    ) => {
      setCustomSmartFilters((prev) =>
        prev.map((filter) =>
          filter.id === id
            ? {
                ...filter,
                name: updates.name?.trim() ? updates.name.trim() : filter.name,
                description:
                  updates.description?.trim() !== undefined
                    ? updates.description.trim() || undefined
                    : filter.description,
                criteria: updates.criteria
                  ? cleanSmartFilterCriteria(updates.criteria)
                  : filter.criteria,
              }
            : filter
        )
      );
      hapticMedium();
    },
    []
  );

  const removeSmartFilter = useCallback((id: string) => {
    setCustomSmartFilters((prev) => prev.filter((filter) => filter.id !== id));
    setActiveSmartFilterId((prev) => (prev === id ? null : prev));
    hapticLight();
  }, []);

  const applySmartFilter = useCallback((id: string | null) => {
    setActiveSmartFilterId(id);
    hapticLight();
  }, []);

  const currentSmartFilterCriteria = useMemo(
    () => appliedFilter?.criteria ?? baseSmartFilterCriteria,
    [appliedFilter, baseSmartFilterCriteria]
  );

  const canSaveSmartFilter = useMemo(() => {
    if (appliedFilter) return false;

    const serializedBase = JSON.stringify(baseSmartFilterCriteria);
    return !smartFilters.some(
      (filter) => JSON.stringify(filter.criteria) === serializedBase
    );
  }, [appliedFilter, baseSmartFilterCriteria, smartFilters]);

  const resolvedCriteria: SmartFilterCriteria = useMemo(() => {
    if (!appliedFilter) {
      return baseSmartFilterCriteria;
    }

    return {
      search: appliedFilter.criteria.search ?? baseSmartFilterCriteria.search,
      tag: appliedFilter.criteria.tag ?? baseSmartFilterCriteria.tag,
      notebookId:
        appliedFilter.criteria.notebookId ?? baseSmartFilterCriteria.notebookId,
      section:
        appliedFilter.criteria.section ?? baseSmartFilterCriteria.section,
      sortBy: appliedFilter.criteria.sortBy ?? baseSmartFilterCriteria.sortBy,
      pinned: appliedFilter.criteria.pinned,
      tags: appliedFilter.criteria.tags,
      dueWithinDays: appliedFilter.criteria.dueWithinDays,
    };
  }, [appliedFilter, baseSmartFilterCriteria]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const serializable = customSmartFilters.map((filter) => ({
        ...filter,
        isDefault: false,
      }));
      window.localStorage?.setItem(
        SMART_FILTERS_STORAGE_KEY,
        JSON.stringify(serializable)
      );
    } catch (error) {
      console.error("Failed to persist smart filters", error);
    }
  }, [customSmartFilters]);

  return {
    smartFilters,
    activeSmartFilterId,
    currentSmartFilterCriteria: resolvedCriteria,
    canSaveSmartFilter,
    addSmartFilter,
    updateSmartFilter,
    removeSmartFilter,
    applySmartFilter,
  };
}

