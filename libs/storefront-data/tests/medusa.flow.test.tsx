import type Medusa from "@medusajs/js-sdk"
import { QueryClient } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { StorefrontDataProvider } from "../src/client/provider"
import { createMedusaCartFlow } from "../src/medusa/cart-flow"
import { createMedusaCheckoutFlow } from "../src/medusa/checkout-flow"
import { createMedusaStorefrontPreset } from "../src/medusa/preset"

const createWrapper = (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <StorefrontDataProvider client={client}>{children}</StorefrontDataProvider>
  )

const createSdkMock = () => {
  const paymentProviders = [{ id: "pp_system_default" }]
  const canonicalCart = {
    id: "cart_1",
    region_id: "reg_1",
    items: [{ id: "item_1", quantity: 1 }],
    shipping_methods: [],
  }

  const clientFetch = vi.fn(
    async (path: string): Promise<Record<string, unknown>> => {
      if (path === "/store/carts/cart_1") {
        return { cart: canonicalCart }
      }

      if (path === "/store/shipping-options") {
        return {
          shipping_options: [{ id: "ship_1", amount: 150, price_type: "flat" }],
        }
      }

      if (path === "/store/payment-providers") {
        return {
          payment_providers: paymentProviders,
        }
      }

      return {}
    }
  )

  const createLineItem = vi.fn(async () => ({
    cart: {
      id: "cart_1",
      region_id: "reg_1",
      items: [{ quantity: 1 }],
    },
  }))
  const retrieve = vi.fn(async () => ({
    cart: canonicalCart,
  }))

  const complete = vi.fn(async () => ({
    type: "order" as const,
    order: {
      id: "order_1",
      region_id: "reg_1",
    },
  }))

  const addShippingMethod = vi.fn(async () => ({
    cart: {
      id: "cart_1",
      region_id: "reg_1",
      items: [{ id: "item_1", quantity: 1 }],
      shipping_methods: [
        {
          shipping_option_id: "ship_1",
          data: { pickup_point_id: "pickup-1" },
        },
      ],
    },
  }))

  const initiatePaymentSession = vi.fn(
    async (
      _cart: unknown,
      input: {
        provider_id: string
      }
    ) => ({
      payment_collection: {
        payment_sessions: [{ provider_id: input.provider_id }],
      },
    })
  )

  return {
    sdk: {
      client: {
        fetch: clientFetch,
      },
      store: {
        cart: {
          create: vi.fn(async () => ({
            cart: {
              id: "cart_1",
              region_id: "reg_1",
              items: [],
            },
          })),
          createLineItem,
          complete,
          addShippingMethod,
          retrieve,
        },
        payment: {
          initiatePaymentSession,
        },
      },
    } as unknown as Medusa,
    spies: {
      addShippingMethod,
      clientFetch,
      complete,
      createLineItem,
      initiatePaymentSession,
      retrieve,
    },
  }
}

