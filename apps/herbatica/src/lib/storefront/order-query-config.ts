import type {
  MedusaOrderDetailInput,
  MedusaOrderListInput,
} from "@techsio/storefront-data/orders/medusa-service"

export const HERBATICA_ORDER_PAGE_SIZE = 10

export type HerbaticaOrderListInput = MedusaOrderListInput & {
  page?: number
  enabled?: boolean
}

export type HerbaticaOrderDetailInput = MedusaOrderDetailInput & {
  enabled?: boolean
}

export const buildHerbaticaOrderListParams = (
  input: HerbaticaOrderListInput
): MedusaOrderListInput => {
  const { page, limit, offset, ...rest } = input

  const resolvedLimit =
    typeof limit === "number" && limit > 0 ? limit : HERBATICA_ORDER_PAGE_SIZE
  const resolvedPage = typeof page === "number" && page > 0 ? page : 1

  return {
    ...rest,
    limit: resolvedLimit,
    offset:
      typeof offset === "number" ? offset : (resolvedPage - 1) * resolvedLimit,
  }
}
