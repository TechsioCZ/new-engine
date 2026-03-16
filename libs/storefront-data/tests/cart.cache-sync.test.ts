import { QueryClient } from "@tanstack/react-query"
import {
  createDefaultActiveCartQueryMatcher,
  getCachedCartById,
  invalidateCartCaches,
  patchCartCaches,
  syncCartCaches,
} from "../src/cart/cache-sync"
import { createCartQueryKeys } from "../src/cart/query-keys"
import type { CartQueryKeys } from "../src/cart/types"
import { createQueryKey } from "../src/shared/query-keys"

type Cart = {
  id: string
  region_id?: string | null
  item_count?: number
}

describe("cart cache sync helpers", () => {
  it("syncs active and detail cart caches", () => {
    const queryClient = new QueryClient()
    const queryKeys = createCartQueryKeys("cache-sync")

    const activeEuKey = queryKeys.active({
      cartId: "cart_1",
      regionId: "reg_eu",
    })
    const activeUsKey = queryKeys.active({
      cartId: "cart_1",
      regionId: "reg_us",
    })
    const detailKey = queryKeys.detail("cart_1")

    queryClient.setQueryData(activeEuKey, {
      id: "cart_1",
      region_id: "reg_eu",
      item_count: 1,
    } satisfies Cart)
    queryClient.setQueryData(activeUsKey, {
      id: "cart_1",
      region_id: "reg_us",
      item_count: 2,
    } satisfies Cart)

    const updatedCart: Cart = {
      id: "cart_1",
      region_id: "reg_eu",
      item_count: 10,
    }

    syncCartCaches(queryClient, queryKeys, updatedCart)

    expect(queryClient.getQueryData(activeEuKey)).toEqual(updatedCart)
    expect(queryClient.getQueryData(activeUsKey)).toEqual(updatedCart)
    expect(queryClient.getQueryData(detailKey)).toEqual(updatedCart)
  })

  it("patches cached carts in both active and detail variants", () => {
    const queryClient = new QueryClient()
    const queryKeys = createCartQueryKeys("cache-patch")
    const activeKey = queryKeys.active({
      cartId: "cart_2",
      regionId: "reg_1",
    })
    const detailKey = queryKeys.detail("cart_2")

    queryClient.setQueryData(activeKey, {
      id: "cart_2",
      region_id: "reg_1",
      item_count: 1,
    } satisfies Cart)
    queryClient.setQueryData(detailKey, {
      id: "cart_2",
      region_id: "reg_1",
      item_count: 1,
    } satisfies Cart)

    patchCartCaches<Cart>(queryClient, queryKeys, "cart_2", (existing) => ({
      ...existing,
      item_count: (existing.item_count ?? 0) + 2,
    }))

    expect(queryClient.getQueryData<Cart>(activeKey)?.item_count).toBe(3)
    expect(queryClient.getQueryData<Cart>(detailKey)?.item_count).toBe(3)
  })

  it("invalidates active and detail caches", () => {
    const queryClient = new QueryClient()
    const queryKeys = createCartQueryKeys("cache-invalidate")
    const activeKey = queryKeys.active({
      cartId: "cart_3",
      regionId: "reg_1",
    })
    const detailKey = queryKeys.detail("cart_3")

    queryClient.setQueryData(activeKey, { id: "cart_3" } satisfies Cart)
    queryClient.setQueryData(detailKey, { id: "cart_3" } satisfies Cart)

    invalidateCartCaches(queryClient, queryKeys, "cart_3")

    expect(queryClient.getQueryState(activeKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(detailKey)?.isInvalidated).toBe(true)
  })

  it("supports custom active cart query matchers for non-standard key shapes", () => {
    const queryClient = new QueryClient()
    const queryKeys: CartQueryKeys = {
      all: () => ["custom", "cart"],
      active: ({ cartId, regionId }) => [
        "custom",
        "cart",
        "active",
        cartId ?? null,
        regionId ?? null,
      ],
      detail: (cartId) => ["custom", "cart", "detail", cartId],
    }

    const activeKey = queryKeys.active({
      cartId: "cart_custom",
      regionId: "reg_custom",
    })
    queryClient.setQueryData(activeKey, { id: "cart_custom" } satisfies Cart)

    const cached = getCachedCartById<Cart>(queryClient, queryKeys, "cart_custom", {
      isActiveCartQueryKey: (queryKey, cartId) =>
        queryKey[0] === "custom" &&
        queryKey[1] === "cart" &&
        queryKey[2] === "active" &&
        queryKey[3] === cartId,
    })
    expect(cached).toEqual({ id: "cart_custom" })
  })

  it("derives the default active cart matcher from custom query key factories", () => {
    const queryClient = new QueryClient()
    const queryKeys: CartQueryKeys = {
      all: () => createQueryKey(["custom", "cart"]),
      active: ({ cartId, regionId }) =>
        createQueryKey(
          ["custom", "cart"],
          cartId ?? "__none__",
          { regionId: regionId ?? null }
        ),
      detail: (cartId) => createQueryKey(["custom", "cart"], "detail", cartId),
    }
    const activeKey = queryKeys.active({
      cartId: "cart_derived",
      regionId: "reg_1",
    })

    queryClient.setQueryData(activeKey, {
      id: "cart_derived",
      region_id: "reg_1",
      item_count: 1,
    } satisfies Cart)

    const matcher = createDefaultActiveCartQueryMatcher(queryKeys)
    expect(matcher(activeKey, "cart_derived")).toBe(true)
    expect(matcher(activeKey, "cart_other")).toBe(false)

    syncCartCaches(
      queryClient,
      queryKeys,
      {
        id: "cart_derived",
        region_id: "reg_1",
        item_count: 9,
      } satisfies Cart
    )

    expect(queryClient.getQueryData(activeKey)).toEqual({
      id: "cart_derived",
      region_id: "reg_1",
      item_count: 9,
    })
  })
})
