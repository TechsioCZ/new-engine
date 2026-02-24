import type {
  QueryResult,
  ReadResultBase,
  SuspenseQueryResult,
  SuspenseResultBase,
} from "../shared/hook-types"
import type { QueryKey } from "../shared/query-keys"

export type OrderListInputBase = {
  page?: number
  limit?: number
  offset?: number
  enabled?: boolean
}

export type OrderDetailInputBase = {
  id?: string
  enabled?: boolean
}

export type OrderListResponse<TOrder> = {
  orders: TOrder[]
  count?: number
}

export type OrderService<TOrder, TListParams, TDetailParams> = {
  getOrders: (
    params: TListParams,
    signal?: AbortSignal
  ) => Promise<OrderListResponse<TOrder>>
  getOrder: (
    params: TDetailParams,
    signal?: AbortSignal
  ) => Promise<TOrder | null>
}

export type OrderQueryKeys<TListParams, TDetailParams> = {
  all: () => QueryKey
  list: (params: TListParams) => QueryKey
  detail: (params: TDetailParams) => QueryKey
}

export type UseOrdersResult<TOrder> = ReadResultBase<
  QueryResult<OrderListResponse<TOrder>>
> & {
  orders: TOrder[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type UseSuspenseOrdersResult<TOrder> = SuspenseResultBase<
  SuspenseQueryResult<OrderListResponse<TOrder>>
> & {
  orders: TOrder[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type UseOrderResult<TOrder> = ReadResultBase<
  QueryResult<TOrder | null>
> & {
  order: TOrder | null
}

export type UseSuspenseOrderResult<TOrder> = SuspenseResultBase<
  SuspenseQueryResult<TOrder | null>
> & {
  order: TOrder | null
}
