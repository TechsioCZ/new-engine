"use client"

import { createQueryKey } from "@techsio/storefront-data/shared/query-keys"
import { useInfiniteQuery } from "@tanstack/react-query"
import type { BlogListing } from "@/lib/storefront/blog-content"
import { resolveBlogListingApiHref } from "@/lib/storefront/blog-routing"
import { storefrontCacheConfig } from "@/lib/storefront/cache"
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "@/lib/storefront/query-keys"

const fetchBlogListingPage = async ({
  category,
  page,
  signal,
}: {
  category: string
  page: number
  signal?: AbortSignal
}) => {
  const response = await fetch(
    resolveBlogListingApiHref({
      category,
      page,
    }),
    {
      headers: {
        accept: "application/json",
      },
      signal,
    }
  )

  if (!response.ok) {
    throw new Error(`Blog listing request failed with ${response.status}`)
  }

  return (await response.json()) as BlogListing
}

export const useBlogListingPages = (initialListing: BlogListing) =>
  useInfiniteQuery({
    queryKey: createQueryKey(
      STOREFRONT_QUERY_KEY_NAMESPACE,
      "cms-blog-listing",
      "infinite",
      {
        category: initialListing.category,
        page: initialListing.page,
      }
    ),
    queryFn: ({ pageParam, signal }) =>
      fetchBlogListingPage({
        category: initialListing.category,
        page: pageParam,
        signal,
      }),
    initialPageParam: initialListing.page,
    initialData: {
      pages: [initialListing],
      pageParams: [initialListing.page],
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? lastPage.page + 1 : undefined,
    ...storefrontCacheConfig.semiStatic,
    gcTime: 0,
  })
