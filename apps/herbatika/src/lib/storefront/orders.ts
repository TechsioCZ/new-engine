import type { HttpTypes } from "@medusajs/types";
import {
  createMedusaOrderService,
  createOrderHooks,
  createOrderQueryKeys,
  type MedusaOrderDetailInput,
  type MedusaOrderListInput,
} from "@techsio/storefront-data";
import { storefrontCacheConfig } from "./cache";
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys";
import { storefrontSdk } from "./sdk";

const DEFAULT_PAGE_SIZE = 10;

type OrderListInput = MedusaOrderListInput & {
  page?: number;
  enabled?: boolean;
};

type OrderDetailInput = MedusaOrderDetailInput & {
  enabled?: boolean;
};

const toOrderListParams = (input: OrderListInput): MedusaOrderListInput => {
  const { page, limit, offset, ...rest } = input;

  const resolvedLimit =
    typeof limit === "number" && limit > 0 ? limit : DEFAULT_PAGE_SIZE;
  const resolvedPage = typeof page === "number" && page > 0 ? page : 1;

  return {
    ...rest,
    limit: resolvedLimit,
    offset:
      typeof offset === "number" ? offset : (resolvedPage - 1) * resolvedLimit,
  };
};

export const orderService = createMedusaOrderService(storefrontSdk, {
  defaultFields:
    [
      "id",
      "display_id",
      "status",
      "created_at",
      "updated_at",
      "currency_code",
      "email",
      "total",
      "item_total",
      "shipping_total",
      "tax_total",
      "items.id",
      "items.title",
      "items.quantity",
      "items.unit_price",
      "items.total",
      "items.thumbnail",
      "items.variant_title",
    ].join(","),
});

export const orderQueryKeys = createOrderQueryKeys<
  MedusaOrderListInput,
  MedusaOrderDetailInput
>(STOREFRONT_QUERY_KEY_NAMESPACE);

export const orderHooks = createOrderHooks<
  HttpTypes.StoreOrder,
  OrderListInput,
  MedusaOrderListInput,
  OrderDetailInput,
  MedusaOrderDetailInput
>({
  service: orderService,
  queryKeys: orderQueryKeys,
  queryKeyNamespace: STOREFRONT_QUERY_KEY_NAMESPACE,
  cacheConfig: storefrontCacheConfig,
  buildListParams: toOrderListParams,
  buildDetailParams: (input) => input,
  defaultPageSize: DEFAULT_PAGE_SIZE,
});

export const {
  useOrders,
  useSuspenseOrders,
  useOrder,
  useSuspenseOrder,
} = orderHooks;

export type { OrderListInput, OrderDetailInput };
