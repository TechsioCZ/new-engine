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
  "payment_status",
  "fulfillment_status",
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
  "payment_status",
  "fulfillment_status",
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

export const herbatikaOrderService: OrderService<
  HttpTypes.StoreOrder,
  MedusaOrderListInput,
  MedusaOrderDetailInput
> = {
  async getOrders(
    params: MedusaOrderListInput,
    signal?: AbortSignal,
  ): Promise<OrderListResponse<HttpTypes.StoreOrder>> {
    // Shared Medusa order service does not yet support separate list/detail fields
    // plus deterministic list sorting, so Herbatika keeps this read-only adapter.
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
      orders: response.orders ?? [],
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

      return response.order;
    } catch (error) {
      if (resolveErrorStatus(error) === 404) {
        return null;
      }

      throw error;
    }
  },
};
