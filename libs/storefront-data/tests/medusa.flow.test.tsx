import Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import { QueryClient } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { vi, describe, expect, it } from "vitest"

import type { CartQueryKeys } from "../src/cart/types"
import { StorefrontDataProvider } from "../src/client/provider"
import { createMedusaStorefrontPreset } from "../src/medusa/preset"
import { createQueryKey } from "../src/shared/query-keys"
import {
  createSelectedStorePaymentSession,
  createStoreCart,
  createStoreCartLineItem,
  createStoreCartShippingMethod,
  createStoreOrder,
  createStorePaymentCollection,
  createStorePaymentSession,
  createStoreShippingOption,
} from "./medusa-fixtures"

const createWrapper =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <StorefrontDataProvider client={client}>{children}</StorefrontDataProvider>
  )

interface SdkMockOverrides {
  clientFetch?: ReturnType<typeof vi.fn>
  complete?: ReturnType<typeof vi.fn>
  createLineItem?: ReturnType<typeof vi.fn>
}

const createSdkMock = (overrides: SdkMockOverrides = {}) => {
  const paymentProviders = [{ id: "pp_system_default" }]
  const canonicalCart = createStoreCart("cart_1", {
    region_id: "reg_1",
    shipping_methods: [],
  })
  canonicalCart.items = [createStoreCartLineItem(canonicalCart)]

  const defaultClientFetch = vi.fn(async (path: string) => {
    if (path === "/store/carts/cart_1") {
      return { cart: canonicalCart }
    }

    if (path === "/store/shipping-options") {
      return {
        shipping_options: [
          createStoreShippingOption("ship_1", { amount: 150 }),
        ],
      }
    }

    if (path === "/store/payment-providers") {
      return {
        payment_providers: paymentProviders,
      }
    }

    return {}
  })
  const clientFetch = overrides.clientFetch ?? defaultClientFetch

  const incompleteCart = createStoreCart("cart_1", { region_id: "reg_1" })
  Object.defineProperty(incompleteCart, "items", {
    configurable: true,
    enumerable: true,
    value: [{ quantity: 1 }],
  })
  const defaultCreateLineItem = vi.fn(async () => ({ cart: incompleteCart }))
  const createLineItem = overrides.createLineItem ?? defaultCreateLineItem
  const retrieve = vi.fn(async () => ({ cart: canonicalCart }))
  const defaultComplete = vi.fn(async () => ({
    order: createStoreOrder("order_1", { region_id: "reg_1" }),
    type: "order" as const,
  }))
  const complete = overrides.complete ?? defaultComplete

  const shippingCart = createStoreCart("cart_1", { region_id: "reg_1" })
  shippingCart.items = [createStoreCartLineItem(shippingCart)]
  shippingCart.shipping_methods = [
    createStoreCartShippingMethod("cart_1", {
      data: { pickup_point_id: "pickup-1" },
      shipping_option_id: "ship_1",
    }),
  ]
  const addShippingMethod = vi.fn(async () => ({ cart: shippingCart }))

  const initiatePaymentSession = vi.fn(
    async (_cart: HttpTypes.StoreCart, input: { provider_id: string }) => ({
      payment_collection: createStorePaymentCollection({
        payment_sessions: [createStorePaymentSession(input.provider_id)],
      }),
    })
  )

  const sdk = new Medusa({ baseUrl: "https://storefront.test" })
  Object.defineProperty(sdk.client, "fetch", { value: clientFetch })
  Object.defineProperties(sdk.store.cart, {
    addShippingMethod: { value: addShippingMethod },
    complete: { value: complete },
    create: {
      value: vi.fn(async () => ({
        cart: createStoreCart("cart_1", { region_id: "reg_1", items: [] }),
      })),
    },
    createLineItem: { value: createLineItem },
    retrieve: { value: retrieve },
  })
  Object.defineProperty(sdk.store.payment, "initiatePaymentSession", {
    value: initiatePaymentSession,
  })

  return {
    sdk,
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

const createCheckoutCart = (
  overrides: Partial<HttpTypes.StoreCart> = {}
): HttpTypes.StoreCart => {
  const cart = createStoreCart("cart_1", {
    region_id: "reg_1",
    ...overrides,
  })
  cart.items ??= [createStoreCartLineItem(cart)]
  cart.shipping_methods ??= [
    createStoreCartShippingMethod(cart.id, { shipping_option_id: "ship_1" }),
  ]
  return cart
}

describe("Medusa flow helpers", () => {
  it("refreshes cart caches with canonical cart payload after add-to-cart", async () => {
    const { sdk, spies } = createSdkMock()
    const cartStorage = {
      clear: vi.fn(),
      get: () => "cart_1",
      set: vi.fn(),
    }

    const storefront = createMedusaStorefrontPreset({
      cart: {
        hooks: {
          cartStorage,
        },
      },
      sdk,
    })
    const cartFlow = storefront.flows.cart

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => cartFlow.useAddToCart(), { wrapper })

    let returnedCart:
      | {
          id: string
          items?: { id?: string; quantity?: number }[]
        }
      | undefined

    await act(async () => {
      returnedCart = await result.current.mutateAsync({
        cartId: "cart_1",
        quantity: 1,
        variantId: "variant_1",
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
    ).toStrictEqual(
      expect.objectContaining({
        id: "cart_1",
        items: [expect.objectContaining({ id: "item_1", quantity: 1 })],
      })
    )

    expect(
      queryClient.getQueryData(
        storefront.queryKeys.cart.active({
          cartId: "cart_1",
          regionId: "reg_1",
        })
      )
    ).toStrictEqual(
      expect.objectContaining({
        id: "cart_1",
        items: [expect.objectContaining({ id: "item_1", quantity: 1 })],
      })
    )
    expect(returnedCart).toMatchObject({
      id: "cart_1",
      items: [expect.objectContaining({ id: "item_1", quantity: 1 })],
    })
  })

  it("normalizes per-call add-to-cart success callbacks to canonical carts", async () => {
    const { sdk } = createSdkMock()
    const storefront = createMedusaStorefrontPreset({ sdk })
    const cartFlow = storefront.flows.cart
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)
    const onSuccess = vi.fn()

    const { result } = renderHook(() => cartFlow.useAddToCart(), { wrapper })

    act(() => {
      result.current.mutate(
        {
          cartId: "cart_1",
          quantity: 1,
          variantId: "variant_1",
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
          items: [expect.objectContaining({ id: "item_1", quantity: 1 })],
        })
      )
    })
  })

  it("normalizes per-call add-to-cart errors for callbacks and mutateAsync", async () => {
    const createLineItem = vi.fn().mockRejectedValue({
      code: "out_of_stock",
      message: "Out of stock",
    })
    const { sdk } = createSdkMock({ createLineItem })
    const storefront = createMedusaStorefrontPreset({ sdk })
    const cartFlow = storefront.flows.cart
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)
    const onError = vi.fn()

    const { result } = renderHook(() => cartFlow.useAddToCart(), { wrapper })

    act(() => {
      result.current.mutate(
        {
          cartId: "cart_1",
          quantity: 1,
          variantId: "variant_1",
        },
        {
          onError,
        }
      )
    })

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith({
        code: "out_of_stock",
        message: "Out of stock",
      })
    })

    await expect(
      result.current.mutateAsync({
        cartId: "cart_1",
        quantity: 1,
        variantId: "variant_1",
      })
    ).rejects.toMatchObject({
      code: "out_of_stock",
      message: "Out of stock",
    })
  })

  it("passes cart query input through to low-level hooks for region auto-create flows", async () => {
    const { sdk } = createSdkMock()
    const cartStorage = {
      clear: vi.fn(),
      get: () => null,
      set: vi.fn(),
    }

    const storefront = createMedusaStorefrontPreset({
      cart: {
        hooks: {
          cartStorage,
        },
      },
      sdk,
    })
    const cartFlow = storefront.flows.cart

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(
      () =>
        cartFlow.useCart({
          autoCreate: true,
          autoUpdateRegion: true,
          enabled: true,
          region_id: "reg_1",
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
      clear: clearCartId,
      get: () => "cart_1",
      set: vi.fn(),
    }

    const storefront = createMedusaStorefrontPreset({
      cart: {
        hooks: {
          cartStorage,
        },
      },
      sdk,
    })
    const cartFlow = storefront.flows.cart

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    queryClient.setQueryData(storefront.queryKeys.cart.detail("cart_1"), {
      id: "cart_1",
      region_id: "reg_1",
    })
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

    const { result } = renderHook(() => cartFlow.useCompleteCart(), {
      wrapper,
    })

    await act(async () => {
      await result.current.mutateAsync({
        cartId: "cart_1",
      })
    })

    expect(clearCartId).toHaveBeenCalledOnce()
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
      queryClient.getQueryData(
        storefront.queryKeys.checkout.shippingOptions("cart_1")
      )
    ).toBeUndefined()
    expect(
      queryClient.getQueryData(
        storefront.queryKeys.orders.detail({ id: "order_1" })
      )
    ).toStrictEqual(
      expect.objectContaining({
        id: "order_1",
      })
    )
  })

  it("supports custom active cart query matcher in cart flow", async () => {
    const { sdk } = createSdkMock()
    const cartStorage = {
      clear: vi.fn(),
      get: () => "cart_1",
      set: vi.fn(),
    }
    const customCartNamespace = ["custom", "cart"] as const
    const customCartQueryKeys: CartQueryKeys = {
      active: (params) =>
        createQueryKey(customCartNamespace, params.cartId ?? "__none__"),
      all: () => createQueryKey(customCartNamespace),
      detail: (cartId) => createQueryKey(customCartNamespace, "detail", cartId),
    }

    const storefront = createMedusaStorefrontPreset({
      cart: {
        flow: {
          isActiveCartQueryKey: (queryKey, cartId) =>
            queryKey[0] === "custom" &&
            queryKey[1] === "cart" &&
            queryKey[2] === cartId,
        },
        hooks: {
          cartStorage,
        },
        queryKeys: customCartQueryKeys,
      },
      sdk,
    })
    const cartFlow = storefront.flows.cart

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
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

    const { result } = renderHook(() => cartFlow.useCompleteCart(), {
      wrapper,
    })

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
      active: (params) =>
        createQueryKey(customCartNamespace, params.cartId ?? "__none__"),
      all: () => createQueryKey(customCartNamespace),
      detail: (cartId) => createQueryKey(customCartNamespace, "detail", cartId),
    }

    const storefront = createMedusaStorefrontPreset({
      cart: {
        flow: {
          isActiveCartQueryKey: (queryKey, cartId) =>
            queryKey[0] === "custom" &&
            queryKey[1] === "cart" &&
            queryKey[2] === cartId,
        },
        queryKeys: customCartQueryKeys,
      },
      sdk,
    })
    const checkoutFlow = storefront.flows.checkout
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })

    queryClient.setQueryData(customCartQueryKeys.active({ cartId: "cart_1" }), {
      id: "cart_1",
      items: [expect.objectContaining({ id: "item_1", quantity: 1 })],
      payment_collection: {
        id: "payment_collection_1",
        payment_sessions: [{ provider_id: "pp_system_default" }],
      },
      region_id: "reg_1",
      shipping_methods: [{ shipping_option_id: "ship_1" }],
    })

    const wrapper = createWrapper(queryClient)
    const { result } = renderHook(
      () => checkoutFlow.useCheckoutPayment("cart_1"),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.paymentProviders).toHaveLength(1)
    })

    expect(result.current.canInitiatePayment).toBeTruthy()
    expect(result.current.hasPaymentCollection).toBeTruthy()
    expect(result.current.hasPaymentSessions).toBeTruthy()
  })

  it("does not clear a newly switched cart id when complete-cart finishes", async () => {
    let resolveComplete:
      | ((value: { type: "order"; order: HttpTypes.StoreOrder }) => void)
      | undefined
    const completePromise = new Promise<{
      type: "order"
      order: HttpTypes.StoreOrder
    }>((resolve) => {
      resolveComplete = resolve
    })

    const complete = vi.fn(async () => completePromise)
    const { sdk } = createSdkMock({ complete })
    let storedCartId: string | null = "cart_1"
    const clearCartId = vi.fn(() => {
      storedCartId = null
    })

    const cartStorage = {
      clear: clearCartId,
      get: () => storedCartId,
      set: vi.fn((cartId: string) => {
        storedCartId = cartId
      }),
    }

    const storefront = createMedusaStorefrontPreset({
      cart: {
        hooks: {
          cartStorage,
        },
      },
      sdk,
    })
    const cartFlow = storefront.flows.cart

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    queryClient.setQueryData(storefront.queryKeys.cart.detail("cart_1"), {
      id: "cart_1",
    })
    queryClient.setQueryData(storefront.queryKeys.cart.detail("cart_2"), {
      id: "cart_2",
    })
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
    const { result } = renderHook(() => cartFlow.useCompleteCart(), {
      wrapper,
    })

    let mutationPromise: Promise<unknown> | undefined
    act(() => {
      mutationPromise = result.current.mutateAsync({})
    })

    await waitFor(() => {
      expect(complete).toHaveBeenCalledOnce()
    })

    storedCartId = "cart_2"
    if (!resolveComplete) {
      throw new Error("Complete resolver was not initialized")
    }
    resolveComplete({
      order: createStoreOrder("order_1", { region_id: "reg_1" }),
      type: "order",
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
    ).toStrictEqual({
      id: "cart_2",
    })
  })

  it("skips duplicate shipping selection with equivalent data", async () => {
    const { sdk, spies } = createSdkMock()
    const storefront = createMedusaStorefrontPreset({
      sdk,
    })
    const checkoutFlow = storefront.flows.checkout

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const cart = createCheckoutCart()
    cart.shipping_methods = [
      createStoreCartShippingMethod(cart.id, {
        data: { pickup_point_id: "pickup-1" },
        shipping_option_id: "ship_1",
      }),
    ]

    const { result } = renderHook(
      () => checkoutFlow.useCheckoutShipping("cart_1", cart),
      {
        wrapper,
      }
    )

    await waitFor(() => {
      expect(result.current.shippingOptions).toHaveLength(1)
    })

    act(() => {
      result.current.setShipping("ship_1", {
        empty: "",
        pickup_point_id: "pickup-1",
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
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)
    const { result } = renderHook(
      () => checkoutFlow.useCheckoutShipping("cart_1"),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.shippingOptions).toHaveLength(1)
    })

    act(() => {
      queryClient.setQueryData(storefront.queryKeys.cart.detail("cart_1"), {
        id: "cart_1",
        items: [expect.objectContaining({ id: "item_1", quantity: 1 })],
        region_id: "reg_1",
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
        empty: "",
        pickup_point_id: "pickup-1",
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
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    queryClient.setQueryData(storefront.queryKeys.cart.detail("cart_1"), {
      id: "cart_1",
      items: [expect.objectContaining({ id: "item_1", quantity: 1 })],
      region_id: "reg_1",
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
      expect(result.current.shippingOptions).toHaveLength(1)
      expect(result.current.selectedShippingMethodId).toBe("ship_1")
    })

    act(() => {
      result.current.setShipping("ship_1", {
        empty: "",
        pickup_point_id: "pickup-1",
      })
    })

    expect(spies.addShippingMethod).not.toHaveBeenCalled()
  })

  it("completes checkout with fallback payment provider and returns order", async () => {
    const { sdk, spies } = createSdkMock()
    const cartStorage = {
      clear: vi.fn(),
      get: () => "cart_1",
      set: vi.fn(),
    }
    const storefront = createMedusaStorefrontPreset({
      cart: {
        hooks: {
          cartStorage,
        },
      },
      sdk,
    })
    const checkoutFlow = storefront.flows.checkout
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(
      () =>
        checkoutFlow.useCompleteCheckout({
          cart: createCheckoutCart(),
          cartId: "cart_1",
          regionId: "reg_1",
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
    expect(
      spies.initiatePaymentSession.mock.invocationCallOrder[0]
    ).toBeLessThan(
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
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(
      () =>
        checkoutFlow.useCompleteCheckout({
          cart: createCheckoutCart({
            payment_collection: createStorePaymentCollection({
              payment_sessions: [
                createStorePaymentSession("pp_system_default"),
              ],
            }),
          }),
          cartId: "cart_1",
          regionId: "reg_1",
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

  it("reuses cached payment collection in complete checkout when checkout hooks provide the active cart matcher", async () => {
    const { sdk, spies } = createSdkMock()
    const storefront = createMedusaStorefrontPreset({
      checkout: {
        hooks: {
          isActiveCartQueryKey: (queryKey, cartId) =>
            queryKey[0] === "linked-cart" && queryKey[1] === cartId,
        },
      },
      sdk,
    })
    const checkoutFlow = storefront.flows.checkout
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    queryClient.setQueryData(createQueryKey(["linked-cart"], "cart_1"), {
      id: "cart_1",
      items: [expect.objectContaining({ id: "item_1", quantity: 1 })],
      payment_collection: {
        id: "payment_collection_1",
        payment_sessions: [
          { provider_id: "pp_system_default", is_selected: true },
        ],
      },
      region_id: "reg_1",
      shipping_methods: [{ shipping_option_id: "ship_1" }],
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(
      () =>
        checkoutFlow.useCompleteCheckout({
          cartId: "cart_1",
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(
        queryClient.getQueryData(
          storefront.queryKeys.checkout.paymentProviders("reg_1")
        )
      ).toStrictEqual([{ id: "pp_system_default" }])
    })

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
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(
      () =>
        checkoutFlow.useCompleteCheckout({
          cart: createCheckoutCart({
            payment_collection: createStorePaymentCollection({
              payment_sessions: [
                createSelectedStorePaymentSession("pp_other", true),
                createStorePaymentSession("pp_system_default"),
              ],
            }),
          }),
          cartId: "cart_1",
          regionId: "reg_1",
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
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(
      () =>
        checkoutFlow.useCompleteCheckout({
          cart: createCheckoutCart({
            payment_collection: createStorePaymentCollection({
              payment_sessions: [
                createStorePaymentSession("pp_other"),
                createSelectedStorePaymentSession("pp_system_default", true),
              ],
            }),
          }),
          cartId: "cart_1",
          regionId: "reg_1",
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
    const clientFetch = vi.fn(
      async (path: string): Promise<Record<string, unknown>> => {
        if (path === "/store/payment-providers") {
          return {
            payment_providers: [],
          }
        }

        if (path === "/store/shipping-options") {
          return {
            shipping_options: [
              { amount: 150, id: "ship_1", price_type: "flat" },
            ],
          }
        }

        return {}
      }
    )
    const { sdk } = createSdkMock({ clientFetch })

    const storefront = createMedusaStorefrontPreset({
      sdk,
    })
    const checkoutFlow = storefront.flows.checkout
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(
      () =>
        checkoutFlow.useCompleteCheckout({
          cart: createCheckoutCart(),
          cartId: "cart_1",
          regionId: "reg_1",
        }),
      { wrapper }
    )

    await expect(result.current.mutateAsync()).rejects.toMatchObject({
      message: "No payment provider available",
      stage: "payment_provider",
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
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(
      () =>
        checkoutFlow.useCompleteCheckout(
          {
            cart: createCheckoutCart(),
            cartId: "cart_1",
            regionId: "reg_1",
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
      message: "Resolver crashed",
      stage: "payment_provider",
    })
  })

  it("returns stage-coded payment provider error when provider refetch fails", async () => {
    const clientFetch = vi.fn(
      async (path: string): Promise<Record<string, unknown>> => {
        if (path === "/store/payment-providers") {
          throw new Error("Payment providers fetch failed")
        }

        if (path === "/store/shipping-options") {
          return {
            shipping_options: [
              { amount: 150, id: "ship_1", price_type: "flat" },
            ],
          }
        }

        return {}
      }
    )
    const { sdk } = createSdkMock({ clientFetch })

    const storefront = createMedusaStorefrontPreset({
      sdk,
    })
    const checkoutFlow = storefront.flows.checkout
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(
      () =>
        checkoutFlow.useCompleteCheckout({
          cart: createCheckoutCart(),
          cartId: "cart_1",
          regionId: "reg_1",
        }),
      { wrapper }
    )

    await expect(result.current.mutateAsync()).rejects.toMatchObject({
      message: "Payment providers fetch failed",
      stage: "payment_provider",
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
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(
      () =>
        checkoutFlow.useCompleteCheckout(
          {
            cart: createCheckoutCart(),
            cartId: "cart_1",
            regionId: "reg_1",
          },
          {
            resolvePaymentProviderId: () => null,
          }
        ),
      { wrapper }
    )

    await expect(result.current.mutateAsync()).rejects.toMatchObject({
      message: "No payment provider available",
      stage: "payment_provider",
    })

    expect(spies.initiatePaymentSession).not.toHaveBeenCalled()
    expect(spies.complete).not.toHaveBeenCalled()
  })

  it("returns stage-coded complete error when complete cart returns cart payload", async () => {
    const complete = vi.fn(async () => ({
      cart: {
        id: "cart_1",
        items: [expect.objectContaining({ id: "item_1", quantity: 1 })],
        region_id: "reg_1",
      },
      error: {
        message: "Payment authorization failed",
        name: "PaymentError",
        type: "payment",
      },
      type: "cart" as const,
    }))
    const { sdk } = createSdkMock({ complete })

    const storefront = createMedusaStorefrontPreset({
      sdk,
    })
    const checkoutFlow = storefront.flows.checkout
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(
      () =>
        checkoutFlow.useCompleteCheckout({
          cart: createCheckoutCart(),
          cartId: "cart_1",
          regionId: "reg_1",
        }),
      { wrapper }
    )

    await expect(result.current.mutateAsync()).rejects.toMatchObject({
      message: "Payment authorization failed",
      stage: "complete",
    })
  })
})
