import { useStorefrontOrders } from "./storefront-orders"

export function useOrders(userId?: string) {
  const { query } = useStorefrontOrders(
    {
      enabled: !!userId,
    },
    {
      queryOptions: {
        staleTime: 5 * 60 * 1000,
      },
    }
  )

  return query
}
