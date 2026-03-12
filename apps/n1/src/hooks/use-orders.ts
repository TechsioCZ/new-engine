import { cacheConfig as appCacheConfig } from "@/lib/cache-config"
import { storefront } from "./storefront-preset"
import { useSuspenseAuth } from "./use-auth"

export type UseOrdersOptions = {
  limit?: number
  offset?: number
}

type OrderListInput = {
  page?: number
  limit?: number
  offset?: number
  enabled?: boolean
}

type OrderDetailInput = {
  id?: string
  enabled?: boolean
}

type UseOrderInput = {
  id?: string | null
  enabled?: boolean
}

const AUTH_REQUIRED_ERROR = "Uživatel není přihlášen"
const ORDER_ID_REQUIRED_ERROR = "Order ID je povinný"

const orderHooks = storefront.hooks.orders

type UseOrderHookOptions = Parameters<typeof orderHooks.useOrder>[1]
type UseSuspenseOrderHookOptions =
  Parameters<typeof orderHooks.useSuspenseOrder>[1]

const assertAuthenticated = (isAuthenticated: boolean) => {
  if (!isAuthenticated) {
    throw new Error(AUTH_REQUIRED_ERROR)
  }
}

const assertOrderId = (orderId: string | null): string => {
  if (!orderId) {
    throw new Error(ORDER_ID_REQUIRED_ERROR)
  }
  return orderId
}

export function useSuspenseOrders(options?: UseOrdersOptions) {
  const { isAuthenticated } = useSuspenseAuth()

  assertAuthenticated(isAuthenticated)

  const limit = options?.limit ?? 20
  const offset = options?.offset ?? 0

  const orders = orderHooks.useSuspenseOrders({
    limit,
    offset,
  })

  return {
    orders: orders.orders,
    totalCount: orders.totalCount,
    currentPage: orders.currentPage,
    totalPages: orders.totalPages,
    hasNextPage: orders.hasNextPage,
    hasPrevPage: orders.hasPrevPage,
  }
}

export function useOrder(input: UseOrderInput, options?: UseOrderHookOptions) {
  const id = input.id ?? undefined
  const enabled = Boolean(id) && (input.enabled ?? true)

  return orderHooks.useOrder(
    {
      id,
      enabled,
    } as OrderDetailInput,
    options
  )
}

export function useSuspensePublicOrder(
  orderId: string | null,
  options?: UseSuspenseOrderHookOptions
) {
  const requiredOrderId = assertOrderId(orderId)

  const order = orderHooks.useSuspenseOrder(
    {
      id: requiredOrderId,
    },
    options
  )
  return order
}

export function createOrdersListPrefetchQuery(
  input: OrderListInput = {
    page: 1,
    limit: 20,
  }
) {
  return orderHooks.createOrdersListQueryOptions(input, {
    queryOptions: appCacheConfig.userData,
  })
}
