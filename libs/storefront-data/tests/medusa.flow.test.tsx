import type Medusa from "@medusajs/js-sdk"
import { QueryClient } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { StorefrontDataProvider } from "../src/client/provider"
import type { CartQueryKeys } from "../src/cart/types"
import { createMedusaStorefrontPreset } from "../src/medusa/preset"
import { createQueryKey } from "../src/shared/query-keys"

const createWrapper = (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <StorefrontDataProvider client={client}>{children}</StorefrontDataProvider>
  )

type MedusaFlowSdkSubset = {
  client: Pick<Medusa["client"], "fetch">
  store: {
    cart: Pick<
      Medusa["store"]["cart"],
      "create" | "createLineItem" | "complete" | "addShippingMethod" | "retrieve"
    >
    payment: Pick<Medusa["store"]["payment"], "initiatePaymentSession">
  }
}

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

  const sdkSubset = {
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
  } satisfies MedusaFlowSdkSubset

  return {
    sdk: sdkSubset as Medusa,
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
      get: () => "cart_1",
      set: vi.fn(),
      clear: vi.fn(),
    }

    const storefront = createMedusaStorefrontPreset({
      sdk,
      cart: {
        hooks: {
          cartStorage,
        },
      },
    })
    const cartFlow = storefront.flows.cart

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => cartFlow.useAddToCart(), { wrapper })

    let returnedCart:
      | {
          id: string
          items?: Array<{ id?: string; quantity?: number }>
        }
      | undefined

    await act(async () => {
      returnedCart = await result.current.mutateAsync({
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
    expect(returnedCart).toMatchObject({
      id: "cart_1",
      items: [{ id: "item_1", quantity: 1 }],
    })
  })

  it("normalizes per-call add-to-cart success callbacks to canonical carts", async () => {
    const { sdk } = createSdkMock()
    const storefront = createMedusaStorefrontPreset({ sdk })
    const cartFlow = storefront.flows.cart
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)
    const onSuccess = vi.fn()

    const { result } = renderHook(() => cartFlow.useAddToCart(), { wrapper })

    act(() => {
      result.current.mutate(
        {
          cartId: "cart_1",
          variantId: "variant_1",
          quantity: 1,
        },
        {
          onSuccess,
        }
      )
    })

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "cart_1",
          items: [{ id: "item_1", quantity: 1 }],
        })
      )
    })
  })

  it("normalizes per-call add-to-cart errors for callbacks and mutateAsync", async () => {
    const { sdk } = createSdkMock()
    ;(
      sdk.store.cart.createLineItem as unknown as ReturnType<typeof vi.fn>
    ).mockRejectedValue({
      message: "Out of stock",
      code: "out_of_stock",
    })
    const storefront = createMedusaStorefrontPreset({ sdk })
    const cartFlow = storefront.flows.cart
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)
    const onError = vi.fn()

    const { result } = renderHook(() => cartFlow.useAddToCart(), { wrapper })

    act(() => {
      result.current.mutate(
        {
          cartId: "cart_1",
          variantId: "variant_1",
          quantity: 1,
        },
        {
          onError,
        }
      )
    })

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith({
        message: "Out of stock",
        code: "out_of_stock",
      })
    })

    await expect(
      result.current.mutateAsync({
        cartId: "cart_1",
        variantId: "variant_1",
        quantity: 1,
      })
    ).rejects.toMatchObject({
      message: "Out of stock",
      code: "out_of_stock",
    })
  })

  it("passes cart query input through to low-level hooks for region auto-create flows", async () => {
    const { sdk } = createSdkMock()
    const cartStorage = {
      get: () => null,
      set: vi.fn(),
      clear: vi.fn(),
    }

    const storefront = createMedusaStorefrontPreset({
      sdk,
      cart: {
        hooks: {
          cartStorage,
        },
      },
    })
    const cartFlow = storefront.flows.cart

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
      get: () => "cart_1",
      set: vi.fn(),
      clear: clearCartId,
    }

    const storefront = createMedusaStorefrontPreset({
      sdk,
      cart: {
        hooks: {
          cartStorage,
        },
      },
    })
    const cartFlow = storefront.flows.cart

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

  it("supports custom active cart query matcher in cart flow", async () => {
    const { sdk } = createSdkMock()
    const cartStorage = {
      get: () => "cart_1",
      set: vi.fn(),
      clear: vi.fn(),
    }
    const customCartNamespace = ["custom", "cart"] as const
    const customCartQueryKeys: CartQueryKeys = {
      all: () => createQueryKey(customCartNamespace),
      active: (params) =>
        createQueryKey(customCartNamespace, params.cartId ?? "__none__"),
      detail: (cartId) => createQueryKey(customCartNamespace, "detail", cartId),
    }

    const storefront = createMedusaStorefrontPreset({
      sdk,
      cart: {
        queryKeys: customCartQueryKeys,
        hooks: {
          cartStorage,
        },
        flow: {
          isActiveCartQueryKey: (queryKey, cartId) =>
            queryKey[0] === "custom" &&
            queryKey[1] === "cart" &&
            queryKey[2] === cartId,
        },
      },
    })
    const cartFlow = storefront.flows.cart

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    queryClient.setQueryData(
      customCartQueryKeys.active({
        cartId: "cart_1",
      }),
      {
        id: "cart_1",
        region_id: "reg_1",
      }
    )
    queryClient.setQueryData(customCartQueryKeys.detail("cart_1"), {
      id: "cart_1",
      region_id: "reg_1",
    })
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

    expect(
      queryClient.getQueryData(
        customCartQueryKeys.active({
          cartId: "cart_1",
        })
      )
    ).toBeUndefined()
  })

  it("supports custom active cart query matcher in checkout payment flow", async () => {
    const { sdk } = createSdkMock()
    const customCartNamespace = ["custom", "cart"] as const
    const customCartQueryKeys: CartQueryKeys = {
      all: () => createQueryKey(customCartNamespace),
      active: (params) =>
        createQueryKey(customCartNamespace, params.cartId ?? "__none__"),
      detail: (cartId) => createQueryKey(customCartNamespace, "detail", cartId),
    }

    const storefront = createMedusaStorefrontPreset({
      sdk,
      cart: {
        queryKeys: customCartQueryKeys,
        flow: {
          isActiveCartQueryKey: (queryKey, cartId) =>
            queryKey[0] === "custom" &&
            queryKey[1] === "cart" &&
            queryKey[2] === cartId,
        },
      },
    })
    const checkoutFlow = storefront.flows.checkout
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    queryClient.setQueryData(
      customCartQueryKeys.active({ cartId: "cart_1" }),
      {
        id: "cart_1",
        region_id: "reg_1",
        items: [{ id: "item_1", quantity: 1 }],
        shipping_methods: [{ shipping_option_id: "ship_1" }],
        payment_collection: {
          id: "payment_collection_1",
          payment_sessions: [{ provider_id: "pp_system_default" }],
        },
      }
    )

    const wrapper = createWrapper(queryClient)
    const { result } = renderHook(
      () => checkoutFlow.useCheckoutPayment("cart_1"),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.paymentProviders).toHaveLength(1)
    })

    expect(result.current.canInitiatePayment).toBe(true)
    expect(result.current.hasPaymentCollection).toBe(true)
    expect(result.current.hasPaymentSessions).toBe(true)
  })

  it("does not clear a newly switched cart id when complete-cart finishes", async () => {
    const { sdk } = createSdkMock()
    let storedCartId: string | null = "cart_1"
    const clearCartId = vi.fn(() => {
      storedCartId = null
    })
    const complete = sdk.store.cart.complete as unknown as ReturnType<typeof vi.fn>
    let resolveComplete:
      | ((value: {
          type: "order"
          order: {
            id: string
            region_id: string
          }
        }) => void)
      | null = null
    const completeDeferred = new Promise<{
      type: "order"
      order: {
        id: string
        region_id: string
      }
    }>((resolve) => {
      resolveComplete = resolve
    })

    complete.mockImplementation(() => completeDeferred)

    const cartStorage = {
      get: () => storedCartId,
      set: vi.fn((cartId: string) => {
        storedCartId = cartId
      }),
      clear: clearCartId,
    }

    const storefront = createMedusaStorefrontPreset({
      sdk,
      cart: {
        hooks: {
          cartStorage,
        },
      },
    })
    const cartFlow = storefront.flows.cart

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    queryClient.setQueryData(storefront.queryKeys.cart.detail("cart_1"), { id: "cart_1" })
    queryClient.setQueryData(storefront.queryKeys.cart.detail("cart_2"), { id: "cart_2" })
    queryClient.setQueryData(
      storefront.queryKeys.checkout.shippingOptions("cart_1"),
      []
    )
    queryClient.setQueryData(
      storefront.queryKeys.cart.active({
        cartId: "cart_1",
        regionId: "reg_1",
      }),
      { id: "cart_1", region_id: "reg_1" }
    )

    const wrapper = createWrapper(queryClient)
    const { result } = renderHook(() => cartFlow.useCompleteCart(), { wrapper })

    let mutationPromise: Promise<unknown> | undefined
    act(() => {
      mutationPromise = result.current.mutateAsync({})
    })

    await waitFor(() => {
      expect(complete).toHaveBeenCalledTimes(1)
    })

    storedCartId = "cart_2"
    resolveComplete?.({
      type: "order",
      order: {
        id: "order_1",
        region_id: "reg_1",
      },
    })

    await act(async () => {
      await mutationPromise
    })

    expect(clearCartId).not.toHaveBeenCalled()
    expect(storedCartId).toBe("cart_2")
    expect(
      queryClient.getQueryData(storefront.queryKeys.cart.detail("cart_1"))
    ).toBeUndefined()
    expect(
      queryClient.getQueryData(storefront.queryKeys.cart.detail("cart_2"))
    ).toEqual({ id: "cart_2" })
  })

  it("skips duplicate shipping selection with equivalent data", async () => {
    const { sdk, spies } = createSdkMock()
    const storefront = createMedusaStorefrontPreset({
      sdk,
    })
    const checkoutFlow = storefront.flows.checkout

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

  it("skips duplicate shipping selection after cart hydrates post-mount", async () => {
    const { sdk, spies } = createSdkMock()
    const storefront = createMedusaStorefrontPreset({
      sdk,
    })
    const checkoutFlow = storefront.flows.checkout

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)
    const { result } = renderHook(
      () => checkoutFlow.useCheckoutShipping("cart_1"),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.shippingOptions.length).toBe(1)
    })

    act(() => {
      queryClient.setQueryData(storefront.queryKeys.cart.detail("cart_1"), {
        id: "cart_1",
        region_id: "reg_1",
        items: [{ id: "item_1", quantity: 1 }],
        shipping_methods: [
          {
            shipping_option_id: "ship_1",
            data: { pickup_point_id: "pickup-1" },
          },
        ],
      })
    })

    await waitFor(() => {
      expect(result.current.selectedShippingMethodId).toBe("ship_1")
    })

    act(() => {
      result.current.setShipping("ship_1", {
        pickup_point_id: "pickup-1",
        empty: "",
      })
    })

    expect(spies.addShippingMethod).not.toHaveBeenCalled()
  })

  it("skips duplicate shipping selection in cartId-only flow", async () => {
    const { sdk, spies } = createSdkMock()
    const storefront = createMedusaStorefrontPreset({
      sdk,
    })
    const checkoutFlow = storefront.flows.checkout

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    queryClient.setQueryData(storefront.queryKeys.cart.detail("cart_1"), {
      id: "cart_1",
      region_id: "reg_1",
      items: [{ id: "item_1", quantity: 1 }],
      shipping_methods: [
        {
          shipping_option_id: "ship_1",
          data: { pickup_point_id: "pickup-1" },
        },
      ],
    })

    const { result } = renderHook(
      () => checkoutFlow.useCheckoutShipping("cart_1"),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.shippingOptions.length).toBe(1)
      expect(result.current.selectedShippingMethodId).toBe("ship_1")
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
      get: () => "cart_1",
      set: vi.fn(),
      clear: vi.fn(),
    }
    const storefront = createMedusaStorefrontPreset({
      sdk,
      cart: {
        hooks: {
          cartStorage,
        },
      },
    })
    const checkoutFlow = storefront.flows.checkout
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

  it("reuses an existing payment session for the selected provider", async () => {
    const { sdk, spies } = createSdkMock()
    const storefront = createMedusaStorefrontPreset({
      sdk,
    })
    const checkoutFlow = storefront.flows.checkout
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
            payment_collection: {
              id: "payment_collection_1",
              payment_sessions: [{ provider_id: "pp_system_default" }],
            },
          },
        }),
      { wrapper }
    )

    let checkoutResult:
      | {
          order: { id: string }
          paymentCollection: { id: string }
          paymentProviderId: string
        }
      | undefined

    await act(async () => {
      checkoutResult = await result.current.mutateAsync()
    })

    expect(checkoutResult).toMatchObject({
      order: { id: "order_1" },
      paymentCollection: { id: "payment_collection_1" },
      paymentProviderId: "pp_system_default",
    })
    expect(spies.initiatePaymentSession).not.toHaveBeenCalled()
    expect(spies.complete).toHaveBeenCalledWith("cart_1")
  })

  it("initiates payment when matching provider session is not selected", async () => {
    const { sdk, spies } = createSdkMock()
    const storefront = createMedusaStorefrontPreset({
      sdk,
    })
    const checkoutFlow = storefront.flows.checkout
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
            payment_collection: {
              id: "payment_collection_1",
              payment_sessions: [
                { provider_id: "pp_other", is_selected: true },
                { provider_id: "pp_system_default" },
              ],
            },
          },
        }),
      { wrapper }
    )

    await act(async () => {
      await result.current.mutateAsync({
        paymentProviderId: "pp_system_default",
      })
    })

    expect(spies.initiatePaymentSession).toHaveBeenCalledWith(
      expect.objectContaining({ id: "cart_1" }),
      { provider_id: "pp_system_default" }
    )
    expect(spies.complete).toHaveBeenCalledWith("cart_1")
  })

  it("derives default provider from selected payment session when not first", async () => {
    const { sdk, spies } = createSdkMock()
    const storefront = createMedusaStorefrontPreset({
      sdk,
    })
    const checkoutFlow = storefront.flows.checkout
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
            payment_collection: {
              id: "payment_collection_1",
              payment_sessions: [
                { provider_id: "pp_other" },
                { provider_id: "pp_system_default", is_selected: true },
              ],
            },
          },
        }),
      { wrapper }
    )

    let checkoutResult:
      | {
          order: { id: string }
          paymentCollection: { id: string }
          paymentProviderId: string
        }
      | undefined

    await act(async () => {
      checkoutResult = await result.current.mutateAsync()
    })

    expect(checkoutResult).toMatchObject({
      order: { id: "order_1" },
      paymentCollection: { id: "payment_collection_1" },
      paymentProviderId: "pp_system_default",
    })
    expect(spies.initiatePaymentSession).not.toHaveBeenCalled()
    expect(spies.complete).toHaveBeenCalledWith("cart_1")
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
    const checkoutFlow = storefront.flows.checkout
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

  it("returns stage-coded payment provider error when resolver throws", async () => {
    const { sdk } = createSdkMock()
    const storefront = createMedusaStorefrontPreset({
      sdk,
    })
    const checkoutFlow = storefront.flows.checkout
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(
      () =>
        checkoutFlow.useCompleteCheckout(
          {
            cartId: "cart_1",
            regionId: "reg_1",
            cart: {
              id: "cart_1",
              region_id: "reg_1",
              items: [{ id: "item_1", quantity: 1 }],
              shipping_methods: [{ shipping_option_id: "ship_1" }],
            },
          },
          {
            resolvePaymentProviderId: () => {
              throw new Error("Resolver crashed")
            },
          }
        ),
      { wrapper }
    )

    await expect(result.current.mutateAsync()).rejects.toMatchObject({
      stage: "payment_provider",
      message: "Resolver crashed",
    })
  })

  it("returns stage-coded payment provider error when provider refetch fails", async () => {
    const { sdk } = createSdkMock()
    const clientFetch = vi.fn(
      async (path: string): Promise<Record<string, unknown>> => {
        if (path === "/store/payment-providers") {
          throw new Error("Payment providers fetch failed")
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
    const checkoutFlow = storefront.flows.checkout
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
      message: "Payment providers fetch failed",
    })
  })

  it("treats null resolver result as an explicit opt-out from auto-selecting payment", async () => {
    const { sdk, spies } = createSdkMock()
    const storefront = createMedusaStorefrontPreset({
      sdk,
    })
    const checkoutFlow = storefront.flows.checkout
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(
      () =>
        checkoutFlow.useCompleteCheckout(
          {
            cartId: "cart_1",
            regionId: "reg_1",
            cart: {
              id: "cart_1",
              region_id: "reg_1",
              items: [{ id: "item_1", quantity: 1 }],
              shipping_methods: [{ shipping_option_id: "ship_1" }],
            },
          },
          {
            resolvePaymentProviderId: () => null,
          }
        ),
      { wrapper }
    )

    await expect(result.current.mutateAsync()).rejects.toMatchObject({
      stage: "payment_provider",
      message: "No payment provider available",
    })

    expect(spies.initiatePaymentSession).not.toHaveBeenCalled()
    expect(spies.complete).not.toHaveBeenCalled()
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
    const checkoutFlow = storefront.flows.checkout
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
