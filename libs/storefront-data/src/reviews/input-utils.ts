import { omitKeys, omitUndefined } from "@techsio/std/object"

import { resolvePagination } from "../shared/pagination"
import type { ProductReviewListInputBase } from "./types"

export const stripListInput = <TInput extends ProductReviewListInputBase>(
  input: TInput,
) => omitKeys(input, ["enabled", "page"])

export const createDefaultListParams = <
  TInput extends ProductReviewListInputBase,
>(
  input: TInput,
  defaultPageSize: number,
) => {
  const params = { ...input }
  delete params.enabled
  delete params.page

  if (typeof input.page !== "number") {
    return params
  }

  const pagination = resolvePagination(
    omitUndefined({
      limit: input.limit,
      offset: input.offset,
      page: input.page,
    }),
    defaultPageSize,
  )

  return {
    ...params,
    limit: pagination.limit,
    offset: pagination.offset,
  }
}
