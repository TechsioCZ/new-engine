import type { QueryClient } from "@tanstack/react-query"
import { isRecord as isPlainRecord } from "@techsio/std/object"

import type { CartQueryKeys } from "../cart/types"
import {
  areQueryKeySegmentsEqual,
  getSortedRecordKeys,
  hasQueryKeyPrefix,
} from "./query-key-match-utils"
import type { QueryKey } from "./query-keys"

interface CartLike {
  id: string
  region_id?: string | null | undefined
}

export type ActiveCartQueryKeyMatcher = (
  queryKey: QueryKey,
  cartId: string,
) => boolean

export interface CartCacheSyncOptions {
  isActiveCartQueryKey?: ActiveCartQueryKeyMatcher | undefined
}

export type CartUpdater<TCart extends CartLike> = (cart: TCart) => TCart

interface ActiveKeySegmentMatchInput {
  candidate: unknown
  base: unknown
  cartVariant: unknown
  regionVariant: unknown
  cartId: string
}

const matchActiveLeafSegment = ({
  candidate,
  base,
  cartVariant,
  regionVariant,
  cartId,
}: ActiveKeySegmentMatchInput): boolean => {
  const changesWithCart = !areQueryKeySegmentsEqual(base, cartVariant)
  const changesWithRegion = !areQueryKeySegmentsEqual(base, regionVariant)

  if (!(changesWithCart || changesWithRegion)) {
    return areQueryKeySegmentsEqual(candidate, base)
  }
  if (changesWithCart && !changesWithRegion) {
    return candidate === cartId
  }
  return !changesWithCart && changesWithRegion
}

const matchesActiveKeySegment = ({
  candidate,
  base,
  cartVariant,
  regionVariant,
  cartId,
}: ActiveKeySegmentMatchInput): boolean => {
  if (
    Array.isArray(base) &&
    Array.isArray(cartVariant) &&
    Array.isArray(regionVariant)
  ) {
    if (!Array.isArray(candidate)) {
      return false
    }
    const hasMatchingLengths =
      candidate.length === base.length &&
      cartVariant.length === base.length &&
      regionVariant.length === base.length
    return (
      hasMatchingLengths &&
      base.every((_, index) =>
        matchesActiveKeySegment({
          base: base[index],
          candidate: candidate[index],
          cartId,
          cartVariant: cartVariant[index],
          regionVariant: regionVariant[index],
        }),
      )
    )
  }

  if (
    isPlainRecord(base) &&
    isPlainRecord(cartVariant) &&
    isPlainRecord(regionVariant) &&
    isPlainRecord(candidate)
  ) {
    return getSortedRecordKeys(base, cartVariant, regionVariant).every((key) =>
      matchesActiveKeySegment({
        base: base[key],
        candidate: candidate[key],
        cartId,
        cartVariant: cartVariant[key],
        regionVariant: regionVariant[key],
      }),
    )
  }

  return matchActiveLeafSegment({
    base,
    candidate,
    cartId,
    cartVariant,
    regionVariant,
  })
}

const hasCartId = (value: unknown, cartId?: string): value is CartLike => {
  if (!isPlainRecord(value)) {
    return false
  }

  const { id: valueId } = value
  if (typeof valueId !== "string") {
    return false
  }

  if (typeof cartId === "string") {
    return valueId === cartId
  }

  return true
}

export const createDefaultActiveCartQueryMatcher = (
  queryKeys: CartQueryKeys,
): ActiveCartQueryKeyMatcher => {
  const cartPrefix = queryKeys.all()
  const baseActiveKey = queryKeys.active({
    cartId: "__storefront_data_cart__",
    regionId: "__storefront_data_region__",
  })
  const cartVariantActiveKey = queryKeys.active({
    cartId: "__storefront_data_other_cart__",
    regionId: "__storefront_data_region__",
  })
  const regionVariantActiveKey = queryKeys.active({
    cartId: "__storefront_data_cart__",
    regionId: "__storefront_data_other_region__",
  })

  return (queryKey, cartId) => {
    if (!hasQueryKeyPrefix(queryKey, cartPrefix)) {
      return false
    }

    return matchesActiveKeySegment({
      base: baseActiveKey,
      candidate: queryKey,
      cartId,
      cartVariant: cartVariantActiveKey,
      regionVariant: regionVariantActiveKey,
    })
  }
}

const resolveActiveCartQueryMatcher = (
  queryKeys: CartQueryKeys,
  options?: CartCacheSyncOptions,
): ActiveCartQueryKeyMatcher =>
  options?.isActiveCartQueryKey ??
  createDefaultActiveCartQueryMatcher(queryKeys)

