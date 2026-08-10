"use client"

import { storefront } from "./storefront"

const orderHooks: typeof storefront.hooks.orders = storefront.hooks.orders

export const useOrders: typeof orderHooks.useOrders = orderHooks.useOrders
export const useOrder: typeof orderHooks.useOrder = orderHooks.useOrder
export const getOrderDetailQueryOptions: typeof orderHooks.getDetailQueryOptions =
  orderHooks.getDetailQueryOptions
