import type { QueryClient } from "@tanstack/react-query"
import type { CartQueryKeys } from "../cart/types"
import { isPlainRecord } from "./object-utils"
import {
  areQueryKeySegmentsEqual,
  getSortedRecordKeys,
  hasQueryKeyPrefix,
} from "./query-key-match-utils"
import type { QueryKey } from "./query-keys"

type CartLike = {
  id: string
  region_id?: string | null
}

export type ActiveCartQueryKeyMatcher = (
  queryKey: QueryKey,
  cartId: string
) => boolean

export type CartCacheSyncOptions = {
  isActiveCartQueryKey?: ActiveCartQueryKeyMatcher
}

export type CartUpdater<TCart extends CartLike> = (cart: TCart) => TCart

type ActiveKeySegmentMatchInput = {
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
  if (!changesWithCart && changesWithRegion) {
    return true
  }
  return false
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
    return (
      Array.isArray(candidate) &&
      candidate.length === base.length &&
      cartVariant.length === base.length &&
      regionVariant.length === base.length &&
      base.every((_, index) =>
        matchesActiveKeySegment({
          candidate: candidate[index],
          base: base[index],
          cartVariant: cartVariant[index],
          regionVariant: regionVariant[index],
          cartId,
        })
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
        candidate: candidate[key],
        base: base[key],
        cartVariant: cartVariant[key],
        regionVariant: regionVariant[key],
        cartId,
      })
    )
  }

  return matchActiveLeafSegment({
    candidate,
    base,
    cartVariant,
    regionVariant,
    cartId,
  })
}

const hasCartId = <TCart extends CartLike>(
  value: unknown,
  cartId?: string
): value is TCart => {
  if (!isPlainRecord(value)) {
    return false
  }

  const valueId = value.id
  if (typeof valueId !== "string") {
    return false
  }

  if (typeof cartId === "string") {
    return valueId === cartId
  }

  return true
}

export const createDefaultActiveCartQueryMatcher = (
  queryKeys: CartQueryKeys
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
      candidate: queryKey,
      base: baseActiveKey,
      cartVariant: cartVariantActiveKey,
      regionVariant: regionVariantActiveKey,
      cartId,
    })
  }
}

const resolveActiveCartQueryMatcher = (
  queryKeys: CartQueryKeys,
  options?: CartCacheSyncOptions
): ActiveCartQueryKeyMatcher =>
  options?.isActiveCartQueryKey ?? createDefaultActiveCartQueryMatcher(queryKeys)


export function syncCartCaches<TCart extends CartLike>(
  queryClient: QueryClient,
  queryKeys: CartQueryKeys,
  cart: TCart,
  options?: CartCacheSyncOptions
): void {
  const isActiveCartQueryKey = resolveActiveCartQueryMatcher(queryKeys, options)
  const activeKey = queryKeys.active({
    cartId: cart.id,
    regionId: typeof cart.region_id === "string" ? cart.region_id : null,
  })

  queryClient.setQueriesData<TCart>(
    {
      predicate: (query) => isActiveCartQueryKey(query.queryKey, cart.id),
    },
    cart
  )

  queryClient.setQueryData(activeKey, cart)
  queryClient.setQueryData(queryKeys.detail(cart.id), cart)
}

export function invalidateCartCaches(
  queryClient: QueryClient,
  queryKeys: CartQueryKeys,
  cartId: string,
  options?: CartCacheSyncOptions
): void {
  const isActiveCartQueryKey = resolveActiveCartQueryMatcher(queryKeys, options)

  queryClient.invalidateQueries({
    predicate: (query) => isActiveCartQueryKey(query.queryKey, cartId),
  })
  queryClient.invalidateQueries({ queryKey: queryKeys.detail(cartId) })
}

export type PatchCartCachesParams<TCart extends CartLike> = {
  patch: CartUpdater<TCart>
  options?: CartCacheSyncOptions
}

export function patchCartCaches<TCart extends CartLike>(
  queryClient: QueryClient,
  queryKeys: CartQueryKeys,
  cartId: string,
  params: PatchCartCachesParams<TCart>
): void {
  const isActiveCartQueryKey = resolveActiveCartQueryMatcher(
    queryKeys,
    params.options
  )

  queryClient.setQueriesData<TCart>(
    {
      predicate: (query) => isActiveCartQueryKey(query.queryKey, cartId),
    },
    (existing) =>
      hasCartId<TCart>(existing, cartId) ? params.patch(existing) : existing
  )

  queryClient.setQueryData<TCart | undefined>(
    queryKeys.detail(cartId),
    (existing) =>
      hasCartId<TCart>(existing, cartId) ? params.patch(existing) : existing
  )
}

export function getCachedCartById<TCart extends CartLike>(
  queryClient: QueryClient,
  queryKeys: CartQueryKeys,
  cartId: string,
  options?: CartCacheSyncOptions
): TCart | null {
  const detailCart = queryClient.getQueryData<TCart>(queryKeys.detail(cartId))
  if (hasCartId<TCart>(detailCart, cartId)) {
    return detailCart
  }

  const isActiveCartQueryKey = resolveActiveCartQueryMatcher(queryKeys, options)
  const activeCarts = queryClient.getQueriesData<TCart>({
    predicate: (query) => isActiveCartQueryKey(query.queryKey, cartId),
  })

  for (const [, cachedCart] of activeCarts) {
    if (hasCartId<TCart>(cachedCart, cartId)) {
      return cachedCart
    }
  }

  return null
}
