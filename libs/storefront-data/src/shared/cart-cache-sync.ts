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

const hasCartId = <TCart extends CartLike>(
  value: unknown,
  cartId?: string,
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

export function syncCartCaches<TCart extends CartLike>(
  queryClient: QueryClient,
  queryKeys: CartQueryKeys,
  cart: TCart,
  options?: CartCacheSyncOptions,
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
    cart,
  )

  queryClient.setQueryData(activeKey, cart)
  queryClient.setQueryData(queryKeys.detail(cart.id), cart)
}

export async function invalidateCartCaches(
  queryClient: QueryClient,
  queryKeys: CartQueryKeys,
  cartId: string,
  options?: CartCacheSyncOptions,
): Promise<void> {
  const isActiveCartQueryKey = resolveActiveCartQueryMatcher(queryKeys, options)

  return Promise.all([
    queryClient.invalidateQueries({
      predicate: (query) => isActiveCartQueryKey(query.queryKey, cartId),
    }),
    queryClient.invalidateQueries({ queryKey: queryKeys.detail(cartId) }),
  ]).then(() => {})
}

export async function cancelCartCaches(
  queryClient: QueryClient,
  queryKeys: CartQueryKeys,
  cartId: string,
  options?: CartCacheSyncOptions,
): Promise<void> {
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

export interface PatchCartCachesParams<TCart extends CartLike> {
  patch: CartUpdater<TCart>
  options?: CartCacheSyncOptions | undefined
}

export function patchCartCaches<TCart extends CartLike>(
  queryClient: QueryClient,
  queryKeys: CartQueryKeys,
  cartId: string,
  params: PatchCartCachesParams<TCart>,
): void {
  const isActiveCartQueryKey = resolveActiveCartQueryMatcher(
    queryKeys,
    params.options,
  )

  queryClient.setQueriesData<TCart>(
    {
      predicate: (query) => isActiveCartQueryKey(query.queryKey, cartId),
    },
    (existing) =>
      hasCartId<TCart>(existing, cartId) ? params.patch(existing) : existing,
  )

  queryClient.setQueryData<TCart | undefined>(
    queryKeys.detail(cartId),
    (existing) =>
      hasCartId<TCart>(existing, cartId) ? params.patch(existing) : existing,
  )
}

export function getCachedCartById<TCart extends CartLike>(
  queryClient: QueryClient,
  queryKeys: CartQueryKeys,
  cartId: string,
  options?: CartCacheSyncOptions,
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
