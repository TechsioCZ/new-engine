"use client";

import { useEffect, useState } from "react";
import {
  createEmptySearchAutocompleteResponse,
  SEARCH_AUTOCOMPLETE_DEBOUNCE_MS,
  SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH,
  type SearchAutocompleteResponse,
} from "@/lib/search-autocomplete/search-autocomplete-types";

type SearchAutocompleteStatus = "idle" | "loading" | "success" | "error";

type UseSearchAutocompleteInput = {
  query: string;
  currencyCode: string;
};

type UseSearchAutocompleteResult = {
  data: SearchAutocompleteResponse;
  status: SearchAutocompleteStatus;
};

export function useSearchAutocomplete({
  query,
  currencyCode,
}: UseSearchAutocompleteInput): UseSearchAutocompleteResult {
  const normalizedQuery = query.trim();
  const [data, setData] = useState<SearchAutocompleteResponse>(
    createEmptySearchAutocompleteResponse(""),
  );
  const [status, setStatus] = useState<SearchAutocompleteStatus>("idle");

  useEffect(() => {
    if (normalizedQuery.length < SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH) {
      setData(createEmptySearchAutocompleteResponse(normalizedQuery));
      setStatus("idle");
      return;
    }

    const abortController = new AbortController();
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams({
        q: normalizedQuery,
        currency: currencyCode,
      });

      setStatus("loading");

      fetch(`/api/search-autocomplete?${params.toString()}`, {
        signal: abortController.signal,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Autocomplete failed: ${response.status}`);
          }

          return response.json() as Promise<SearchAutocompleteResponse>;
        })
        .then((response) => {
          setData(response);
          setStatus("success");
        })
        .catch((error: unknown) => {
          if (abortController.signal.aborted) {
            return;
          }

          console.error("Search autocomplete request failed", error);
          setData(createEmptySearchAutocompleteResponse(normalizedQuery));
          setStatus("error");
        });
    }, SEARCH_AUTOCOMPLETE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [currencyCode, normalizedQuery]);

  return { data, status };
}
