import type { StoreOrder } from "@medusajs/types"

import { sdk } from "@/lib/medusa-client"

// Export types for reuse in components/hooks
export type { StoreOrder } from "@medusajs/types"

export type OrdersResponse = {
  orders: StoreOrder[]
  count: number
  offset: number
  limit: number
}

export type GetOrdersParams = {
  limit?: number
  offset?: number
  fields?: string
}

export async function getOrders(
  params?: GetOrdersParams
): Promise<OrdersResponse> {
  const limit = params?.limit || 20
  const offset = params?.offset || 0
  const fields = params?.fields || "*items" // Lightweight for list view

  try {
    const response = await sdk.store.order.list({
      fields,
      order: "-created_at", // Sort by newest first
      limit,
      offset,
    })

    return {
      orders: response.orders || [],
      count: response.count || 0,
      offset,
      limit,
    }
  } catch (err) {
    if (process.env["NODE_ENV"] === "development") {
      console.error("[OrderService] Failed to fetch orders:", err)
    }
    throw new Error("Nepodařilo se načíst objednávky")
  }
}

export async function getOrderById(orderId: string): Promise<StoreOrder> {
  try {
    const response = await sdk.store.order.retrieve(orderId)

    if (!response.order) {
      throw new Error("Objednávka nenalezena")
    }

    return response.order
  } catch (err) {
    if (process.env["NODE_ENV"] === "development") {
      console.error("[OrderService] Failed to fetch order:", err)
    }
    throw new Error("Nepodařilo se načíst objednávku")
  }
}
