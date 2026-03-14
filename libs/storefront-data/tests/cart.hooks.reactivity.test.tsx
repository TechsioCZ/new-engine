import { QueryClient } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { StorefrontDataProvider } from "../src/client/provider"
import { createLocalStorageCartStorage } from "../src/cart/browser-storage"
import { createCartHooks } from "../src/cart/hooks"
import { createCartQueryKeys } from "../src/cart/query-keys"

type Cart = {
  id: string
  region_id?: string | null
  items?: Array<{ quantity?: number }>
}

const createWrapper = (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <StorefrontDataProvider client={client}>{children}</StorefrontDataProvider>
  )

describe("createCartHooks reactive storage and cache sync", () => {
  it("reacts to observable cartStorage changes", async () => {
    const key = "test_reactive_cart_id"
    window.localStorage.removeItem(key)
    const cartStorage = createLocalStorageCartStorage({ key })
    const retrieveCart = vi.fn(async (cartId: string) => ({
      id: cartId,
      region_id: "reg_1",
      items: [{ quantity: 2 }],
    }))

    const { useCart } = createCartHooks<Cart, { region_id?: string }, { region_id?: string }>({
      service: {
        retrieveCart,
        createCart: async () => ({ id: "cart_created", region_id: "reg_1" }),
      },
      cartStorage,
      requireRegion: false,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => useCart({ autoCreate: false }), {
      wrapper,
    })

    expect(result.current.cart).toBeNull()
    expect(retrieveCart).not.toHaveBeenCalled()

    act(() => {
      cartStorage.setCartId("cart_1")
    })

    await waitFor(() => {
      expect(result.current.cart?.id).toBe("cart_1")
    })

    expect(retrieveCart.mock.calls.at(-1)?.[0]).toBe("cart_1")
    window.localStorage.removeItem(key)
  })

  it("syncs active and detail caches for line item mutations", async () => {
    const updatedCart: Cart = {
      id: "cart_1",
      region_id: "reg_1",
      items: [{ quantity: 4 }],
    }
    const queryKeys = createCartQueryKeys("test-cart-hook-sync")

    const { useAddLineItem } = createCartHooks<
      Cart,
      { region_id?: string },
      { region_id?: string }
    >({
      service: {
        retrieveCart: async () => updatedCart,
        createCart: async () => updatedCart,
        addLineItem: async () => updatedCart,
      },
      queryKeys,
      requireRegion: false,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)
    const activeKey = queryKeys.active({ cartId: "cart_1", regionId: "reg_1" })
    const detailKey = queryKeys.detail("cart_1")

    queryClient.setQueryData(activeKey, {
      id: "cart_1",
      region_id: "reg_1",
      items: [{ quantity: 1 }],
    } satisfies Cart)
    queryClient.setQueryData(detailKey, {
      id: "cart_1",
      region_id: "reg_1",
      items: [{ quantity: 1 }],
    } satisfies Cart)

    const { result } = renderHook(() => useAddLineItem(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        cartId: "cart_1",
        variantId: "variant_1",
        quantity: 3,
      })
    })

    expect(queryClient.getQueryData(activeKey)).toEqual(updatedCart)
    expect(queryClient.getQueryData(detailKey)).toEqual(updatedCart)
  })
})
