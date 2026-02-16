"use client";

import { useQueryStates } from "nuqs";
import { normalizePage, searchQueryParsers } from "./search-query-config";

type SearchQueryStateHistoryMode = "replace" | "push";

export const useSearchQueryState = () => {
  const [queryState, setQueryState] = useQueryStates(searchQueryParsers);
  const query = queryState.q.trim();
  const currentPage = normalizePage(queryState.page);

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

  return {
    query,
    currentPage,
    setPage,
  };
};
