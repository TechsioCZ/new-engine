import { compactRecord } from "@techsio/std/object"

import { resolvePagination } from "../shared/pagination"
import type {
  ProductListDetailInputBase,
  ProductListListInputBase,
} from "./types"

export const stripListInput = <TInput extends ProductListListInputBase>(
  input: TInput,
) => {
  const {
    enabled: _enabled,
    customerId: _customerId,
    page: _page,
    ...params
  } = input

  return params
}

export const stripDetailInput = <TInput extends ProductListDetailInputBase>(
  input: TInput,
) => {
  const { enabled: _enabled, customerId: _customerId, ...params } = input

  return params
}

export const createDefaultListParams = (
  input: ProductListListInputBase,
  defaultPageSize: number,
) => {
  const params = stripListInput(input) as Record<string, unknown>

  if (typeof input.page !== "number") {
    return compactRecord(params)
  }

  const pagination = resolvePagination(
    compactRecord({
      limit: input.limit,
      offset: input.offset,
      page: input.page,
    }),
    defaultPageSize,
  )

  return compactRecord({
    ...params,
    limit: pagination.limit,
    offset: pagination.offset,
  })
}

export const withCustomerScope = <
  TInput extends { customerId?: string | null },
>(
  params: unknown,
  input: TInput,
) => ({
  ...(params as object),
  customerId: input.customerId ?? null,
})
