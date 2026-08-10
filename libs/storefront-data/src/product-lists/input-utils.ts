import { omitKeys, omitUndefined } from "@techsio/std/object"

import { resolvePagination } from "../shared/pagination"
import type {
  ProductListDetailInputBase,
  ProductListListInputBase,
} from "./types"

export const stripListInput = <TInput extends ProductListListInputBase>(
  input: TInput,
) => omitKeys(input, ["customerId", "enabled", "page"])

export const stripDetailInput = <TInput extends ProductListDetailInputBase>(
  input: TInput,
) => omitKeys(input, ["customerId", "enabled"])

export const createDefaultListParams = <
  TInput extends ProductListListInputBase,
>(
  input: TInput,
  defaultPageSize: number,
) => {
  const params = stripListInput(input)

  if (typeof input.page !== "number") {
    return omitUndefined(params)
  }

  const pagination = resolvePagination(
    omitUndefined({
      limit: input.limit,
      offset: input.offset,
      page: input.page,
    }),
    defaultPageSize,
  )

  return omitUndefined({
    ...params,
    limit: pagination.limit,
    offset: pagination.offset,
  })
}

export const withCustomerScope = <TParams extends object>(
  params: TParams,
  input: { customerId?: string | null },
) => ({
  ...params,
  customerId: input.customerId ?? null,
})
