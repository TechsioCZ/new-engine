import type { HttpTypes } from "@medusajs/types";
import type {
  MedusaOrderDetailInput,
  MedusaOrderListInput,
} from "@techsio/storefront-data/orders/medusa-service";
import type {
  OrderListResponse,
  OrderService,
} from "@techsio/storefront-data/orders/types";
import { storefrontSdk } from "./sdk";

export const HERBATIKA_ORDER_PAGE_SIZE = 10;

const ORDER_SORT = "-created_at";

const ORDER_LIST_FIELDS = [
  "id",
  "display_id",
  "status",
  "created_at",
  "updated_at",
  "currency_code",
  "total",
  "item_total",
  "items.id",
  "items.quantity",
].join(",");

const ORDER_DETAIL_FIELDS = [
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
  "billing_address.*",
  "shipping_address.*",
  "shipping_methods.*",
  "transactions.*",
  "payment_collections.*",
  "*items",
].join(",");

export type HerbatikaOrderListInput = MedusaOrderListInput & {
  page?: number;
  enabled?: boolean;
};

export type HerbatikaOrderDetailInput = MedusaOrderDetailInput & {
  enabled?: boolean;
};

type OrderWithFallbacks = HttpTypes.StoreOrder & {
  items?: HttpTypes.StoreOrderLineItem[] | null;
  shipping_methods?: unknown;
  payment_collections?: unknown;
  transactions?: unknown;
  billing_address?: unknown;
  shipping_address?: unknown;
};

const resolveErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const normalizedError = error as {
    status?: number;
    response?: { status?: number };
  };

  return normalizedError.status ?? normalizedError.response?.status;
};

export const buildHerbatikaOrderListParams = (
  input: HerbatikaOrderListInput,
): MedusaOrderListInput => {
  const { page, limit, offset, ...rest } = input;

  const resolvedLimit =
    typeof limit === "number" && limit > 0 ? limit : HERBATIKA_ORDER_PAGE_SIZE;
  const resolvedPage = typeof page === "number" && page > 0 ? page : 1;

  return {
    ...rest,
    limit: resolvedLimit,
    offset:
      typeof offset === "number" ? offset : (resolvedPage - 1) * resolvedLimit,
  };
};

const normalizeOrderListItem = (
  order: HttpTypes.StoreOrder,
): HttpTypes.StoreOrder => {
  const rawOrder = order as OrderWithFallbacks;

  return {
    ...rawOrder,
    items: Array.isArray(rawOrder.items) ? rawOrder.items : [],
  } as HttpTypes.StoreOrder;
};

const normalizeOrderDetail = (
  order: HttpTypes.StoreOrder,
): HttpTypes.StoreOrder => {
  const rawOrder = order as OrderWithFallbacks;

  return {
    ...rawOrder,
    items: Array.isArray(rawOrder.items) ? rawOrder.items : [],
    shipping_methods: Array.isArray(rawOrder.shipping_methods)
      ? rawOrder.shipping_methods
      : [],
    payment_collections: Array.isArray(rawOrder.payment_collections)
      ? rawOrder.payment_collections
      : [],
    transactions: Array.isArray(rawOrder.transactions)
      ? rawOrder.transactions
      : [],
    billing_address:
      rawOrder.billing_address && typeof rawOrder.billing_address === "object"
        ? rawOrder.billing_address
        : null,
    shipping_address:
      rawOrder.shipping_address && typeof rawOrder.shipping_address === "object"
        ? rawOrder.shipping_address
        : null,
  } as HttpTypes.StoreOrder;
};

export const herbatikaOrderService: OrderService<
  HttpTypes.StoreOrder,
  MedusaOrderListInput,
  MedusaOrderDetailInput
> = {
  async getOrders(
    params: MedusaOrderListInput,
    signal?: AbortSignal,
  ): Promise<OrderListResponse<HttpTypes.StoreOrder>> {
    const response = await storefrontSdk.client.fetch<HttpTypes.StoreOrderListResponse>(
      "/store/orders",
      {
        query: {
          fields: ORDER_LIST_FIELDS,
          order: ORDER_SORT,
          limit: params.limit,
          offset: params.offset,
        },
        signal,
      },
    );

    return {
      orders: (response.orders ?? []).map(normalizeOrderListItem),
      count: response.count ?? 0,
    };
  },

  async getOrder(
    params: MedusaOrderDetailInput,
    signal?: AbortSignal,
  ): Promise<HttpTypes.StoreOrder | null> {
    if (!params.id) {
      return null;
    }

    try {
      const response = await storefrontSdk.client.fetch<{
        order?: HttpTypes.StoreOrder;
      }>(`/store/orders/${params.id}`, {
        query: {
          fields: ORDER_DETAIL_FIELDS,
        },
        signal,
      });

      if (!response.order) {
        return null;
      }

      return normalizeOrderDetail(response.order);
    } catch (error) {
      if (resolveErrorStatus(error) === 404) {
        return null;
      }

      throw error;
    }
  },
};
