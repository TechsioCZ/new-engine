import type { QueryKey } from "../shared/query-keys"
import type { RegionInfo } from "../shared/region"

export type CartLineItemLike = {
  quantity?: number
}

export type CartLike = {
  id: string
  region_id?: string | null
  items?: CartLineItemLike[]
}

export type CartStorage = {
  getCartId: () => string | null
  setCartId: (cartId: string) => void
  clearCartId: () => void
}

export type CartCreateInputBase = RegionInfo & {
  email?: string
  salesChannelId?: string
  metadata?: Record<string, unknown>
}

export type CartInputBase = CartCreateInputBase & {
  cartId?: string
  enabled?: boolean
  autoCreate?: boolean
  autoUpdateRegion?: boolean
}

export type AddLineItemInputBase = CartCreateInputBase & {
  cartId?: string
  variantId: string
  quantity?: number
  metadata?: Record<string, unknown>
  autoCreate?: boolean
}

export type UpdateLineItemInputBase = {
  cartId?: string
  lineItemId: string
  quantity: number
}

export type RemoveLineItemInputBase = {
  cartId?: string
  lineItemId: string
}

export type UpdateCartInputBase = CartCreateInputBase & {
  cartId?: string
}

export type TransferCartInputBase = {
  cartId?: string
}

export type CartService<
  TCart,
  TCreateParams,
  TUpdateParams,
  TAddItemParams,
  TUpdateItemParams,
  TCompleteResult,
> = {
  retrieveCart: (
    cartId: string,
    signal?: AbortSignal
  ) => Promise<TCart | null>
  createCart: (params: TCreateParams) => Promise<TCart>
  updateCart?: (cartId: string, params: TUpdateParams) => Promise<TCart>
  addLineItem?: (cartId: string, params: TAddItemParams) => Promise<TCart>
  updateLineItem?: (
    cartId: string,
    lineItemId: string,
    params: TUpdateItemParams
  ) => Promise<TCart>
  removeLineItem?: (cartId: string, lineItemId: string) => Promise<TCart>
  transferCart?: (cartId: string) => Promise<TCart>
  completeCart?: (cartId: string) => Promise<TCompleteResult>
}

export type CartQueryKeys = {
  all: () => QueryKey
  active: (params: {
    cartId?: string | null
    regionId?: string | null
  }) => QueryKey
  detail: (cartId: string) => QueryKey
}

export type UseCartResult<TCart> = {
  cart: TCart | null
  isLoading: boolean
  isFetching: boolean
  isSuccess: boolean
  error: string | null
  itemCount: number
  isEmpty: boolean
  hasItems: boolean
}

export type UseSuspenseCartResult<TCart> = {
  cart: TCart | null
  isFetching: boolean
  itemCount: number
  isEmpty: boolean
  hasItems: boolean
}
