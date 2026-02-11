import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import type { OrderListResponse, OrderService } from "./types"

export type MedusaOrderServiceConfig = {
  defaultFields?: string
}

export type MedusaOrderListInput = {
  limit?: number
  offset?: number
  enabled?: boolean
}

export type MedusaOrderDetailInput = {
  id?: string
  enabled?: boolean
}

/**
 * Creates an OrderService for Medusa SDK
 *
 * @example
 * ```typescript
 * import { createOrderHooks, createMedusaOrderService } from "@techsio/storefront-data"
 * import { sdk } from "@/lib/medusa-client"
 *
 * const orderHooks = createOrderHooks({
 *   service: createMedusaOrderService(sdk, {
 *     defaultFields: "id,display_id,status,total,items,created_at",
 *   }),
 *   queryKeys: orderQueryKeys,
 * })
 * ```
 */
export function createMedusaOrderService(
  sdk: Medusa,
  config?: MedusaOrderServiceConfig
): OrderService<
  HttpTypes.StoreOrder,
  MedusaOrderListInput,
  MedusaOrderDetailInput
> {
  const { defaultFields } = config ?? {}

  return {
    async getOrders(
      params: MedusaOrderListInput,
      _signal?: AbortSignal
    ): Promise<OrderListResponse<HttpTypes.StoreOrder>> {
      const response = await sdk.store.order.list({
        fields: defaultFields,
        limit: params.limit,
        offset: params.offset,
      })
      return {
        orders: response.orders,
        count: response.count,
      }
    },

    async getOrder(
      params: MedusaOrderDetailInput,
      _signal?: AbortSignal
    ): Promise<HttpTypes.StoreOrder | null> {
      if (!params.id) {
        return null
      }
      const response = await sdk.store.order.retrieve(params.id, {
        fields: defaultFields,
      })
      return response.order ?? null
    },
  }
}
