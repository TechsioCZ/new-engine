import type { HttpTypes } from "@medusajs/types"
import { createOrderHooks } from "@techsio/storefront-data/orders/hooks"
import {
  createMedusaOrderService,
  type MedusaOrderDetailInput,
  type MedusaOrderListInput,
} from "@techsio/storefront-data/orders/medusa-service"
import { createCacheConfig } from "@techsio/storefront-data/shared/cache-config"
import { cacheConfig as appCacheConfig } from "@/lib/cache-config"
import { isNotFoundError } from "@/lib/errors"
import { sdk } from "@/lib/medusa-client"
import { queryKeys } from "@/lib/query-keys"

export type OrderListInput = {
  page?: number
  limit?: number
  offset?: number
  enabled?: boolean
}

export type OrderDetailInput = {
  id?: string
  enabled?: boolean
}

type OrderListParams = MedusaOrderListInput
type OrderDetailParams = MedusaOrderDetailInput

export const ACCOUNT_ORDERS_PAGE_SIZE = 5
const MISSING_ORDER_ID_KEY = "__missing-order-id__"

const storefrontCacheConfig = createCacheConfig({
  userData: appCacheConfig.userData,
})

function buildListParams(input: OrderListInput): OrderListParams {
  const page = input.page ?? 1
  const limit = input.limit ?? 20
  const offset = input.offset ?? (page - 1) * limit

  return {
    limit,
    offset,
  }
}

function buildDetailParams(input: OrderDetailInput): OrderDetailParams {
  return {
    id: input.id,
  }
}

const orderQueryKeys = {
  all: () => queryKeys.orders.all(),
  list: (params: OrderListParams) =>
    queryKeys.orders.list({
      limit: params.limit,
      offset: params.offset,
    }),
  detail: (params: OrderDetailParams) =>
    queryKeys.orders.detail(params.id ?? MISSING_ORDER_ID_KEY),
}

const baseOrderService = createMedusaOrderService(sdk, {
  defaultFields: "*items",
})

const orderService = {
  async getOrders(params: OrderListParams, signal?: AbortSignal) {
    try {
      const response = await baseOrderService.getOrders(params, signal)

      const sortedOrders = [...(response.orders ?? [])].sort(
        (left, right) =>
          new Date(right.created_at ?? 0).getTime() -
          new Date(left.created_at ?? 0).getTime()
      )

      return {
        orders: sortedOrders,
        count: response.count,
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[OrderService] Failed to fetch orders:", error)
      }
      throw new Error("Nepodařilo se načíst objednávky")
    }
  },

  async getOrder(params: OrderDetailParams, signal?: AbortSignal) {
    if (!params.id) {
      return null
    }

    try {
      return await baseOrderService.getOrder(params, signal)
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new Error("Objednávka nenalezena")
      }

      if (process.env.NODE_ENV === "development") {
        console.error("[OrderService] Failed to fetch order:", error)
      }
      throw new Error("Nepodařilo se načíst objednávku")
    }
  },
}

export const orderHooks = createOrderHooks<
  HttpTypes.StoreOrder,
  OrderListInput,
  OrderListParams,
  OrderDetailInput,
  OrderDetailParams
>({
  service: orderService,
  buildListParams,
  buildDetailParams,
  queryKeys: orderQueryKeys,
  queryKeyNamespace: "n1",
  cacheConfig: storefrontCacheConfig,
  defaultPageSize: 20,
})

export function createOrdersListPrefetchQuery(
  input: OrderListInput = {
    page: 1,
    limit: ACCOUNT_ORDERS_PAGE_SIZE,
  }
) {
  const listParams = buildListParams(input)

  return {
    queryKey: orderQueryKeys.list(listParams),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      orderService.getOrders(listParams, signal),
    ...appCacheConfig.userData,
  }
}
