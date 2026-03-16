import type { QueryClient } from "@tanstack/react-query"
import type { CartQueryKeys } from "./types"

type QueryKey = readonly unknown[]
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value))

const areEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) {
    return true
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((entry, index) => areEqual(entry, right[index]))
    )
  }

  if (isRecord(left) && isRecord(right)) {
    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every((key) => areEqual(left[key], right[key]))
    )
  }

  return false
}

const getRecordKeys = (
  ...records: ReadonlyArray<Record<string, unknown>>
): string[] =>
  Array.from(new Set(records.flatMap((record) => Object.keys(record)))).sort()

const hasQueryKeyPrefix = (queryKey: QueryKey, prefix: QueryKey): boolean =>
  prefix.every((segment, index) => queryKey[index] === segment)

const hasCartId = <TCart extends CartLike>(
  value: unknown,
  cartId?: string
): value is TCart => {
  if (!isRecord(value)) {
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

  const matchesActiveKeySegment = (
    candidate: unknown,
    base: unknown,
    cartVariant: unknown,
    regionVariant: unknown,
    cartId: string
  ): boolean => {
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
          matchesActiveKeySegment(
            candidate[index],
            base[index],
            cartVariant[index],
            regionVariant[index],
            cartId
          )
        )
      )
    }

    if (
      isRecord(base) &&
      isRecord(cartVariant) &&
      isRecord(regionVariant) &&
      isRecord(candidate)
    ) {
      return getRecordKeys(base, cartVariant, regionVariant).every((key) =>
        matchesActiveKeySegment(
          candidate[key],
          base[key],
          cartVariant[key],
          regionVariant[key],
          cartId
        )
      )
    }

    const changesWithCart = !areEqual(base, cartVariant)
    const changesWithRegion = !areEqual(base, regionVariant)

    if (!changesWithCart && !changesWithRegion) {
      return areEqual(candidate, base)
    }

    if (changesWithCart && !changesWithRegion) {
      return candidate === cartId
    }

    if (!changesWithCart && changesWithRegion) {
      return true
    }

    return false
  }

  return (queryKey, cartId) => {
    if (!hasQueryKeyPrefix(queryKey, cartPrefix)) {
      return false
    }

    return matchesActiveKeySegment(
      queryKey,
      baseActiveKey,
      cartVariantActiveKey,
      regionVariantActiveKey,
      cartId
    )
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

export function patchCartCaches<TCart extends CartLike>(
  queryClient: QueryClient,
  queryKeys: CartQueryKeys,
  cartId: string,
  patch: CartUpdater<TCart>,
  options?: CartCacheSyncOptions
): void {
  const isActiveCartQueryKey = resolveActiveCartQueryMatcher(queryKeys, options)

  queryClient.setQueriesData<TCart>(
    {
      predicate: (query) => isActiveCartQueryKey(query.queryKey, cartId),
    },
    (existing) => (hasCartId<TCart>(existing, cartId) ? patch(existing) : existing)
  )

  queryClient.setQueryData<TCart | undefined>(
    queryKeys.detail(cartId),
    (existing) => (hasCartId<TCart>(existing, cartId) ? patch(existing) : existing)
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
