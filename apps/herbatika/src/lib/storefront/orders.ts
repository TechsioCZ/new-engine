"use client"

import { storefront } from "./storefront"

const orderHooks = storefront.hooks.orders

export const {
  useOrders,
  useOrder,
  getDetailQueryOptions: getOrderDetailQueryOptions,
} = orderHooks
