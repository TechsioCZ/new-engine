"use client"

import type {
  HerbaticaOrderDetailInput,
  HerbaticaOrderListInput,
} from "./order-query-config"
import { storefront } from "./storefront"

const orderHooks = storefront.hooks.orders

export const {
  useOrders,
  useOrder,
  getDetailQueryOptions: getOrderDetailQueryOptions,
} = orderHooks

export type OrderListInput = HerbaticaOrderListInput
export type OrderDetailInput = HerbaticaOrderDetailInput
