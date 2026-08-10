import { QueryClient } from "@tanstack/react-query"
import { getRecordValue, isRecord } from "@techsio/std/object"
import { expect, describe, it } from "vitest"

import { createCartQueryKeys } from "../src/cart/query-keys"
import type { CartQueryKeys } from "../src/cart/types"
import {
  createDefaultActiveCartQueryMatcher,
  getCachedCartById,
  invalidateCartCaches,
  patchCartCaches,
  syncCartCaches,
} from "../src/shared/cart-cache-sync"
import { createQueryKey } from "../src/shared/query-keys"

interface Cart {
  id: string
  region_id?: string | null
  item_count?: number
}

const decodeCart = (value: unknown): Cart | null => {
  if (!isRecord(value)) {
    return null
  }
  const id = getRecordValue(value, "id")
  const itemCount = getRecordValue(value, "item_count")
  const regionId = getRecordValue(value, "region_id")
  if (typeof id !== "string") {
    return null
  }
  if (
    regionId !== undefined &&
    regionId !== null &&
    typeof regionId !== "string"
  ) {
    return null
  }
  if (itemCount !== undefined && typeof itemCount !== "number") {
    return null
  }
  const cart: Cart = { id }
  if (regionId !== undefined) {
    cart.region_id = regionId
  }
  if (itemCount !== undefined) {
    cart.item_count = itemCount
  }
  return cart
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
      item_count: 1,
      region_id: "reg_eu",
    } satisfies Cart)
    queryClient.setQueryData(activeUsKey, {
      id: "cart_1",
      item_count: 2,
      region_id: "reg_us",
    } satisfies Cart)

    const updatedCart: Cart = {
      id: "cart_1",
      item_count: 10,
      region_id: "reg_eu",
    }

    syncCartCaches(queryClient, queryKeys, updatedCart)

    expect(queryClient.getQueryData(activeEuKey)).toStrictEqual(updatedCart)
    expect(queryClient.getQueryData(activeUsKey)).toStrictEqual(updatedCart)
    expect(queryClient.getQueryData(detailKey)).toStrictEqual(updatedCart)
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
      item_count: 1,
      region_id: "reg_1",
    } satisfies Cart)
    queryClient.setQueryData(detailKey, {
      id: "cart_2",
      item_count: 1,
      region_id: "reg_1",
    } satisfies Cart)
    const malformedKey = queryKeys.active({
      cartId: "cart_2",
      regionId: "reg_malformed",
    })
    const malformedCart = { id: "cart_2", item_count: "invalid" }
    queryClient.setQueryData(malformedKey, malformedCart)

    patchCartCaches(queryClient, queryKeys, "cart_2", {
      decodeCart,
      patch: (existing) => ({
        ...existing,
        item_count: (existing.item_count ?? 0) + 2,
      }),
    })

    expect(queryClient.getQueryData<Cart>(activeKey)?.item_count).toBe(3)
    expect(queryClient.getQueryData<Cart>(detailKey)?.item_count).toBe(3)
    expect(queryClient.getQueryData(malformedKey)).toStrictEqual(malformedCart)
  })

  it("invalidates active and detail caches", async () => {
    const queryClient = new QueryClient()
    const queryKeys = createCartQueryKeys("cache-invalidate")
    const activeKey = queryKeys.active({
      cartId: "cart_3",
      regionId: "reg_1",
    })
    const detailKey = queryKeys.detail("cart_3")

    queryClient.setQueryData(activeKey, { id: "cart_3" } satisfies Cart)
    queryClient.setQueryData(detailKey, { id: "cart_3" } satisfies Cart)

    await invalidateCartCaches(queryClient, queryKeys, "cart_3")

    expect(queryClient.getQueryState(activeKey)?.isInvalidated).toBeTruthy()
    expect(queryClient.getQueryState(detailKey)?.isInvalidated).toBeTruthy()
  })

  it("supports custom active cart query matchers for non-standard key shapes", () => {
    const queryClient = new QueryClient()
    const queryKeys: CartQueryKeys = {
      active: ({ cartId, regionId }) =>
        createQueryKey(
          ["custom", "cart"],
          "active",
          cartId ?? null,
          regionId ?? null,
        ),
      all: () => createQueryKey(["custom", "cart"]),
      detail: (cartId) => createQueryKey(["custom", "cart"], "detail", cartId),
    }

    const activeKey = queryKeys.active({
      cartId: "cart_custom",
      regionId: "reg_custom",
    })
    queryClient.setQueryData(activeKey, { id: "cart_custom" } satisfies Cart)

    const cached = getCachedCartById<Cart>(
      queryClient,
      queryKeys,
      "cart_custom",
      decodeCart,
      {
        isActiveCartQueryKey: (queryKey, cartId) =>
          queryKey[0] === "custom" &&
          queryKey[1] === "cart" &&
          queryKey[2] === "active" &&
          queryKey[3] === cartId,
      },
    )
    expect(cached).toStrictEqual({ id: "cart_custom" })

    queryClient.setQueryData(activeKey, {
      id: "cart_custom",
      item_count: "invalid",
    })
    expect(
      getCachedCartById(queryClient, queryKeys, "cart_custom", decodeCart, {
        isActiveCartQueryKey: (queryKey, cartId) =>
          queryKey[0] === "custom" &&
          queryKey[1] === "cart" &&
          queryKey[2] === "active" &&
          queryKey[3] === cartId,
      }),
    ).toBeNull()
  })

  it("derives the default active cart matcher from custom query key factories", () => {
    const queryClient = new QueryClient()
    const queryKeys: CartQueryKeys = {
      active: ({ cartId, regionId }) =>
        createQueryKey(["custom", "cart"], cartId ?? "__none__", {
          regionId: regionId ?? null,
        }),
      all: () => createQueryKey(["custom", "cart"]),
      detail: (cartId) => createQueryKey(["custom", "cart"], "detail", cartId),
    }
    const activeKey = queryKeys.active({
      cartId: "cart_derived",
      regionId: "reg_1",
    })

    queryClient.setQueryData(activeKey, {
      id: "cart_derived",
      item_count: 1,
      region_id: "reg_1",
    } satisfies Cart)

    const matcher = createDefaultActiveCartQueryMatcher(queryKeys)
    expect(matcher(activeKey, "cart_derived")).toBeTruthy()
    expect(matcher(activeKey, "cart_other")).toBeFalsy()

    const updatedCart: Cart = {
      id: "cart_derived",
      item_count: 9,
      region_id: "reg_1",
    }
    syncCartCaches(queryClient, queryKeys, updatedCart)

    expect(queryClient.getQueryData(activeKey)).toStrictEqual({
      id: "cart_derived",
      item_count: 9,
      region_id: "reg_1",
    })
  })
})
