import { useCallback, useState } from "react"
import { getProducts } from "@/services"
import type { Product } from "@/types/product"
import { useRegions } from "./use-region"

type UseSearchProductsOptions = {
  limit?: number
  fields?: string
}

export function useSearchProducts(options?: UseSearchProductsOptions) {
  const { selectedRegion } = useRegions()
  const selectedCountryCode = selectedRegion?.countries?.[0]?.iso_2
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
        const response = await getProducts({
          q: query,
          fields: options?.fields || "id, handle, title",
          limit: options?.limit || 10,
          sort: "newest",
          region_id: selectedRegion?.id,
          country_code: selectedCountryCode,
        })

        setSearchResults(response.products)
        return response.products
      } catch (err) {
        const searchError = err as Error
        console.error("Search error:", searchError)
        setError(searchError)
        setSearchResults([])
        return []
      } finally {
        setIsSearching(false)
      }
    },
    [options?.fields, options?.limit, selectedCountryCode, selectedRegion?.id]
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