describe("Medusa flow helpers", () => {
  it("refreshes cart caches with canonical cart payload after add-to-cart", async () => {
    const { sdk, spies } = createSdkMock()
    const cartStorage = {
      getCartId: () => "cart_1",
      setCartId: vi.fn(),
      clearCartId: vi.fn(),
    }

    const storefront = createMedusaStorefrontPreset({
      sdk,
      cart: {
        hooks: {
          cartStorage,
        },
      },
    })
    const cartFlow = createMedusaCartFlow({
      storefront,
      cartStorage,
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => cartFlow.useAddToCart(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        cartId: "cart_1",
        variantId: "variant_1",
        quantity: 1,
      })
    })

    await waitFor(() => {
      expect(spies.clientFetch).toHaveBeenCalledWith(
        "/store/carts/cart_1",
        expect.objectContaining({})
      )
    })

    expect(
      queryClient.getQueryData(storefront.queryKeys.cart.detail("cart_1"))
    ).toEqual(
      expect.objectContaining({
        id: "cart_1",
        items: [{ id: "item_1", quantity: 1 }],
      })
    )

    expect(
      queryClient.getQueryData(
        storefront.queryKeys.cart.active({
          cartId: "cart_1",
          regionId: "reg_1",
        })
      )
    ).toEqual(
      expect.objectContaining({
        id: "cart_1",
        items: [{ id: "item_1", quantity: 1 }],
      })
    )
  })

  it("passes cart query input through to low-level hooks for region auto-create flows", async () => {
    const { sdk } = createSdkMock()
    const cartStorage = {
      getCartId: () => null,
      setCartId: vi.fn(),
      clearCartId: vi.fn(),
    }

    const storefront = createMedusaStorefrontPreset({
      sdk,
      cart: {
        hooks: {
          cartStorage,
        },
      },
    })
    const cartFlow = createMedusaCartFlow({
      storefront,
      cartStorage,
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(
      () =>
        cartFlow.useCart({
          region_id: "reg_1",
          autoCreate: true,
          autoUpdateRegion: true,
          enabled: true,
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.cart?.id).toBe("cart_1")
    })
  })

  it("clears cart state and seeds order cache after complete-cart order result", async () => {
    const { sdk } = createSdkMock()
    const clearCartId = vi.fn()
    const cartStorage = {
      getCartId: () => "cart_1",
      setCartId: vi.fn(),
      clearCartId,
    }

    const storefront = createMedusaStorefrontPreset({
      sdk,
      cart: {
        hooks: {
          cartStorage,
        },
      },
    })
    const cartFlow = createMedusaCartFlow({
      storefront,
      cartStorage,
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    queryClient.setQueryData(
      storefront.queryKeys.cart.detail("cart_1"),
      {
        id: "cart_1",
        region_id: "reg_1",
      }
    )
    queryClient.setQueryData(
      storefront.queryKeys.cart.active({
        cartId: "cart_1",
        regionId: "reg_1",
      }),
      {
        id: "cart_1",
        region_id: "reg_1",
      }
    )
    queryClient.setQueryData(
      storefront.queryKeys.checkout.shippingOptions("cart_1"),
      []
    )
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => cartFlow.useCompleteCart(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        cartId: "cart_1",
      })
    })

    expect(clearCartId).toHaveBeenCalledTimes(1)
    expect(
      queryClient.getQueryData(storefront.queryKeys.cart.detail("cart_1"))
    ).toBeUndefined()
    expect(
      queryClient.getQueryData(
        storefront.queryKeys.cart.active({
          cartId: "cart_1",
          regionId: "reg_1",
        })
      )
    ).toBeUndefined()
    expect(
      queryClient.getQueryData(storefront.queryKeys.checkout.shippingOptions("cart_1"))
    ).toBeUndefined()
    expect(
      queryClient.getQueryData(
        storefront.queryKeys.orders.detail({ id: "order_1" })
      )
    ).toEqual(
      expect.objectContaining({
        id: "order_1",
      })
    )
  })

  it("skips duplicate shipping selection with equivalent data", async () => {
    const { sdk, spies } = createSdkMock()
    const storefront = createMedusaStorefrontPreset({
      sdk,
    })
    const checkoutFlow = createMedusaCheckoutFlow({
      storefront,
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const cart = {
      id: "cart_1",
      region_id: "reg_1",
      items: [{ id: "item_1", quantity: 1 }],
      shipping_methods: [
        {
          shipping_option_id: "ship_1",
          data: { pickup_point_id: "pickup-1" },
        },
      ],
    }

    const { result } = renderHook(
      () => checkoutFlow.useCheckoutShipping("cart_1", cart),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.shippingOptions.length).toBe(1)
    })

    act(() => {
      result.current.setShipping("ship_1", {
        pickup_point_id: "pickup-1",
        empty: "",
      })
    })

    expect(spies.addShippingMethod).not.toHaveBeenCalled()
  })

  it("completes checkout with fallback payment provider and returns order", async () => {
    const { sdk, spies } = createSdkMock()
    const cartStorage = {
      getCartId: () => "cart_1",
      setCartId: vi.fn(),
      clearCartId: vi.fn(),
    }
    const storefront = createMedusaStorefrontPreset({
      sdk,
      cart: {
        hooks: {
          cartStorage,
        },
      },
    })
    const checkoutFlow = createMedusaCheckoutFlow({
      storefront,
      cartStorage,
    })
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(
      () =>
        checkoutFlow.useCompleteCheckout({
          cartId: "cart_1",
          regionId: "reg_1",
          cart: {
            id: "cart_1",
            region_id: "reg_1",
            items: [{ id: "item_1", quantity: 1 }],
            shipping_methods: [{ shipping_option_id: "ship_1" }],
          },
        }),
      { wrapper }
    )

    let checkoutResult:
      | {
          order: { id: string }
          paymentProviderId: string
        }
      | undefined

    await act(async () => {
      checkoutResult = await result.current.mutateAsync()
    })

    expect(checkoutResult).toMatchObject({
      order: { id: "order_1" },
      paymentProviderId: "pp_system_default",
    })
    expect(spies.initiatePaymentSession).toHaveBeenCalledWith(
      expect.objectContaining({ id: "cart_1" }),
      { provider_id: "pp_system_default" }
    )
    expect(spies.initiatePaymentSession.mock.invocationCallOrder[0]).toBeLessThan(
      spies.complete.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY
    )
  })

  it("returns stage-coded payment provider error when no provider is available", async () => {
    const { sdk } = createSdkMock()
    const clientFetch = vi.fn(
      async (path: string): Promise<Record<string, unknown>> => {
        if (path === "/store/payment-providers") {
          return {
            payment_providers: [],
          }
        }

        if (path === "/store/shipping-options") {
          return {
            shipping_options: [{ id: "ship_1", amount: 150, price_type: "flat" }],
          }
        }

        return {}
      }
    )

    ;(sdk.client.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      clientFetch
    )

    const storefront = createMedusaStorefrontPreset({
      sdk,
    })
    const checkoutFlow = createMedusaCheckoutFlow({
      storefront,
    })
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(
      () =>
        checkoutFlow.useCompleteCheckout({
          cartId: "cart_1",
          regionId: "reg_1",
          cart: {
            id: "cart_1",
            region_id: "reg_1",
            items: [{ id: "item_1", quantity: 1 }],
            shipping_methods: [{ shipping_option_id: "ship_1" }],
          },
        }),
      { wrapper }
    )

    await expect(result.current.mutateAsync()).rejects.toMatchObject({
      stage: "payment_provider",
      message: "No payment provider available",
    })
  })

  it("returns stage-coded complete error when complete cart returns cart payload", async () => {
    const { sdk } = createSdkMock()
    const complete = vi.fn(async () => ({
      type: "cart" as const,
      cart: {
        id: "cart_1",
        region_id: "reg_1",
        items: [{ id: "item_1", quantity: 1 }],
      },
      error: {
        message: "Payment authorization failed",
        name: "PaymentError",
        type: "payment",
      },
    }))

    ;(sdk.store.cart.complete as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      complete
    )

    const storefront = createMedusaStorefrontPreset({
      sdk,
    })
    const checkoutFlow = createMedusaCheckoutFlow({
      storefront,
    })
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(
      () =>
        checkoutFlow.useCompleteCheckout({
          cartId: "cart_1",
          regionId: "reg_1",
          cart: {
            id: "cart_1",
            region_id: "reg_1",
            items: [{ id: "item_1", quantity: 1 }],
            shipping_methods: [{ shipping_option_id: "ship_1" }],
          },
        }),
      { wrapper }
    )

    await expect(result.current.mutateAsync()).rejects.toMatchObject({
      stage: "complete",
      message: "Payment authorization failed",
    })
  })
})
