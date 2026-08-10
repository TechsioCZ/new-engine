import { useState } from "react"

import { getProducts } from "@/services"
import type { Product } from "@/types/product"

import { useRegions } from "./use-region"

interface UseSearchProductsOptions {
  limit?: number
  fields?: string
}

export const useSearchProducts = (options?: UseSearchProductsOptions) => {
  const { selectedRegion } = useRegions()
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const searchProducts = async (query: string) => {
    // Clear results if query is empty
    if (query.trim().length === 0) {
      setSearchResults([])
      setError(null)
      return []
    }

    setIsSearching(true)
    setError(null)

    try {
      const response = await getProducts({
        fields:
          options?.fields === undefined || options.fields.length === 0
            ? "id, handle, title"
            : options.fields,
        limit:
          options?.limit === undefined || options.limit === 0
            ? 10
            : options.limit,
        q: query,
        region_id: selectedRegion?.id,
        sort: "newest",
      })

      setSearchResults(response.products)
      return response.products
    } catch (caughtError) {
      const searchError =
        caughtError instanceof Error
          ? caughtError
          : new Error("Product search failed", { cause: caughtError })
      console.error("Search error:", searchError)
      setError(searchError)
      setSearchResults([])
      return []
    } finally {
      setIsSearching(false)
    }
  }

  const clearResults = () => {
    setSearchResults([])
    setError(null)
  }

  return {
    clearResults,
    error,
    isSearching,
    searchProducts,
    searchResults,
  }
}
