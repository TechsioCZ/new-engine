"use client";

import { Pagination } from "@techsio/ui-kit/molecules/pagination";

type SearchPaginationProps = {
  isVisible: boolean;
  count: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (nextPage: number) => void;
};

export function SearchPagination({
  isVisible,
  count,
  currentPage,
  pageSize,
  onPageChange,
}: SearchPaginationProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <Pagination
      count={count}
      onPageChange={onPageChange}
      page={currentPage}
      pageSize={pageSize}
      size="sm"
      variant="outlined"
    />
  );
}
