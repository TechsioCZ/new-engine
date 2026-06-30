import { useQueryClient } from "@tanstack/react-query"
import { useRegions } from "@/hooks/use-region"
import { queryKeys } from "@/lib/query-keys"
import { getProduct } from "@/services/product-service"

export function usePrefetchProduct(enabled?: boolean) {
  const { selectedRegion } = useRegions()
  const queryClient = useQueryClient()
  const enabledPrefetch = enabled ?? true

  const prefetchProduct = (handle: string) => {
    if (!enabledPrefetch) {
      return
    }
    queryClient.prefetchQuery({
      queryKey: queryKeys.product(handle, selectedRegion?.id),
      queryFn: async () => {
        const product = await getProduct(handle, selectedRegion?.id)
        return product
      },
      staleTime: 60 * 60 * 1000,
    })
  }

  return prefetchProduct
}
