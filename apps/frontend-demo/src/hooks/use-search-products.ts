import { useCallback, useState } from "react"
import type { Product } from "@/types/product"

type UseSearchProductsOptions = {
  limit?: number
  fields?: string
}

// Temporary no-op: keep the header search UI for layout continuity,
// but restore real product search in a follow-up PR with Meilisearch.
export function useSearchProducts(_options?: UseSearchProductsOptions) {
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const searchProducts = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setError(null)
      return Promise.resolve([] as Product[])
    }

    setIsSearching(true)
    setError(null)
    setSearchResults([])
    setIsSearching(false)

    return Promise.resolve([] as Product[])
  }, [])

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
