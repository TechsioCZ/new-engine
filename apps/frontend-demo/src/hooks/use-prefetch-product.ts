import { useQueryClient } from "@tanstack/react-query"

import { useRegions } from "@/hooks/use-region"
import { queryKeys } from "@/lib/query-keys"
import { getProduct } from "@/services/product-service"

export const usePrefetchProduct = (enabled = true) => {
  const { selectedRegion } = useRegions()
  const queryClient = useQueryClient()

  const prefetchProduct = (handle: string) => {
    if (!enabled) {
      return
    }
    void queryClient.prefetchQuery({
      queryFn: async () => {
        const product = await getProduct(handle, selectedRegion?.id)
        return product
      },
      queryKey: queryKeys.product(handle, selectedRegion?.id),
      staleTime: 60 * 60 * 1000,
    })
  }

  return prefetchProduct
}
