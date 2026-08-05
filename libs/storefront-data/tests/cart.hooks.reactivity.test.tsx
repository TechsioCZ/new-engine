import { QueryClient } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { hydrateRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { vi, describe, expect, it } from "vitest"

import { createCartHooks } from "../src/cart/hooks"
import { createCartQueryKeys } from "../src/cart/query-keys"
import { StorefrontDataProvider } from "../src/client/provider"
import { createLocalStorageValueStore } from "../src/shared/storage-value-store"

interface Cart {
  id: string
  region_id?: string | null
  items?: { quantity?: number }[]
}

const createMemoryStorage = (): Storage => {
  const store = new Map<string, string>()

  return {
    clear: () => {
      store.clear()
    },
    getItem: (key) => store.get(key) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    get length() {
      return store.size
    },
    removeItem: (key) => {
      store.delete(key)
    },
    setItem: (key, value) => {
      store.set(key, value)
    },
  }
}

const createWrapper = (client: QueryClient) =>
  function ({ children }: { children: ReactNode }) {
    return (
      <StorefrontDataProvider client={client}>
        {children}
      </StorefrontDataProvider>
    )
  }

describe("createCartHooks reactive storage and cache sync", () => {
  it("reacts to observable cartStorage changes", async () => {
    const key = "test_reactive_cart_id"
    const cartStorage = createLocalStorageValueStore({
      key,
      storage: createMemoryStorage(),
    })
    const retrieveCart = vi.fn(async (cartId: string) => ({
      id: cartId,
      items: [{ quantity: 2 }],
      region_id: "reg_1",
    }))

    const { useCart } = createCartHooks<
      Cart,
      { region_id?: string },
      { region_id?: string }
    >({
      cartStorage,
      requireRegion: false,
      service: {
        createCart: async () => ({ id: "cart_created", region_id: "reg_1" }),
        retrieveCart,
      },
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => useCart({ autoCreate: false }), {
      wrapper,
    })

    expect(result.current.cart).toBeNull()
    expect(retrieveCart).not.toHaveBeenCalled()

    act(() => {
      cartStorage.set("cart_1")
    })

    await waitFor(() => {
      expect(result.current.cart?.id).toBe("cart_1")
    })

    expect(retrieveCart.mock.calls.at(-1)?.[0]).toBe("cart_1")
  })

  it("does not auto-create a new cart during hydration when storage already has a cart id", async () => {
    const key = "test_hydration_existing_cart_id"
    const backingStorage = createMemoryStorage()
    backingStorage.setItem(key, "cart_existing")
    const cartStorage = createLocalStorageValueStore({
      key,
      storage: backingStorage,
    })
    const retrieveCart = vi.fn(async (cartId: string) => ({
      id: cartId,
      items: [{ quantity: 1 }],
      region_id: "reg_1",
    }))
    const createCart = vi.fn(async () => ({
      id: "cart_created",
      items: [{ quantity: 1 }],
      region_id: "reg_1",
    }))

    const { useCart } = createCartHooks<
      Cart,
      { region_id?: string },
      { region_id?: string }
    >({
      cartStorage,
      requireRegion: false,
      service: {
        createCart,
        retrieveCart,
      },
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const Wrapper = createWrapper(queryClient)

    const CartProbe = () => {
      const { cart } = useCart({
        autoCreate: true,
        enabled: true,
        region_id: "reg_1",
      })

      return <div data-testid="cart-id">{cart?.id ?? "none"}</div>
    }

    const container = document.createElement("div")
    container.innerHTML = renderToString(
      <Wrapper>
        <CartProbe />
      </Wrapper>,
    )
    document.body.append(container)

    let root: ReturnType<typeof hydrateRoot> | null = null

    await act(async () => {
      root = hydrateRoot(
        container,
        <Wrapper>
          <CartProbe />
        </Wrapper>,
      )
    })

    await waitFor(() => {
      expect(retrieveCart).toHaveBeenCalledWith(
        "cart_existing",
        expect.any(AbortSignal),
      )
    })

    expect(createCart).not.toHaveBeenCalled()

    await waitFor(() => {
      expect(container.textContent).toBe("cart_existing")
    })

    await act(async () => {
      root?.unmount()
    })
    container.remove()
  })

  it("reacts to observable cartStorage implementations that use method context", async () => {
    const listeners = new Set<() => void>()
    const cartStorage = {
      clear() {
        this.currentCartId = null
        this.listeners.forEach((listener) => {
          listener()
        })
      },
      currentCartId: null as string | null,
      get() {
        return this.currentCartId
      },
      getServerSnapshot() {
        return this.currentCartId
      },
      getSnapshot() {
        return this.currentCartId
      },
      listeners,
      set(cartId: string) {
        this.currentCartId = cartId
        this.listeners.forEach((listener) => {
          listener()
        })
      },
      subscribe(listener: () => void) {
        this.listeners.add(listener)
        return () => {
          this.listeners.delete(listener)
        }
      },
    }
    const retrieveCart = vi.fn(async (cartId: string) => ({
      id: cartId,
      items: [{ quantity: 1 }],
      region_id: "reg_1",
    }))

    const { useCart } = createCartHooks<
      Cart,
      { region_id?: string },
      { region_id?: string }
    >({
      cartStorage,
      requireRegion: false,
      service: {
        createCart: async () => ({ id: "cart_created", region_id: "reg_1" }),
        retrieveCart,
      },
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => useCart({ autoCreate: false }), {
      wrapper,
    })

    act(() => {
      cartStorage.set("cart_ctx")
    })

    await waitFor(() => {
      expect(result.current.cart?.id).toBe("cart_ctx")
    })

    expect(retrieveCart.mock.calls.at(-1)?.[0]).toBe("cart_ctx")
  })

  it("syncs active and detail caches for line item mutations", async () => {
    const updatedCart: Cart = {
      id: "cart_1",
      items: [{ quantity: 4 }],
      region_id: "reg_1",
    }
    const queryKeys = createCartQueryKeys("test-cart-hook-sync")

    const { useAddLineItem } = createCartHooks<
      Cart,
      { region_id?: string },
      { region_id?: string }
    >({
      queryKeys,
      requireRegion: false,
      service: {
        addLineItem: async () => updatedCart,
        createCart: async () => updatedCart,
        retrieveCart: async () => updatedCart,
      },
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)
    const activeKey = queryKeys.active({ cartId: "cart_1", regionId: "reg_1" })
    const detailKey = queryKeys.detail("cart_1")

    queryClient.setQueryData(activeKey, {
      id: "cart_1",
      items: [{ quantity: 1 }],
      region_id: "reg_1",
    } satisfies Cart)
    queryClient.setQueryData(detailKey, {
      id: "cart_1",
      items: [{ quantity: 1 }],
      region_id: "reg_1",
    } satisfies Cart)

    const { result } = renderHook(() => useAddLineItem(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        cartId: "cart_1",
        quantity: 3,
        variantId: "variant_1",
      })
    })

    expect(queryClient.getQueryData(activeKey)).toStrictEqual(updatedCart)
    expect(queryClient.getQueryData(detailKey)).toStrictEqual(updatedCart)
  })

  it("keeps the later cart mutation when an earlier cancellation settles last", async () => {
    const olderCart: Cart = {
      id: "cart_1",
      items: [{ quantity: 1 }],
      region_id: "reg_1",
    }
    const newerCart: Cart = {
      id: "cart_1",
      items: [{ quantity: 2 }],
      region_id: "reg_1",
    }
    let resolveFirstCancellation: (() => void) | undefined
    const firstCancellation = new Promise<void>((resolve) => {
      resolveFirstCancellation = resolve
    })
    const queryKeys = createCartQueryKeys("test-cart-mutation-order")
    const { useUpdateLineItem } = createCartHooks<
      Cart,
      { region_id?: string },
      { region_id?: string }
    >({
      queryKeys,
      requireRegion: false,
      service: {
        createCart: async () => olderCart,
        retrieveCart: async () => olderCart,
        updateLineItem: async (_cartId, _lineItemId, input) =>
          input.quantity === 1 ? olderCart : newerCart,
      },
    })
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const cancelQueries = vi
      .spyOn(queryClient, "cancelQueries")
      .mockImplementation(async () => {
        cancelQueries.mock.calls.length <= 2
          ? await firstCancellation
          : await Promise.resolve()
      })
    const wrapper = createWrapper(queryClient)
    const { result } = renderHook(() => useUpdateLineItem(), { wrapper })
    const detailKey = queryKeys.detail("cart_1")

    const firstMutation = result.current.mutateAsync({
      cartId: "cart_1",
      lineItemId: "item_1",
      quantity: 1,
    })
    await waitFor(() => {
      expect(cancelQueries).toHaveBeenCalledTimes(2)
    })

    const secondMutation = result.current.mutateAsync({
      cartId: "cart_1",
      lineItemId: "item_1",
      quantity: 2,
    })
    await waitFor(() => {
      expect(queryClient.getQueryData(detailKey)).toStrictEqual(newerCart)
    })

    resolveFirstCancellation?.()
    await Promise.all([firstMutation, secondMutation])

    expect(queryClient.getQueryData(detailKey)).toStrictEqual(newerCart)
  })

  it("does not let a restored inactive cart observer overwrite a newer mutation", async () => {
    const staleCart: Cart = {
      id: "cart_1",
      items: [{ quantity: 1 }],
      region_id: "reg_1",
    }
    const updatedCart: Cart = {
      id: "cart_1",
      items: [{ quantity: 1 }, { quantity: 1 }],
      region_id: "reg_1",
    }
    const queryKeys = createCartQueryKeys("test-cart-activity-restore")
    const { useCart } = createCartHooks<
      Cart,
      { region_id?: string },
      { region_id?: string }
    >({
      queryKeys,
      requireRegion: false,
      service: {
        createCart: async () => staleCart,
        retrieveCart: async () => staleCart,
      },
    })
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const activeKey = queryKeys.active({ cartId: "cart_1", regionId: "reg_1" })
    const detailKey = queryKeys.detail("cart_1")

    queryClient.setQueryData(activeKey, updatedCart)
    queryClient.setQueryData(detailKey, updatedCart)

    const wrapper = createWrapper(queryClient)
    const { result } = renderHook(
      () =>
        useCart(
          {
            autoCreate: false,
            cartId: "cart_1",
            enabled: false,
            region_id: "reg_1",
          },
          {
            queryOptions: {
              select: () => staleCart,
            },
          },
        ),
      { wrapper },
    )

    expect(result.current.cart).toStrictEqual(staleCart)
    await waitFor(() => {
      expect(queryClient.getQueryData(activeKey)).toStrictEqual(updatedCart)
      expect(queryClient.getQueryData(detailKey)).toStrictEqual(updatedCart)
    })
  })

  it("keeps a newer line item mutation when an older cart read finishes later", async () => {
    const staleCart: Cart = {
      id: "cart_1",
      items: [{ quantity: 1 }],
      region_id: "reg_1",
    }
    const updatedCart: Cart = {
      id: "cart_1",
      items: [{ quantity: 2 }],
      region_id: "reg_1",
    }
    let resolveCartRead: ((cart: Cart) => void) | undefined
    const retrieveCart = vi.fn(
      async () =>
        await new Promise<Cart>((resolve) => {
          resolveCartRead = resolve
        }),
    )

    const { useCart, useUpdateLineItem } = createCartHooks<
      Cart,
      { region_id?: string },
      { region_id?: string }
    >({
      requireRegion: false,
      service: {
        createCart: async () => staleCart,
        retrieveCart,
        updateLineItem: async () => updatedCart,
      },
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)
    const { result } = renderHook(
      () => ({
        cart: useCart({
          autoCreate: false,
          cartId: "cart_1",
          region_id: "reg_1",
        }),
        updateLineItem: useUpdateLineItem(),
      }),
      { wrapper },
    )

    await waitFor(() => {
      expect(retrieveCart).toHaveBeenCalledOnce()
    })

    await act(async () => {
      await result.current.updateLineItem.mutateAsync({
        cartId: "cart_1",
        lineItemId: "item_1",
        quantity: 2,
      })
    })

    await waitFor(() => {
      expect(result.current.cart.cart?.items?.[0]?.quantity).toBe(2)
    })

    await act(async () => {
      resolveCartRead?.(staleCart)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(result.current.cart.query.fetchStatus).toBe("idle")
    })
    expect(result.current.cart.cart?.items?.[0]?.quantity).toBe(2)
  })

  it("allows an active cart read to finish when a line item mutation fails", async () => {
    const cart: Cart = {
      id: "cart_1",
      items: [{ quantity: 1 }],
      region_id: "reg_1",
    }
    let resolveCartRead: ((cart: Cart) => void) | undefined
    const retrieveCart = vi.fn(
      async () =>
        await new Promise<Cart>((resolve) => {
          resolveCartRead = resolve
        }),
    )

    const { useCart, useUpdateLineItem } = createCartHooks<
      Cart,
      { region_id?: string },
      { region_id?: string }
    >({
      requireRegion: false,
      service: {
        createCart: async () => cart,
        retrieveCart,
        updateLineItem: async () => {
          throw new Error("update failed")
        },
      },
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)
    const { result } = renderHook(
      () => ({
        cart: useCart({
          autoCreate: false,
          cartId: "cart_1",
          region_id: "reg_1",
        }),
        updateLineItem: useUpdateLineItem(),
      }),
      { wrapper },
    )

    await waitFor(() => {
      expect(retrieveCart).toHaveBeenCalledOnce()
    })

    await act(async () => {
      await expect(
        result.current.updateLineItem.mutateAsync({
          cartId: "cart_1",
          lineItemId: "item_1",
          quantity: 2,
        }),
      ).rejects.toThrow("update failed")
    })

    await act(async () => {
      resolveCartRead?.(cart)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(result.current.cart.cart?.items?.[0]?.quantity).toBe(1)
    })
  })
})
