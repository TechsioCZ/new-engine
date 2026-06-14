"use client"

import type {
  HerbatikaOrderDetailInput,
  HerbatikaOrderListInput,
} from "./order-query-config"
import { storefront } from "./storefront"

const orderHooks = storefront.hooks.orders

export const {
  useOrders,
  useOrder,
  getDetailQueryOptions: getOrderDetailQueryOptions,
} = orderHooks

export type OrderListInput = HerbatikaOrderListInput
export type OrderDetailInput = HerbatikaOrderDetailInput
