"use client"

import { storefront } from "@/lib/storefront"

export function useOrders(userId?: string) {
  return storefront.hooks.orders.useOrders({
    enabled: !!userId,
  }).query
}
