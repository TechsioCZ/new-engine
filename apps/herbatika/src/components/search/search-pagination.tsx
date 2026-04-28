"use client";

import { Pagination } from "@techsio/ui-kit/molecules/pagination";
import NextLink from "next/link";
import { usePaginationUrlBuilder } from "@/lib/storefront/use-pagination-url-builder";

type SearchPaginationProps = {
  isVisible: boolean;
  count: number;
  currentPage: number;
  pageSize: number;
};

export function SearchPagination({
  isVisible,
  count,
  currentPage,
  pageSize,
}: SearchPaginationProps) {
  const getPageUrl = usePaginationUrlBuilder();

  if (!isVisible) {
    return null;
  }

  return (
    <Pagination
      count={count}
      getPageUrl={getPageUrl}
      linkAs={NextLink}
      page={currentPage}
      pageSize={pageSize}
      size="sm"
      variant="outlined"
    />
  );
}
