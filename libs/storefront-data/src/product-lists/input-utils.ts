import { compactRecord } from "../shared/object-utils"
import { resolvePagination } from "../shared/pagination"
import type {
  ProductListDetailInputBase,
  ProductListListInputBase,
} from "./types"

export const stripListInput = <TInput extends ProductListListInputBase>(
  input: TInput
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
  input: TInput
) => {
  const { enabled: _enabled, customerId: _customerId, ...params } = input

  return params
}

export const createDefaultListParams = <
  TInput extends ProductListListInputBase,
>(
  input: TInput,
  defaultPageSize: number
) => {
  const params = stripListInput(input) as Record<string, unknown>

  if (typeof input.page !== "number") {
    return compactRecord(params)
  }

  const pagination = resolvePagination(
    {
      page: input.page,
      limit: input.limit,
      offset: input.offset,
    },
    defaultPageSize
  )

  return compactRecord({
    ...params,
    limit: pagination.limit,
    offset: pagination.offset,
  })
}

export const withCustomerScope = <
  TParams,
  TInput extends { customerId?: string | null },
>(
  params: TParams,
  input: TInput
) =>
  ({
    ...(params as object),
    customerId: input.customerId ?? null,
  })
