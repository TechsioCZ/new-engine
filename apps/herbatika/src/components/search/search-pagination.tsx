"use client"

import { Pagination } from "@techsio/ui-kit/molecules/pagination"
import { useSearchParams } from "next/navigation"
import { StorefrontLink } from "@/components/storefront-link"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { buildPath, withPublicSearchParams } from "@/lib/url/public-url"

type SearchPaginationProps = {
  isVisible: boolean
  count: number
  currentPage: number
  pageSize: number
}

export function SearchPagination({
  isVisible,
  count,
  currentPage,
  pageSize,
}: SearchPaginationProps) {
  const { code: market } = useMarketContext()
  const searchParams = useSearchParams()
  const searchPath = buildPath({ kind: "search" }, market)
  const getPageUrl = ({ page }: { page: number }) => {
    const query = searchParams?.toString() ?? ""
    return withPublicSearchParams(
      query ? `${searchPath}?${query}` : searchPath,
      {
        page: page <= 1 ? null : page,
      }
    )
  }

  if (!isVisible) {
    return null
  }

  return (
    <Pagination
      count={count}
      getPageUrl={getPageUrl}
      linkAs={StorefrontLink}
      page={currentPage}
      pageSize={pageSize}
      size="sm"
      variant="outlined"
    />
  )
}
