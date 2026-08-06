import { setTimeout as delay } from "node:timers/promises"

import { QueryClient } from "@tanstack/react-query"
import { isRecord, omitKeys } from "@techsio/std/object"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { vi, describe, expect, it } from "vitest"

import { createAuthHooks } from "../src/auth/hooks"
import { createAuthQueryKeys } from "../src/auth/query-keys"
import { createCartQueryKeys } from "../src/cart/query-keys"
import { createCategoryHooks } from "../src/categories/hooks"
import { createCategoryQueryKeys } from "../src/categories/query-keys"
import { createCheckoutHooks } from "../src/checkout/hooks"
import { StorefrontDataProvider } from "../src/client/provider"
import { createCollectionHooks } from "../src/collections/hooks"
import { createCollectionQueryKeys } from "../src/collections/query-keys"
import { createProductHooks } from "../src/products/hooks"
import { createProductQueryKeys } from "../src/products/query-keys"
import type { ProductListInputBase } from "../src/products/types"
import { createRegionHooks } from "../src/regions/hooks"
import { createCacheConfig } from "../src/shared/cache-config"
import { shouldSkipPrefetch } from "../src/shared/prefetch"
import { createQueryKey } from "../src/shared/query-keys"

interface DecodedCheckoutCart {
  id: string
  region_id?: string | null
  shipping_methods?: { shipping_option_id?: string }[]
  payment_collection?: { id?: string; payment_sessions?: unknown[] }
}

const decodeShippingMethods = (
  value: unknown,
): { shipping_option_id?: string }[] | null | undefined => {
  if (value === undefined) {
    return undefined
  }
  if (!Array.isArray(value)) {
    return null
  }
  const methods: { shipping_option_id?: string }[] = []
  for (const entry of value) {
    if (!isRecord(entry)) {
      return null
    }
    const { shipping_option_id } = entry
    if (
      shipping_option_id !== undefined &&
      typeof shipping_option_id !== "string"
    ) {
      return null
    }
    methods.push(shipping_option_id === undefined ? {} : { shipping_option_id })
  }
  return methods
}

const decodePaymentCollection = (
  value: unknown,
): DecodedCheckoutCart["payment_collection"] | null | undefined => {
  if (value === undefined) {
    return undefined
  }
  if (!isRecord(value)) {
    return null
  }
  const { id, payment_sessions } = value
  if (id !== undefined && typeof id !== "string") {
    return null
  }
  if (payment_sessions !== undefined && !Array.isArray(payment_sessions)) {
    return null
  }
  return {
    ...(id === undefined ? {} : { id }),
    ...(payment_sessions === undefined ? {} : { payment_sessions }),
  }
}

const decodeCheckoutCart = (value: unknown): DecodedCheckoutCart | null => {
  if (!isRecord(value)) {
    return null
  }
  const { id, payment_collection, region_id, shipping_methods } = value
  if (typeof id !== "string") {
    return null
  }
  if (
    region_id !== undefined &&
    region_id !== null &&
    typeof region_id !== "string"
  ) {
    return null
  }
  const decodedShippingMethods = decodeShippingMethods(shipping_methods)
  const decodedPaymentCollection = decodePaymentCollection(payment_collection)
  if (decodedShippingMethods === null || decodedPaymentCollection === null) {
    return null
  }

  return {
    id,
    ...(region_id === undefined ? {} : { region_id }),
    ...(decodedShippingMethods === undefined
      ? {}
      : { shipping_methods: decodedShippingMethods }),
    ...(decodedPaymentCollection === undefined
      ? {}
      : { payment_collection: decodedPaymentCollection }),
  }
}

interface PaginationInput {
  page?: number
  limit?: number
  enabled?: boolean
}

interface PaginationParams {
  limit: number
  offset: number
}

interface ProductListParams extends PaginationParams {
  region_id?: string
}

const buildPaginationParams = (input: PaginationInput): PaginationParams => {
  const limit = input.limit ?? 20
  const page = input.page ?? 1
  return { limit, offset: (page - 1) * limit }
}

const buildProductListParams = (
  input: ProductListInputBase,
): ProductListParams => {
  const limit = input.limit ?? 20
  const page = input.page ?? 1
  const offset = (page - 1) * limit

  return {
    limit,
    offset,
    ...(input.region_id !== undefined && input.region_id !== ""
      ? { region_id: input.region_id }
      : {}),
  }
}

