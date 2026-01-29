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
  all: () => readonly unknown[]
  list: (params: TListParams) => readonly unknown[]
  detail: (params: TDetailParams) => readonly unknown[]
}

export type UseOrdersResult<TOrder> = {
  orders: TOrder[]
  isLoading: boolean
  isFetching: boolean
  isSuccess: boolean
  error: string | null
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}
