import { resolvePagination as resolveSharedPagination } from "../shared/pagination"
import type {
  PaginationInput as SharedPaginationInput,
  PaginationState as SharedPaginationState,
} from "../shared/pagination"

export type PaginationInput = SharedPaginationInput
export type PaginationState = SharedPaginationState

export function resolvePagination(
  input: PaginationInput,
  defaultLimit: number
): PaginationState {
  return resolveSharedPagination(input, defaultLimit)
}