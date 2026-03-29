import { cacheConfig as appCacheConfig } from "@/lib/cache-config"
import { isNotFoundError } from "@/lib/errors"
import { storefront } from "./storefront-preset"
import { useSuspenseAuth } from "./use-auth"

export type UseOrdersOptions = {
  limit?: number
  offset?: number
}

const ACCOUNT_ORDERS_LIMIT = 1000
const ORDER_NOT_FOUND_ERROR = "Objednávka nenalezena"
const ORDER_FETCH_FAILED_ERROR = "Nepodařilo se načíst objednávku"

type OrderListInput = {
  page?: number
  limit?: number
  offset?: number
  enabled?: boolean
}

type UseOrderInput = {
  id?: string
  enabled?: boolean
}

const AUTH_REQUIRED_ERROR = "Uživatel není přihlášen"

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

const sortOrders = <T extends { created_at?: string | Date | null }>(
  orders: T[]
): T[] =>
  [...orders].sort(
    (left, right) =>
      new Date(right.created_at ?? 0).getTime() -
      new Date(left.created_at ?? 0).getTime()
  )

const resolveOrderErrorMessage = (
  queryError: unknown,
  errorMessage: string | null
): string | null => {
  if (isNotFoundError(queryError)) {
    return ORDER_NOT_FOUND_ERROR
  }

  if (errorMessage) {
    return errorMessage
  }

  return queryError ? ORDER_FETCH_FAILED_ERROR : null
}

export function useSuspenseOrders(
  options?: UseOrdersOptions
): UseSuspenseOrdersResult {
  const { isAuthenticated } = useSuspenseAuth()

  assertAuthenticated(isAuthenticated)

  const limit = options?.limit ?? ACCOUNT_ORDERS_LIMIT
  const offset = options?.offset ?? 0

  const orders = storefront.hooks.orders.useSuspenseOrders({
    limit,
    offset,
  })

  return {
    ...orders,
    orders: sortOrders(orders.orders),
  }
}

export function useOrder(
  input: UseOrderInput,
  options?: UseOrderHookOptions
): UseOrderResult {
  const id = input.id ?? undefined
  const enabled = Boolean(id) && (input.enabled ?? true)
  const orderInput = { id, enabled }

  const order = storefront.hooks.orders.useOrder(orderInput, options)

  return {
    ...order,
    error: resolveOrderErrorMessage(order.query.error, order.error),
  }
}

export function useSuspensePublicOrder(
  orderId: string,
  options?: UseSuspenseOrderHookOptions
): UseSuspenseOrderResult {
  return storefront.hooks.orders.useSuspenseOrder(
    {
      id: orderId,
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
