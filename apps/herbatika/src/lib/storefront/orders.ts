"use client";

import { storefront } from "./storefront";
import type {
  HerbatikaOrderDetailInput,
  HerbatikaOrderListInput,
} from "./order-query-config";

const orderHooks = storefront.hooks.orders;

export const {
  useOrders,
  useOrder,
  getDetailQueryOptions: getOrderDetailQueryOptions,
} = orderHooks;

export type OrderListInput = HerbatikaOrderListInput;
export type OrderDetailInput = HerbatikaOrderDetailInput;
