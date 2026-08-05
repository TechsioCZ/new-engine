import type {
  QueryResult,
  ReadResultBase,
  SuspenseQueryResult,
  SuspenseResultBase,
} from "../shared/hook-result-types"
import type { QueryKey } from "../shared/query-keys"

export interface OrderListInputBase {
  page?: number
  limit?: number
  offset?: number
  enabled?: boolean
}

export interface OrderDetailInputBase {
  id?: string
  enabled?: boolean
}

export interface OrderListResponse<TOrder> {
  orders: TOrder[]
  count?: number
}

export interface OrderService<TOrder, TListParams, TDetailParams> {
  getOrders: (
    params: TListParams,
    signal?: AbortSignal
  ) => Promise<OrderListResponse<TOrder>>
  getOrder: (
    params: TDetailParams,
    signal?: AbortSignal
  ) => Promise<TOrder | null>
}

export interface OrderQueryKeys<TListParams, TDetailParams> {
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
