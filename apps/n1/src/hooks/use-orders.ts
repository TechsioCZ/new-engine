import { cacheConfig as appCacheConfig } from "@/lib/cache-config"
import { storefront } from "./storefront-preset"
import { useSuspenseAuth } from "./use-auth"

export type UseOrdersOptions = {
  limit?: number
  offset?: number
}

const ACCOUNT_ORDERS_LIMIT = 1000

type OrderListInput = {
  page?: number
  limit?: number
  offset?: number
  enabled?: boolean
}

type UseOrderInput = {
  id?: string | null
  enabled?: boolean
}

const AUTH_REQUIRED_ERROR = "Uživatel není přihlášen"
const ORDER_ID_REQUIRED_ERROR = "Order ID je povinný"

type OrderHooks = typeof storefront.hooks.orders
type UseOrderHookOptions = Parameters<OrderHooks["useOrder"]>[1]
type UseSuspenseOrderHookOptions = Parameters<OrderHooks["useSuspenseOrder"]>[1]
type UseSuspenseOrdersResult = ReturnType<OrderHooks["useSuspenseOrders"]>
type UseOrderResult = ReturnType<OrderHooks["useOrder"]>
type UseSuspenseOrderResult = ReturnType<OrderHooks["useSuspenseOrder"]>
type OrdersListPrefetchQuery = ReturnType<OrderHooks["getListQueryOptions"]>

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

export function useSuspenseOrders(
  options?: UseOrdersOptions
): UseSuspenseOrdersResult {
  const { isAuthenticated } = useSuspenseAuth()

  assertAuthenticated(isAuthenticated)

  const limit = options?.limit ?? ACCOUNT_ORDERS_LIMIT
  const offset = options?.offset ?? 0

  return storefront.hooks.orders.useSuspenseOrders({
    limit,
    offset,
  })
}

export function useOrder(
  input: UseOrderInput,
  options?: UseOrderHookOptions
): UseOrderResult {
  const id = input.id ?? undefined
  const enabled = Boolean(id) && (input.enabled ?? true)
  const orderInput = { id, enabled }

  return storefront.hooks.orders.useOrder(orderInput, options)
}

export function useSuspensePublicOrder(
  orderId: string | null,
  options?: UseSuspenseOrderHookOptions
): UseSuspenseOrderResult {
  const requiredOrderId = assertOrderId(orderId)

  return storefront.hooks.orders.useSuspenseOrder(
    {
      id: requiredOrderId,
    },
    options
  )
}

export function createOrdersListPrefetchQuery(
  input: OrderListInput = {
    page: 1,
    limit: ACCOUNT_ORDERS_LIMIT,
  }
): OrdersListPrefetchQuery {
  return storefront.hooks.orders.getListQueryOptions(input, {
    queryOptions: appCacheConfig.userData,
  })
}
