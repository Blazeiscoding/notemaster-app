/**
 * API Client Utilities
 * Helper functions for making API requests and handling standardized responses
 */

import type { ApiResponse } from "./api-middleware";

async function handleApiResponse<T>(
  response: Response
): Promise<T> {
  const data = (await response.json()) as ApiResponse<T>;

  if (!data.success) {
    throw new Error(data.error || "Request failed");
  }

  // Handle both old format (direct data) and new format (wrapped in data property)
  // This provides backward compatibility during migration
  if ("data" in data && data.data !== undefined) {
    return data.data;
  }

  // Fallback: if response doesn't have success/data structure, return as-is
  // This handles edge cases where response might not be standardized yet
  return data as unknown as T;
}

/**
 * Make an API request and handle the response
 */
export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as ApiResponse;
    const errorMessage =
      errorData.error ||
      `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return handleApiResponse<T>(response);
}

