"use client";

import { storefront } from "./storefront";
import type {
  HerbatikaOrderDetailInput,
  HerbatikaOrderListInput,
} from "./orders-service";

export const orderService = storefront.services.orders;
export const orderQueryKeys = storefront.queryKeys.orders;
export const orderHooks = storefront.hooks.orders;

export const {
  useOrders,
  useSuspenseOrders,
  useOrder,
  useSuspenseOrder,
  getListQueryOptions: getOrderListQueryOptions,
  getDetailQueryOptions: getOrderDetailQueryOptions,
} = orderHooks;

export type OrderListInput = HerbatikaOrderListInput;
export type OrderDetailInput = HerbatikaOrderDetailInput;
