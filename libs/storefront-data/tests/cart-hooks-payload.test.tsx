import { QueryClient } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import { createCartHooks } from "../src/cart/hooks"
import { StorefrontDataProvider } from "../src/client/provider"

interface Cart {
  id: string
  region_id?: string | null
  items?: { quantity?: number }[]
}

const createWrapper = (client: QueryClient) =>
  function StorefrontDataTestWrapper({ children }: { children: ReactNode }) {
    return (
      <StorefrontDataProvider client={client}>
        {children}
      </StorefrontDataProvider>
    )
  }

describe("createCartHooks payload normalization", () => {
  it("maps create cart salesChannelId to sales_channel_id", async () => {
    const createCart = vi
      .fn<(params: Record<string, unknown>) => Promise<Cart>>()
      .mockResolvedValue({ id: "cart_1", region_id: "reg_1" })
    const service = {
      createCart,
      retrieveCart: vi.fn<() => Promise<Cart | null>>().mockResolvedValue(null),
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
        country_code: "cz",
        email: "user@example.com",
        region_id: "reg_1",
        salesChannelId: "sc_1",
      })
    })

    expect(createCart).toHaveBeenCalledWith({
      country_code: "cz",
      email: "user@example.com",
      region_id: "reg_1",
      sales_channel_id: "sc_1",
    })
  })

  it("strips cartId from update cart payload", async () => {
    const updateCart = vi
      .fn<(cartId: string, params: Record<string, unknown>) => Promise<Cart>>()
      .mockResolvedValue({ id: "cart_1", region_id: "reg_1" })
    const service = {
      createCart: vi
        .fn<() => Promise<Cart>>()
        .mockResolvedValue({ id: "cart_1", region_id: "reg_1" }),
      retrieveCart: vi.fn<() => Promise<Cart | null>>().mockResolvedValue(null),
      updateCart,
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
        country_code: "cz",
        region_id: "reg_1",
        salesChannelId: "sc_2",
      })
    })

    expect(updateCart).toHaveBeenCalledWith("cart_1", {
      country_code: "cz",
      region_id: "reg_1",
      sales_channel_id: "sc_2",
    })
  })

  it("strips transient add line item keys from payload", async () => {
    const addLineItem = vi
      .fn<(cartId: string, params: Record<string, unknown>) => Promise<Cart>>()
      .mockResolvedValue({ id: "cart_1", region_id: "reg_1" })
    const service = {
      addLineItem,
      createCart: vi
        .fn<() => Promise<Cart>>()
        .mockResolvedValue({ id: "cart_1", region_id: "reg_1" }),
      retrieveCart: vi
        .fn<() => Promise<Cart | null>>()
        .mockResolvedValue({ id: "cart_1", region_id: "reg_1" }),
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
        autoCreate: true,
        cartId: "cart_1",
        country_code: "cz",
        quantity: 2,
        region_id: "reg_1",
        salesChannelId: "sc_3",
        variantId: "variant_1",
      })
    })

    expect(addLineItem).toHaveBeenCalledWith("cart_1", {
      quantity: 2,
      variantId: "variant_1",
    })
  })

  it("strips cart and line item identifiers from update line item payload", async () => {
    const updateLineItem = vi
      .fn<
        (
          cartId: string,
          lineItemId: string,
          params: Record<string, unknown>,
        ) => Promise<Cart>
      >()
      .mockResolvedValue({ id: "cart_1", region_id: "reg_1" })
    const service = {
      createCart: vi
        .fn<() => Promise<Cart>>()
        .mockResolvedValue({ id: "cart_1", region_id: "reg_1" }),
      retrieveCart: vi
        .fn<() => Promise<Cart | null>>()
        .mockResolvedValue({ id: "cart_1", region_id: "reg_1" }),
      updateLineItem,
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

    expect(updateLineItem).toHaveBeenCalledWith("cart_1", "item_1", {
      quantity: 3,
    })
  })
})
