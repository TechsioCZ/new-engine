import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useState } from "react"
import { resolveRegionCountryCode } from "@/lib/region-utils"
import type { Product } from "@/types/product"
import {
  buildStorefrontProductListParams,
  fetchStorefrontProducts,
  storefrontProductQueryKeys,
} from "./storefront-products"
import { useRegions } from "./use-region"

interface UseSearchProductsOptions {
  limit?: number
  fields?: string
}

export function useSearchProducts(options?: UseSearchProductsOptions) {
  const queryClient = useQueryClient()
  const { selectedRegion } = useRegions()
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const searchProducts = useCallback(
    async (query: string) => {
      // Clear results if query is empty
      if (!query.trim()) {
        setSearchResults([])
        setError(null)
        return []
      }

      setIsSearching(true)
      setError(null)

      try {
        const countryCode = resolveRegionCountryCode(selectedRegion)
        const listInput = {
          q: query,
          fields: options?.fields || "id, handle, title",
          limit: options?.limit || 10,
          sort: "newest",
          region_id: selectedRegion?.id,
          country_code: countryCode,
        }

        const listParams = buildStorefrontProductListParams(listInput)

        const response = await queryClient.fetchQuery({
          queryKey: storefrontProductQueryKeys.list(listParams),
          queryFn: () => fetchStorefrontProducts(listInput),
          staleTime: 30 * 1000,
        })

        setSearchResults(response.products)
        return response.products
      } catch (err) {
        const error = err as Error
        console.error("Search error:", error)
        setError(error)
        setSearchResults([])
        return []
      } finally {
        setIsSearching(false)
      }
    },
    [options?.fields, options?.limit, queryClient, selectedRegion]
  )

  const clearResults = useCallback(() => {
    setSearchResults([])
    setError(null)
  }, [])

  return {
    searchResults,
    isSearching,
    error,
    searchProducts,
    clearResults,
  }
}
