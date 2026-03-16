import { QueryClient } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { StorefrontDataProvider } from "../src/client/provider"
import { createCartHooks } from "../src/cart/hooks"

type Cart = {
  id: string
  region_id?: string | null
  items?: { quantity?: number }[]
}

const createWrapper = (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <StorefrontDataProvider client={client}>{children}</StorefrontDataProvider>
  )

describe("createCartHooks payload normalization", () => {
  it("maps create cart salesChannelId to sales_channel_id", async () => {
    let createPayload: Record<string, unknown> | null = null

    const service = {
      retrieveCart: async () => null as Cart | null,
      createCart: async (params: Record<string, unknown>) => {
        createPayload = params
        return { id: "cart_1", region_id: "reg_1" } as Cart
      },
    }

    const { useCreateCart } = createCartHooks({
      service,
    })
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => useCreateCart(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        region_id: "reg_1",
        country_code: "cz",
        salesChannelId: "sc_1",
        email: "user@example.com",
      })
    })

    expect(createPayload).toMatchObject({
      region_id: "reg_1",
      country_code: "cz",
      sales_channel_id: "sc_1",
      email: "user@example.com",
    })
    expect(createPayload).not.toHaveProperty("salesChannelId")
  })

  it("strips cartId from update cart payload", async () => {
    let receivedCartId: string | null = null
    let updatePayload: Record<string, unknown> | null = null

    const service = {
      retrieveCart: async () => null as Cart | null,
      createCart: async () => ({ id: "cart_1", region_id: "reg_1" } as Cart),
      updateCart: async (cartId: string, params: Record<string, unknown>) => {
        receivedCartId = cartId
        updatePayload = params
        return { id: cartId, region_id: "reg_1" } as Cart
      },
    }

    const { useUpdateCart } = createCartHooks({
      service,
    })
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => useUpdateCart(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        cartId: "cart_1",
        region_id: "reg_1",
        salesChannelId: "sc_2",
      })
    })

    expect(receivedCartId).toBe("cart_1")
    expect(updatePayload).toMatchObject({
      region_id: "reg_1",
      sales_channel_id: "sc_2",
    })
    expect(updatePayload).not.toHaveProperty("cartId")
    expect(updatePayload).not.toHaveProperty("salesChannelId")
  })

  it("strips transient add line item keys from payload", async () => {
    let receivedCartId: string | null = null
    let addPayload: Record<string, unknown> | null = null

    const service = {
      retrieveCart: async () => ({ id: "cart_1", region_id: "reg_1" } as Cart),
      createCart: async () => ({ id: "cart_1", region_id: "reg_1" } as Cart),
      addLineItem: async (cartId: string, params: Record<string, unknown>) => {
        receivedCartId = cartId
        addPayload = params
        return { id: cartId, region_id: "reg_1" } as Cart
      },
    }

    const { useAddLineItem } = createCartHooks({
      service,
    })
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => useAddLineItem(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        cartId: "cart_1",
        variantId: "variant_1",
        quantity: 2,
        autoCreate: true,
        region_id: "reg_1",
        country_code: "cz",
        salesChannelId: "sc_3",
      })
    })

    expect(receivedCartId).toBe("cart_1")
    expect(addPayload).toMatchObject({
      variantId: "variant_1",
      quantity: 2,
    })
    expect(addPayload).not.toHaveProperty("cartId")
    expect(addPayload).not.toHaveProperty("autoCreate")
    expect(addPayload).not.toHaveProperty("region_id")
    expect(addPayload).not.toHaveProperty("country_code")
    expect(addPayload).not.toHaveProperty("salesChannelId")
  })

  it("strips cart and line item identifiers from update line item payload", async () => {
    let receivedCartId: string | null = null
    let receivedLineItemId: string | null = null
    let updateItemPayload: Record<string, unknown> | null = null

    const service = {
      retrieveCart: async () => ({ id: "cart_1", region_id: "reg_1" } as Cart),
      createCart: async () => ({ id: "cart_1", region_id: "reg_1" } as Cart),
      updateLineItem: async (
        cartId: string,
        lineItemId: string,
        params: Record<string, unknown>
      ) => {
        receivedCartId = cartId
        receivedLineItemId = lineItemId
        updateItemPayload = params
        return { id: cartId, region_id: "reg_1" } as Cart
      },
    }

    const { useUpdateLineItem } = createCartHooks({
      service,
    })
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => useUpdateLineItem(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        cartId: "cart_1",
        lineItemId: "item_1",
        quantity: 3,
      })
    })

    expect(receivedCartId).toBe("cart_1")
    expect(receivedLineItemId).toBe("item_1")
    expect(updateItemPayload).toEqual({ quantity: 3 })
    expect(updateItemPayload).not.toHaveProperty("cartId")
    expect(updateItemPayload).not.toHaveProperty("lineItemId")
  })
})