export const syncCartCaches = (
  queryClient: QueryClient,
  queryKeys: CartQueryKeys,
  cart: CartLike,
  options?: CartCacheSyncOptions,
): void => {
  const isActiveCartQueryKey = resolveActiveCartQueryMatcher(queryKeys, options)
  const activeKey = queryKeys.active({
    cartId: cart.id,
    regionId: typeof cart.region_id === "string" ? cart.region_id : null,
  })

  queryClient.setQueriesData<unknown>(
    {
      predicate: (query) => isActiveCartQueryKey(query.queryKey, cart.id),
    },
    cart,
  )

  queryClient.setQueryData(activeKey, cart)
  queryClient.setQueryData(queryKeys.detail(cart.id), cart)
}

export const invalidateCartCaches = async (
  queryClient: QueryClient,
  queryKeys: CartQueryKeys,
  cartId: string,
  options?: CartCacheSyncOptions,
): Promise<void> => {
  const isActiveCartQueryKey = resolveActiveCartQueryMatcher(queryKeys, options)

  await Promise.all([
    queryClient.invalidateQueries({
      predicate: (query) => isActiveCartQueryKey(query.queryKey, cartId),
    }),
    queryClient.invalidateQueries({ queryKey: queryKeys.detail(cartId) }),
  ])
}

export const cancelCartCaches = async (
  queryClient: QueryClient,
  queryKeys: CartQueryKeys,
  cartId: string,
  options?: CartCacheSyncOptions,
): Promise<void> => {
  const isActiveCartQueryKey = resolveActiveCartQueryMatcher(queryKeys, options)

  await Promise.all([
    queryClient.cancelQueries(
      {
        predicate: (query) => isActiveCartQueryKey(query.queryKey, cartId),
      },
      { silent: true },
    ),
    queryClient.cancelQueries(
      { queryKey: queryKeys.detail(cartId) },
      { silent: true },
    ),
  ])
}

export type CartDecoder<TCart extends CartLike> = (
  value: unknown,
) => TCart | null

export interface PatchCartCachesParams<TCart extends CartLike> {
  decodeCart: CartDecoder<TCart>
  patch: CartUpdater<TCart>
  options?: CartCacheSyncOptions | undefined
}

const patchCachedCart = <TCart extends CartLike>(
  value: unknown,
  cartId: string,
  decodeCart: CartDecoder<TCart>,
  patch: CartUpdater<TCart>,
): unknown => {
  const cart = decodeCart(value)
  return cart !== null && hasCartId(cart, cartId) ? patch(cart) : value
}

export const patchCartCaches = <TCart extends CartLike>(
  queryClient: QueryClient,
  queryKeys: CartQueryKeys,
  cartId: string,
  params: PatchCartCachesParams<TCart>,
): void => {
  const isActiveCartQueryKey = resolveActiveCartQueryMatcher(
    queryKeys,
    params.options,
  )

  queryClient.setQueriesData<unknown>(
    {
      predicate: (query) => isActiveCartQueryKey(query.queryKey, cartId),
    },
    (existing: unknown) =>
      patchCachedCart(existing, cartId, params.decodeCart, params.patch),
  )

  queryClient.setQueryData(queryKeys.detail(cartId), (existing: unknown) =>
    patchCachedCart(existing, cartId, params.decodeCart, params.patch),
  )
}

const decodeMatchingCart = <TCart extends CartLike>(
  value: unknown,
  cartId: string,
  decodeCart: CartDecoder<TCart>,
): TCart | null => {
  const cart = decodeCart(value)
  return cart !== null && hasCartId(cart, cartId) ? cart : null
}

export const getCachedCartById = <TCart extends CartLike>(
  queryClient: QueryClient,
  queryKeys: CartQueryKeys,
  cartId: string,
  decodeCart: CartDecoder<TCart>,
  options?: CartCacheSyncOptions,
): TCart | null => {
  const detailCart: unknown = queryClient.getQueryData(queryKeys.detail(cartId))
  const decodedDetailCart = decodeMatchingCart(detailCart, cartId, decodeCart)
  if (decodedDetailCart !== null) {
    return decodedDetailCart
  }

  const isActiveCartQueryKey = resolveActiveCartQueryMatcher(queryKeys, options)
  const activeCarts = queryClient.getQueriesData({
    predicate: (query) => isActiveCartQueryKey(query.queryKey, cartId),
  })

  for (const [, cachedCart] of activeCarts) {
    const decodedCart = decodeMatchingCart(cachedCart, cartId, decodeCart)
    if (decodedCart !== null) {
      return decodedCart
    }
  }

  return null
}