const createWrapper = (client: QueryClient) =>
  function StorefrontDataTestWrapper({ children }: { children: ReactNode }) {
    return (
      <StorefrontDataProvider client={client}>
        {children}
      </StorefrontDataProvider>
    )
  }

describe("storefront-data missing hook coverage", () => {
  describe.each([
    {
      createHooks: (args: {
        service: {
          getList: () => Promise<{ items: { id: string }[]; count: number }>
          getDetail: () => Promise<{ id: string }>
        }
        onListInput: (input: {
          page?: number
          limit?: number
          offset?: number
          enabled?: boolean
        }) => void
        onDetailInput: (input: { id?: string; enabled?: boolean }) => void
      }) => {
        const mappedService = {
          getCategories: async () => {
            const response = await args.service.getList()
            return { categories: response.items, count: response.count }
          },
          getCategory: args.service.getDetail,
        }
        const { useCategories, useCategory } = createCategoryHooks({
          buildDetailParams: (input) => {
            const params = omitKeys(input, ["enabled"])
            args.onDetailInput(params)
            return params
          },
          buildListParams: (input) => {
            const params = omitKeys(input, ["enabled"])
            args.onListInput(params)
            return params
          },
          queryKeyNamespace: "test-categories",
          service: mappedService,
        })
        return {
          useDetailHook: () => useCategory({ enabled: true, id: "cat_1" }),
          useListHook: () =>
            useCategories({ enabled: true, limit: 2, page: 1 }),
        }
      },
      detailInput: { enabled: true, id: "cat_1" },
      domain: "categories",
      listInput: { enabled: true, limit: 2, page: 1 },
      namespace: "test-categories",
    },
    {
      createHooks: (args: {
        service: {
          getList: () => Promise<{ items: { id: string }[]; count: number }>
          getDetail: () => Promise<{ id: string }>
        }
        onListInput: (input: {
          page?: number
          limit?: number
          offset?: number
          enabled?: boolean
        }) => void
        onDetailInput: (input: { id?: string; enabled?: boolean }) => void
      }) => {
        const mappedService = {
          getCollection: args.service.getDetail,
          getCollections: async () => {
            const response = await args.service.getList()
            return { collections: response.items, count: response.count }
          },
        }
        const { useCollections, useCollection } = createCollectionHooks({
          buildDetailParams: (input) => {
            const params = omitKeys(input, ["enabled"])
            args.onDetailInput(params)
            return params
          },
          buildListParams: (input) => {
            const params = omitKeys(input, ["enabled"])
            args.onListInput(params)
            return params
          },
          queryKeyNamespace: "test-collections",
          service: mappedService,
        })
        return {
          useDetailHook: () => useCollection({ enabled: true, id: "col_1" }),
          useListHook: () =>
            useCollections({ enabled: true, limit: 1, page: 1 }),
        }
      },
      detailInput: { enabled: true, id: "col_1" },
      domain: "collections",
      listInput: { enabled: true, limit: 1, page: 1 },
      namespace: "test-collections",
    },
    {
      createHooks: (args: {
        service: {
          getList: () => Promise<{ items: { id: string }[]; count: number }>
          getDetail: () => Promise<{ id: string }>
        }
        onListInput: (input: {
          page?: number
          limit?: number
          offset?: number
          enabled?: boolean
        }) => void
        onDetailInput: (input: { id?: string; enabled?: boolean }) => void
      }) => {
        const mappedService = {
          getRegion: args.service.getDetail,
          getRegions: async () => {
            const response = await args.service.getList()
            return { count: response.count, regions: response.items }
          },
        }
        const { useRegions, useRegion } = createRegionHooks({
          buildDetailParams: (input) => {
            const params = omitKeys(input, ["enabled"])
            args.onDetailInput(params)
            return params
          },
          buildListParams: (input) => {
            const params = omitKeys(input, ["enabled"])
            args.onListInput(params)
            return params
          },
          queryKeyNamespace: "test-regions",
          service: mappedService,
        })
        return {
          useDetailHook: () => useRegion({ enabled: true, id: "reg_1" }),
          useListHook: () => useRegions({ enabled: true, limit: 1, page: 1 }),
        }
      },
      detailInput: { enabled: true, id: "reg_1" },
      domain: "regions",
      listInput: { enabled: true, limit: 1, page: 1 },
      namespace: "test-regions",
    },
  ])("enabled stripping ($domain)", ({ domain, createHooks }) => {
    it(`strips enabled from ${domain} list/detail params`, async () => {
      let listSawEnabled = false
      let detailSawEnabled = false

      const service = {
        getDetail: async () => await Promise.resolve({ id: `${domain}_1` }),
        getList: async () =>
          await Promise.resolve({
            count: 1,
            items: [{ id: `${domain}_1` }],
          }),
      }

      const { useListHook, useDetailHook } = createHooks({
        onDetailInput: (input) => {
          detailSawEnabled = "enabled" in input
        },
        onListInput: (input) => {
          listSawEnabled = "enabled" in input
        },
        service,
      })

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })
      const wrapper = createWrapper(queryClient)

      const { result: listResult } = renderHook(() => useListHook(), {
        wrapper,
      })
      await waitFor(() => {
        expect(listResult.current.isSuccess).toBeTruthy()
      })
      expect(listSawEnabled).toBeFalsy()

      const { result: detailResult } = renderHook(() => useDetailHook(), {
        wrapper,
      })
      await waitFor(() => {
        expect(detailResult.current.isSuccess).toBeTruthy()
      })
      expect(detailSawEnabled).toBeFalsy()
    })
  })

  it("exposes auth state", async () => {
    const customer = { id: "cus_1" }

    const service = {
      getCustomer: async () => await Promise.resolve(customer),
      login: async () => await Promise.resolve(null),
      logout: async () => {
        await Promise.resolve()
      },
      register: async () => await Promise.resolve(null),
    }

    const { useAuth } = createAuthHooks({
      queryKeyNamespace: "test-auth",
      service,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBeTruthy()
    })

    expect(result.current.isAuthenticated).toBeTruthy()
    expect(result.current.customer).toStrictEqual(customer)
  })

  it("clears auth cache on logout", async () => {
    const service = {
      getCustomer: async () => await Promise.resolve({ id: "cus_1" }),
      login: async () => await Promise.resolve(null),
      logout: async () => {
        await Promise.resolve()
      },
      register: async () => await Promise.resolve(null),
    }

    const queryKeyNamespace = "test-auth-logout"
    const authQueryKeys = createAuthQueryKeys(queryKeyNamespace)
    const { useLogout } = createAuthHooks({
      queryKeyNamespace,
      service,
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    queryClient.setQueryData(authQueryKeys.customer(), { id: "cus_1" })
    queryClient.setQueryData(authQueryKeys.session(), { id: "sess_1" })

    const { result } = renderHook(() => useLogout(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync()
    })

    expect(
      queryClient.getQueryCache().findAll({ queryKey: authQueryKeys.all() }),
    ).toHaveLength(0)
  })

  it("invalidates customer and order domains on login", async () => {
    const service = {
      getCustomer: async () => await Promise.resolve({ id: "cus_1" }),
      login: async (_input: { email: string; password: string }) =>
        await Promise.resolve({ ok: true }),
      logout: async () => {
        await Promise.resolve()
      },
      register: async () => await Promise.resolve({ ok: true }),
    }

    const queryKeyNamespace = "test-auth-invalidation"
    const customerDomainKey = createQueryKey(queryKeyNamespace, "customer")
    const ordersDomainKey = createQueryKey(queryKeyNamespace, "orders")
    const { useLogin } = createAuthHooks({
      queryKeyNamespace,
      service,
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => useLogin(), { wrapper })

    await act(async () => {
      const input = {
        email: "qa@example.com",
        password: ["valid", "credential"].join("-"),
      }
      await result.current.mutateAsync(input)
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: createAuthQueryKeys(queryKeyNamespace).customer(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: customerDomainKey,
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ordersDomainKey,
    })
  })

  it("does not retry failed login mutation even when QueryClient retries mutations", async () => {
    const login = vi
      .fn<() => Promise<never>>()
      .mockRejectedValue(new Error("Invalid email or password"))
    const service = {
      getCustomer: async () => await Promise.resolve({ id: "cus_1" }),
      login,
      logout: async () => {
        await Promise.resolve()
      },
      register: async () => await Promise.resolve({ ok: true }),
    }

    const { useLogin } = createAuthHooks({
      queryKeyNamespace: "test-auth-login-no-retry",
      service,
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: 3, retryDelay: 1 },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)
    const { result } = renderHook(() => useLogin(), { wrapper })

    await act(async () => {
      const input = {
        email: "qa@example.com",
        password: ["invalid", "credential"].join("-"),
      }
      await expect(result.current.mutateAsync(input)).rejects.toThrow(
        "Invalid email or password",
      )
    })

    expect(login).toHaveBeenCalledOnce()
  })

  it("calculates checkout shipping prices and writes cart updates", async () => {
    interface Cart {
      id: string
      region_id?: string | null
      shipping_methods?: { shipping_option_id?: string }[]
    }

    interface ShippingOption {
      id: string
      price_type?: string | null
      amount?: number | null
    }

    interface PaymentProvider {
      id: string
    }
    interface PaymentCollection {
      id: string
      payment_sessions?: unknown[]
    }

    const service = {
      addShippingMethod: async (cartId: string, optionId: string) =>
        await Promise.resolve({
          id: cartId,
          region_id: "reg_1",
          shipping_methods: [{ shipping_option_id: optionId }],
        }),
      calculateShippingOption: async (optionId: string) =>
        await Promise.resolve({
          amount: 1200,
          id: optionId,
          price_type: "calculated",
        }),
      initiatePaymentSession: async () =>
        await Promise.resolve({ id: "pay_col_1" }),
      listPaymentProviders: async () =>
        await Promise.resolve([{ id: "pay_1" }]),
      listShippingOptions: async () =>
        await Promise.resolve([
          { amount: 500, id: "opt_fixed", price_type: "flat" },
          { id: "opt_calc", price_type: "calculated" },
        ]),
    }

    const cartQueryKeys = createCartQueryKeys("test-checkout-cart")
    const { useCheckoutShipping } = createCheckoutHooks<
      Cart,
      ShippingOption,
      PaymentProvider,
      PaymentCollection,
      unknown
    >({
      cartQueryKeys,
      decodeCart: decodeCheckoutCart,
      queryKeyNamespace: "test-checkout",
      service,
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const cart: Cart = {
      id: "cart_1",
      region_id: "reg_1",
      shipping_methods: [],
    }

    const { result } = renderHook(
      () =>
        useCheckoutShipping({
          calculatePrices: true,
          cart,
          cartId: cart.id,
        }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.shippingOptions).toHaveLength(2)
    })

    await waitFor(() => {
      expect(result.current.isCalculating).toBeFalsy()
    })

    expect(result.current.shippingPrices).toStrictEqual({
      opt_calc: 1200,
      opt_fixed: 500,
    })

    act(() => {
      result.current.setShippingMethod("opt_calc")
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData(
        cartQueryKeys.active({ cartId: cart.id, regionId: "reg_1" }),
      )
      expect(cached).toStrictEqual({
        id: cart.id,
        region_id: "reg_1",
        shipping_methods: [{ shipping_option_id: "opt_calc" }],
      })
    })

    expect(
      queryClient.getQueryData(cartQueryKeys.detail(cart.id)),
    ).toStrictEqual({
      id: cart.id,
      region_id: "reg_1",
      shipping_methods: [{ shipping_option_id: "opt_calc" }],
    })
  })

  it("lists checkout payment providers and patches then invalidates cart on payment", async () => {
    interface Cart {
      id: string
      region_id?: string | null
      shipping_methods?: { shipping_option_id?: string }[]
      payment_collection?: { payment_sessions?: unknown[] }
    }

    interface ShippingOption {
      id: string
      price_type?: string | null
      amount?: number | null
    }

    interface PaymentProvider {
      id: string
    }
    interface PaymentCollection {
      id: string
      payment_sessions?: unknown[]
    }

    const service = {
      addShippingMethod: async (cartId: string) =>
        await Promise.resolve({
          id: cartId,
          region_id: "reg_1",
          shipping_methods: [],
        }),
      initiatePaymentSession: async () =>
        await Promise.resolve({ id: "pay_col_1" }),
      listPaymentProviders: async () =>
        await Promise.resolve([{ id: "provider_1" }]),
      listShippingOptions: async () =>
        await Promise.resolve<ShippingOption[]>([]),
    }

    const cartQueryKeys = createCartQueryKeys("test-checkout-payment-cart")
    const { useCheckoutPayment } = createCheckoutHooks<
      Cart,
      ShippingOption,
      PaymentProvider,
      PaymentCollection,
      unknown
    >({
      cartQueryKeys,
      decodeCart: decodeCheckoutCart,
      queryKeyNamespace: "test-checkout-payment",
      service,
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const wrapper = createWrapper(queryClient)

    const cart: Cart = {
      id: "cart_1",
      region_id: "reg_1",
      shipping_methods: [{ shipping_option_id: "opt_fixed" }],
    }
    queryClient.setQueryData(
      cartQueryKeys.active({ cartId: cart.id, regionId: "reg_1" }),
      cart,
    )
    queryClient.setQueryData(cartQueryKeys.detail(cart.id), cart)

    const { result } = renderHook(
      () =>
        useCheckoutPayment({
          cart,
          cartId: cart.id,
          regionId: "reg_1",
        }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.paymentProviders).toHaveLength(1)
    })

    expect(result.current.canInitiatePayment).toBeTruthy()

    act(() => {
      result.current.initiatePayment("provider_1")
    })

    await waitFor(() => {
      expect(
        queryClient.getQueryData<Cart>(
          cartQueryKeys.active({ cartId: cart.id, regionId: "reg_1" }),
        ),
      ).toStrictEqual({
        ...cart,
        payment_collection: { id: "pay_col_1" },
      })
      expect(
        queryClient.getQueryData<Cart>(cartQueryKeys.detail(cart.id)),
      ).toStrictEqual({
        ...cart,
        payment_collection: { id: "pay_col_1" },
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: cartQueryKeys.all(),
      })
    })
  })

  it("derives checkout payment state from cached cart when render-time cart is missing", async () => {
    interface Cart {
      id: string
      region_id?: string | null
      shipping_methods?: { shipping_option_id?: string }[]
      payment_collection?: { id?: string; payment_sessions?: unknown[] }
    }

    interface ShippingOption {
      id: string
      price_type?: string | null
      amount?: number | null
    }

    interface PaymentProvider {
      id: string
    }
    interface PaymentCollection {
      id: string
      payment_sessions?: unknown[]
    }

    const service = {
      addShippingMethod: async (cartId: string) =>
        await Promise.resolve({
          id: cartId,
          region_id: "reg_1",
          shipping_methods: [],
        }),
      initiatePaymentSession: async () =>
        await Promise.resolve({ id: "pay_col_1" }),
      listPaymentProviders: async () =>
        await Promise.resolve([{ id: "provider_1" }]),
      listShippingOptions: async () =>
        await Promise.resolve<ShippingOption[]>([]),
    }

    const cartQueryKeys = createCartQueryKeys(
      "test-checkout-payment-cached-cart",
    )
    const { useCheckoutPayment } = createCheckoutHooks<
      Cart,
      ShippingOption,
      PaymentProvider,
      PaymentCollection,
      unknown
    >({
      cartQueryKeys,
      decodeCart: decodeCheckoutCart,
      queryKeyNamespace: "test-checkout-payment-cached-cart",
      service,
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    queryClient.setQueryData(
      cartQueryKeys.active({ cartId: "cart_1", regionId: "reg_1" }),
      {
        id: "cart_1",
        payment_collection: {
          id: "pay_col_cached",
          payment_sessions: [{ id: "session_1" }],
        },
        region_id: "reg_1",
        shipping_methods: [{ shipping_option_id: "opt_fixed" }],
      } satisfies Cart,
    )

    const { result } = renderHook(
      () =>
        useCheckoutPayment({
          cartId: "cart_1",
          regionId: "reg_1",
        }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.paymentProviders).toHaveLength(1)
    })

    expect(result.current.canInitiatePayment).toBeTruthy()
    expect(result.current.hasPaymentCollection).toBeTruthy()
    expect(result.current.hasPaymentSessions).toBeTruthy()
  })

  it("initiates checkout payment without forwarding render-time cart", async () => {
    interface Cart {
      id: string
      region_id?: string | null
      shipping_methods?: { shipping_option_id?: string }[]
      payment_collection?: { payment_sessions?: unknown[] }
    }

    interface ShippingOption {
      id: string
      price_type?: string | null
      amount?: number | null
    }

    interface PaymentProvider {
      id: string
    }
    interface PaymentCollection {
      id: string
      payment_sessions?: unknown[]
    }

    let receivedCart: Cart | null | undefined = { id: "initial" }
    const service = {
      addShippingMethod: async (cartId: string) =>
        await Promise.resolve({
          id: cartId,
          region_id: "reg_1",
          shipping_methods: [],
        }),
      initiatePaymentSession: async (
        _cartId: string,
        _providerId: string,
        cart?: Cart | null,
      ) => {
        receivedCart = cart
        return await Promise.resolve({ id: "pay_col_1" })
      },
      listPaymentProviders: async () =>
        await Promise.resolve([{ id: "provider_1" }]),
      listShippingOptions: async () =>
        await Promise.resolve<ShippingOption[]>([]),
    }

    const { useCheckoutPayment } = createCheckoutHooks<
      Cart,
      ShippingOption,
      PaymentProvider,
      PaymentCollection,
      unknown
    >({
      cartQueryKeys: createCartQueryKeys("test-checkout-payment-latest-cart"),
      decodeCart: decodeCheckoutCart,
      queryKeyNamespace: "test-checkout-payment-latest-cart",
      service,
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const staleRenderCart: Cart = {
      id: "cart_1",
      region_id: "reg_1",
      shipping_methods: [{ shipping_option_id: "opt_fixed" }],
    }

    const { result } = renderHook(
      () =>
        useCheckoutPayment({
          cart: staleRenderCart,
          cartId: staleRenderCart.id,
          regionId: "reg_1",
        }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.paymentProviders).toHaveLength(1)
    })

    await act(async () => {
      await result.current.initiatePaymentAsync("provider_1")
    })

    expect(receivedCart).toBeUndefined()
  })

  it("applies category prefetch skip semantics by freshness and cache presence", async () => {
    interface Category {
      id: string
    }
    interface ListParams {
      limit: number
      offset: number
    }
    interface DetailParams {
      id: string
    }

    let fetchCount = 0
    const service = {
      getCategories: async (params: ListParams) => {
        fetchCount += 1
        return await Promise.resolve({
          categories: [{ id: `cat_${params.offset}` }],
          count: 1,
        })
      },
      getCategory: async () => await Promise.resolve<Category | null>(null),
    }

    const queryKeyNamespace = "test-prefetch-categories"
    const queryKeys = createCategoryQueryKeys<ListParams, DetailParams>(
      queryKeyNamespace,
    )
    const { usePrefetchCategories } = createCategoryHooks({
      buildListParams: buildPaginationParams,
      cacheConfig: createCacheConfig({
        static: { staleTime: 0 },
      }),
      queryKeys,
      service,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)

    const input = { limit: 2, page: 1 }
    const listParams = buildPaginationParams(input)
    queryClient.setQueryData(queryKeys.list(listParams), {
      categories: [],
      count: 0,
    })

    const { result: freshResult } = renderHook(() => usePrefetchCategories(), {
      wrapper,
    })
    const { result: anyResult } = renderHook(
      () => usePrefetchCategories({ skipMode: "any" }),
      {
        wrapper,
      },
    )
    const { result: noSkipResult } = renderHook(
      () => usePrefetchCategories({ skipIfCached: false }),
      { wrapper },
    )

    await act(async () => {
      await freshResult.current.prefetchCategories(input)
    })
    expect(fetchCount).toBe(1)

    await act(async () => {
      await anyResult.current.prefetchCategories(input)
    })
    expect(fetchCount).toBe(1)

    await act(async () => {
      await noSkipResult.current.prefetchCategories(input)
    })
    expect(fetchCount).toBe(2)
  })

  it("applies collection prefetch skip semantics by freshness and cache presence", async () => {
    interface Collection {
      id: string
    }
    interface ListParams {
      limit: number
      offset: number
    }
    interface DetailParams {
      id: string
    }

    let fetchCount = 0
    const service = {
      getCollection: async () => await Promise.resolve<Collection | null>(null),
      getCollections: async (params: ListParams) => {
        fetchCount += 1
        return await Promise.resolve({
          collections: [{ id: `col_${params.offset}` }],
          count: 1,
        })
      },
    }

    const queryKeyNamespace = "test-prefetch-collections"
    const queryKeys = createCollectionQueryKeys<ListParams, DetailParams>(
      queryKeyNamespace,
    )
    const { usePrefetchCollections } = createCollectionHooks({
      buildListParams: buildPaginationParams,
      cacheConfig: createCacheConfig({
        static: { staleTime: 0 },
      }),
      queryKeys,
      service,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)

    const input = { limit: 2, page: 1 }
    const listParams = buildPaginationParams(input)
    queryClient.setQueryData(queryKeys.list(listParams), {
      collections: [],
      count: 0,
    })

    const { result: freshResult } = renderHook(() => usePrefetchCollections(), {
      wrapper,
    })
    const { result: anyResult } = renderHook(
      () => usePrefetchCollections({ skipMode: "any" }),
      {
        wrapper,
      },
    )
    const { result: noSkipResult } = renderHook(
      () => usePrefetchCollections({ skipIfCached: false }),
      { wrapper },
    )

    await act(async () => {
      await freshResult.current.prefetchCollections(input)
    })
    expect(fetchCount).toBe(1)

    await act(async () => {
      await anyResult.current.prefetchCollections(input)
    })
    expect(fetchCount).toBe(1)

    await act(async () => {
      await noSkipResult.current.prefetchCollections(input)
    })
    expect(fetchCount).toBe(2)
  })

  it("applies product prefetch skip semantics by freshness and cache presence", async () => {
    interface Product {
      id: string
    }

    interface ProductDetailParams {
      handle: string
      region_id?: string
    }

    let fetchCount = 0

    const service = {
      getProductByHandle: async () =>
        await Promise.resolve<Product | null>(null),
      getProducts: async (params: ProductListParams) => {
        fetchCount += 1
        return await Promise.resolve({
          count: 1,
          limit: params.limit,
          offset: params.offset,
          products: [{ id: `prod_${params.region_id ?? "default"}` }],
        })
      },
    }

    const queryKeyNamespace = "test-prefetch"
    const queryKeys = createProductQueryKeys<
      ProductListParams,
      ProductDetailParams
    >(queryKeyNamespace)

    const { usePrefetchProducts } = createProductHooks({
      buildListParams: buildProductListParams,
      cacheConfig: createCacheConfig({
        semiStatic: {
          staleTime: 0,
        },
      }),
      queryKeys,
      service,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => usePrefetchProducts(), { wrapper })

    const input = { limit: 2, page: 1, region_id: "reg_1" }
    const listParams = buildProductListParams(input)

    queryClient.setQueryData(queryKeys.list(listParams), {
      count: 0,
      limit: listParams.limit,
      offset: listParams.offset,
      products: [],
    })

    await act(async () => {
      await result.current.prefetchProducts(input)
    })

    // staleTime is zero, so cached data is stale and default skip mode ("fresh")
    // still prefetches.
    expect(fetchCount).toBe(1)

    await act(async () => {
      await result.current.prefetchProducts(input, { skipMode: "any" })
    })

    // skipMode "any" skips whenever query already exists in cache.
    expect(fetchCount).toBe(1)

    await act(async () => {
      await result.current.prefetchProducts(input, { skipIfCached: false })
    })

    expect(fetchCount).toBe(2)
  })

  it("skips prefetch when the same query is already in flight", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const queryKey = createQueryKey("test-prefetch-inflight", "products", {
      limit: 2,
      page: 1,
    })

    const fetchController = new AbortController()
    const fetchPromise = queryClient.fetchQuery({
      queryFn: async () => {
        try {
          await delay(10_000, undefined, { signal: fetchController.signal })
        } catch (error: unknown) {
          if (!(error instanceof Error) || error.name !== "AbortError") {
            throw error
          }
        }

        return {
          count: 0,
          limit: 2,
          offset: 0,
          products: [],
        }
      },
      queryKey,
    })

    await waitFor(() => {
      expect(queryClient.getQueryState(queryKey)?.fetchStatus).toBe("fetching")
    })

    expect(queryClient.getQueryData(queryKey)).toBeUndefined()

    expect(
      shouldSkipPrefetch({
        cacheOptions: { staleTime: 0 },
        queryClient,
        queryKey,
        skipIfCached: true,
        skipMode: "fresh",
      }),
    ).toBeTruthy()

    expect(
      shouldSkipPrefetch({
        cacheOptions: { staleTime: 0 },
        queryClient,
        queryKey,
        skipIfCached: true,
        skipMode: "any",
      }),
    ).toBeTruthy()

    fetchController.abort()
    await fetchPromise
  })
})
