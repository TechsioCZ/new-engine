import type { StoreOrder } from "@medusajs/types"

import { sdk } from "@/lib/medusa-client"

// Export types for reuse in components/hooks
export type { StoreOrder } from "@medusajs/types"

export interface OrdersResponse {
  orders: StoreOrder[]
  count: number
  offset: number
  limit: number
}

export interface GetOrdersParams {
  limit?: number
  offset?: number
  fields?: string
}

export const getOrders = async (
  params?: GetOrdersParams,
): Promise<OrdersResponse> => {
  const limit = params?.limit === 0 ? 20 : (params?.limit ?? 20)
  const offset = params?.offset ?? 0
  // Lightweight fields for list view
  const fields = params?.fields === "" ? "*items" : (params?.fields ?? "*items")

  try {
    const response = await sdk.store.order.list({
      fields,
      limit,
      offset,
      // Sort by newest first
      order: "-created_at",
    })

    return {
      count: response.count,
      limit,
      offset,
      orders: response.orders,
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[OrderService] Failed to fetch orders:", error)
    }
    throw new Error("Nepodařilo se načíst objednávky", { cause: error })
  }
}

export const getOrderById = async (orderId: string): Promise<StoreOrder> => {
  try {
    const response = await sdk.store.order.retrieve(orderId)

    return response.order
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[OrderService] Failed to fetch order:", error)
    }
    throw new Error("Nepodařilo se načíst objednávku", { cause: error })
  }
}
