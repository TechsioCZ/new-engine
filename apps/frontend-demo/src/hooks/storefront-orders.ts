"use client"

import type { HttpTypes } from "@medusajs/types"
import { createOrderHooks } from "@techsio/storefront-data/orders/hooks"
import {
  createMedusaOrderService,
  type MedusaOrderDetailInput,
  type MedusaOrderListInput,
} from "@techsio/storefront-data/orders/medusa-service"
import type { OrderQueryKeys } from "@techsio/storefront-data/orders/types"
import { ORDER_FIELDS } from "@/lib/order-utils"
import { queryKeys } from "@/lib/query-keys"
import { sdk } from "@/lib/medusa-client"

type StorefrontOrderListInput = MedusaOrderListInput & {
  page?: number
  enabled?: boolean
}

type StorefrontOrderDetailInput = MedusaOrderDetailInput & {
  enabled?: boolean
}

const resolveOrderListPage = (params: MedusaOrderListInput) => {
  if (
    typeof params.limit === "number" &&
    params.limit > 0 &&
    typeof params.offset === "number"
  ) {
    return Math.floor(params.offset / params.limit) + 1
  }

  return undefined
}

const orderQueryKeys: OrderQueryKeys<
  MedusaOrderListInput,
  MedusaOrderDetailInput
> = {
  all: () => queryKeys.orders.all(),
  list: (params) =>
    queryKeys.orders.list({
      page: resolveOrderListPage(params),
      limit: params.limit,
    }),
  detail: (params) => queryKeys.orders.detail(params.id),
}

const orderHooks = createOrderHooks<
  HttpTypes.StoreOrder,
  StorefrontOrderListInput,
  MedusaOrderListInput,
  StorefrontOrderDetailInput,
  MedusaOrderDetailInput
>({
  service: createMedusaOrderService(sdk, {
    defaultFields: ORDER_FIELDS.join(","),
  }),
  buildListParams: (input) => ({
    limit: input.limit,
    offset: input.offset,
  }),
  buildDetailParams: (input) => ({
    id: input.id,
  }),
  queryKeys: orderQueryKeys,
})

export const {
  useOrders: useStorefrontOrders,
  useOrder: useStorefrontOrder,
} = orderHooks
