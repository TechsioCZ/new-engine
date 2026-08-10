"use client"

import type { SetValues } from "nuqs"
import { useEffect } from "react"

import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import type { plpQueryParsers } from "@/lib/storefront/plp-query-state"

interface UseCatalogListingPageBoundsInput {
  isLoading: boolean
  isQueryEnabled: boolean
  page: number
  setQueryState: SetValues<typeof plpQueryParsers>
  totalPages: number
}

const synchronizeCatalogPageBounds = async (
  setQueryState: SetValues<typeof plpQueryParsers>,
  safeLastPage: number,
) => {
  await setQueryState({ page: safeLastPage })
}

export const useCatalogListingPageBounds = ({
  isLoading,
  isQueryEnabled,
  page,
  setQueryState,
  totalPages,
}: UseCatalogListingPageBoundsInput) => {
  useEffect(() => {
    if (!isQueryEnabled || isLoading) {
      return
    }

    const safeLastPage = Math.max(totalPages, 1)
    if (page <= safeLastPage) {
      return
    }

    runDetachedPromise(
      synchronizeCatalogPageBounds(setQueryState, safeLastPage),
    )
  }, [isLoading, isQueryEnabled, page, setQueryState, totalPages])
}
