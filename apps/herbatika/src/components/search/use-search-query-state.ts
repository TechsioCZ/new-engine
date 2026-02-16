"use client";

import { useQueryStates } from "nuqs";
import { useEffect, useState } from "react";
import { normalizePage, searchQueryParsers } from "./search-query-config";

type SearchQueryStateHistoryMode = "replace" | "push";

export const useSearchQueryState = () => {
  const [queryState, setQueryState] = useQueryStates(searchQueryParsers);
  const query = queryState.q.trim();
  const currentPage = normalizePage(queryState.page);
  const [searchDraft, setSearchDraft] = useState(query);

  useEffect(() => {
    setSearchDraft(query);
  }, [query]);

  const setPage = (
    nextPage: number,
    history: SearchQueryStateHistoryMode = "push",
  ) => {
    void setQueryState(
      {
        page: nextPage,
      },
      {
        history,
      },
    );
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    const formValue = formData.get("q");
    const nextQuery = typeof formValue === "string" ? formValue.trim() : "";

    if (!nextQuery) {
      void setQueryState(
        {
          q: "",
          page: 1,
        },
        {
          history: "replace",
        },
      );
      return;
    }

    void setQueryState(
      {
        q: nextQuery,
        page: 1,
      },
      {
        history: "push",
      },
    );
  };

  return {
    query,
    currentPage,
    searchDraft,
    setSearchDraft,
    setPage,
    handleSearchSubmit,
  };
};
