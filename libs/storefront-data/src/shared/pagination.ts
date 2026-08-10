export interface PaginationInput {
  page?: number
  limit?: number
  offset?: number
}

export interface PaginationState {
  page: number
  limit: number
  offset: number
}

export const resolvePagination = (
  input: PaginationInput,
  defaultLimit: number,
): PaginationState => {
  const limit = input.limit ?? defaultLimit
  let offset = input.offset ?? 0
  if (input.offset === undefined && input.page !== undefined) {
    offset = (input.page - 1) * limit
  }

  const shouldDerivePage =
    input.offset !== undefined || input.page === undefined
  let page = input.page ?? 1
  if (shouldDerivePage && limit > 0) {
    page = Math.floor(offset / limit) + 1
  }

  return { limit, offset, page }
}
