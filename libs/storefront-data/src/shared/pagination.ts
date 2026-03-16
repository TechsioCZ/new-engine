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
  const page =
    input.offset != null
      ? limit > 0
        ? Math.floor(offset / limit) + 1
        : 1
      : input.page ?? (limit > 0 ? Math.floor(offset / limit) + 1 : 1)

  return { page, limit, offset }
}
