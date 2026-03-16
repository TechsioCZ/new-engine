export type PaginationInput = {
  page?: number
  limit?: number
  offset?: number
}

export type PaginationState = {
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
    input.offset ?? (input.page != null ? (input.page - 1) * limit : 0)

  let page = input.page ?? 1
  if (input.offset != null) {
    page = limit > 0 ? Math.floor(offset / limit) + 1 : 1
  } else if (input.page == null) {
    page = limit > 0 ? Math.floor(offset / limit) + 1 : 1
  }

  return { page, limit, offset }
}