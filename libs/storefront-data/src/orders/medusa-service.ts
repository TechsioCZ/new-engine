import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import { getErrorStatus } from "../shared/medusa-errors"
import type { OrderListResponse, OrderService } from "./types"

export type MedusaOrderServiceConfig = {
  defaultFields?: string
  defaultListFields?: string
  defaultDetailFields?: string
  defaultOrder?: string
  returnNullOnNotFound?: boolean
}

export type MedusaOrderListInput = {
  limit?: number
  offset?: number
}

export type MedusaOrderListHookInput = MedusaOrderListInput & {
  page?: number
  enabled?: boolean
}

export type MedusaOrderDetailInput = {
  id?: string
}

export type MedusaOrderDetailHookInput = MedusaOrderDetailInput & {
  enabled?: boolean
}

/**
 * Creates an OrderService for Medusa SDK
 *
 * @example
 * ```typescript
 * import { createOrderHooks } from "@techsio/storefront-data/orders/hooks"
 * import { createMedusaOrderService } from "@techsio/storefront-data/orders/medusa-service"
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
  const {
    defaultFields,
    defaultListFields,
    defaultDetailFields,
    defaultOrder,
    returnNullOnNotFound = false,
  } = config ?? {}

  const listFields = defaultListFields ?? defaultFields
  const detailFields = defaultDetailFields ?? defaultFields

  return {
    async getOrders(
      params: MedusaOrderListInput,
      signal?: AbortSignal
    ): Promise<OrderListResponse<HttpTypes.StoreOrder>> {
      const response = await sdk.client.fetch<HttpTypes.StoreOrderListResponse>(
        "/store/orders",
        {
          query: {
            fields: listFields,
            order: defaultOrder,
            limit: params.limit,
            offset: params.offset,
          },
          signal,
        }
      )
      return {
        orders: response.orders ?? [],
        count: response.count,
      }
    },

    async getOrder(
      params: MedusaOrderDetailInput,
      signal?: AbortSignal
    ): Promise<HttpTypes.StoreOrder | null> {
      if (!params.id) {
        return null
      }

      try {
        const response = await sdk.client.fetch<{ order: HttpTypes.StoreOrder }>(
          `/store/orders/${params.id}`,
          {
            query: {
              fields: detailFields,
            },
            signal,
          }
        )

        return response.order ?? null
      } catch (error) {
        if (returnNullOnNotFound && getErrorStatus(error) === 404) {
          return null
        }

        throw error
      }
    },
  }
}
