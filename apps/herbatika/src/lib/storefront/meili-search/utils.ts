import {
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
} from "./constants";
import type { StorefrontSearchHit } from "./types";

export const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
};

const stripHtml = (value: string): string => {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
};

const toSnippet = (value: string, maxLength = 180): string => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

export const resolveSearchLimit = (limit?: number): number => {
  if (typeof limit !== "number" || Number.isNaN(limit)) {
    return DEFAULT_SEARCH_LIMIT;
  }

  const normalizedLimit = Math.trunc(limit);
  if (normalizedLimit < 1) {
    return 1;
  }

  return Math.min(normalizedLimit, MAX_SEARCH_LIMIT);
};

export const resolveSearchPage = (page?: number): number => {
  if (typeof page !== "number" || Number.isNaN(page)) {
    return 1;
  }

  const normalizedPage = Math.trunc(page);
  if (normalizedPage < 1) {
    return 1;
  }

  return normalizedPage;
};

export const toSearchHit = (input: unknown): StorefrontSearchHit | null => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const record = input as Record<string, unknown>;
  const id = normalizeOptionalString(record.id);
  const title = normalizeOptionalString(record.title);
  const handle = normalizeOptionalString(record.handle);

  if (!(id && title && handle)) {
    return null;
  }

  const thumbnail = normalizeOptionalString(record.thumbnail);
  const description = normalizeOptionalString(record.description);

  return {
    id,
    title,
    handle,
    thumbnail,
    descriptionSnippet: description ? toSnippet(stripHtml(description)) : "",
  };
};
