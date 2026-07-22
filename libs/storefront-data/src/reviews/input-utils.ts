import { compactRecord } from "@techsio/std/object"

import { resolvePagination } from "../shared/pagination"
import type { ProductReviewListInputBase } from "./types"

export const stripListInput = <TInput extends ProductReviewListInputBase>(
  input: TInput
) => {
  const { enabled: _enabled, page: _page, ...params } = input

  return params
}

export const createDefaultListParams = <
  TInput extends ProductReviewListInputBase,
>(
  input: TInput,
  defaultPageSize: number
) => {
  const params = stripListInput(input) as Record<string, unknown>

  if (typeof input.page !== "number") {
    return compactRecord(params)
  }

  const pagination = resolvePagination(
    compactRecord({
      page: input.page,
      limit: input.limit,
      offset: input.offset,
    }),
    defaultPageSize
  )

  return compactRecord({
    ...params,
    limit: pagination.limit,
    offset: pagination.offset,
  })
}
