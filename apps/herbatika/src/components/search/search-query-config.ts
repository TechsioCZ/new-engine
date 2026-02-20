"use client";

import { parseAsInteger, parseAsString } from "nuqs";

export const SEARCH_RESULT_LIMIT = 24;

export const searchQueryParsers = {
  q: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
};

export const normalizePage = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 1;
  }

  const normalizedPage = Math.trunc(value);
  if (normalizedPage < 1) {
    return 1;
  }

  return normalizedPage;
};
