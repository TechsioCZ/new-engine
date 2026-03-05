import type { HttpTypes } from "@medusajs/types"
import {
  createOrdersListPrefetchQuery,
  orderHooks,
} from "./order-hooks-base"
import { useSuspenseAuth } from "./use-auth"

export type UseOrdersOptions = {
  limit?: number
  offset?: number
}

type SuspenseOrdersData = {
  orders: HttpTypes.StoreOrder[]
  count: number
  offset: number
  limit: number
}

type SuspenseOrderData = HttpTypes.StoreOrder

type UseOrderInput = {
  id?: string | null
  enabled?: boolean
}

type UseOrderHookOptions = Parameters<typeof orderHooks.useOrder>[1]
type UseSuspenseOrderHookOptions =
  Parameters<typeof orderHooks.useSuspenseOrder>[1]

const AUTH_REQUIRED_ERROR = "Uživatel není přihlášen"
const ORDER_ID_REQUIRED_ERROR = "Order ID je povinný"

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

const mapSuspenseOrderResult = (
  result: ReturnType<typeof orderHooks.useSuspenseOrder>
) => ({
  // Keep `data` as a legacy alias for existing call-sites that expect query-style naming.
  data: result.order as SuspenseOrderData | null,
  order: result.order,
})

export function useSuspenseOrders(options?: UseOrdersOptions) {
  const { isAuthenticated } = useSuspenseAuth()

  assertAuthenticated(isAuthenticated)

  const limit = options?.limit ?? 20
  const offset = options?.offset ?? 0

  const orders = orderHooks.useSuspenseOrders({
    limit,
    offset,
  })

  const data: SuspenseOrdersData = {
    orders: orders.orders,
    count: orders.totalCount,
    offset,
    limit,
  }

  return {
    data,
    orders: orders.orders,
    totalCount: orders.totalCount,
    currentPage: orders.currentPage,
    totalPages: orders.totalPages,
    hasNextPage: orders.hasNextPage,
    hasPrevPage: orders.hasPrevPage,
  }
}

export function useSuspenseOrder(
  orderId: string | null,
  options?: UseSuspenseOrderHookOptions
) {
  const { isAuthenticated } = useSuspenseAuth()
  assertAuthenticated(isAuthenticated)
  const requiredOrderId = assertOrderId(orderId)

  const order = orderHooks.useSuspenseOrder(
    {
      id: requiredOrderId,
    },
    options
  )
  return mapSuspenseOrderResult(order)
}

export function useOrder(input: UseOrderInput, options?: UseOrderHookOptions) {
  const id = input.id ?? undefined
  const enabled = Boolean(id) && (input.enabled ?? true)

  return orderHooks.useOrder(
    {
      id,
      enabled,
    },
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
  return mapSuspenseOrderResult(order)
}

export { createOrdersListPrefetchQuery }
