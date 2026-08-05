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

export function resolvePagination(
  input: PaginationInput,
  defaultLimit: number
): PaginationState {
  const limit = input.limit ?? defaultLimit
  const offset =
    input.offset ?? (input.page == null ? 0 : (input.page - 1) * limit)
  let page = input.page ?? 1
  if (input.offset != null) {
    page = limit > 0 ? Math.floor(offset / limit) + 1 : 1
  } else if (input.page == null) {
    page = limit > 0 ? Math.floor(offset / limit) + 1 : 1
  }

  return { limit, offset, page }
}
