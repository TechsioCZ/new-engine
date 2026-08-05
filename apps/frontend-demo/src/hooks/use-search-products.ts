import { useState } from "react"

import { getProducts } from "@/services"
import type { Product } from "@/types/product"

import { useRegions } from "./use-region"

interface UseSearchProductsOptions {
  limit?: number
  fields?: string
}

export function useSearchProducts(options?: UseSearchProductsOptions) {
  const { selectedRegion } = useRegions()
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const searchProducts = async (query: string) => {
    // Clear results if query is empty
    if (!query.trim()) {
      setSearchResults([])
      setError(null)
      return []
    }

    setIsSearching(true)
    setError(null)

    try {
      const response = await getProducts({
        fields: options?.fields || "id, handle, title",
        limit: options?.limit || 10,
        q: query,
        region_id: selectedRegion?.id,
        sort: "newest",
      })

      setSearchResults(response.products)
      return response.products
    } catch (error) {
      const searchError = error as Error
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
