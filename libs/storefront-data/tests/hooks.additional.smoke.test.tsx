import { QueryClient } from "@tanstack/react-query"
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

const createWrapper =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <StorefrontDataProvider client={client}>{children}</StorefrontDataProvider>
  )

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
          service: mappedService,
          buildListParams: (input) => {
            args.onListInput(input)
            return input
          },
          buildDetailParams: (input) => {
            args.onDetailInput(input)
            return input
          },
          queryKeyNamespace: "test-categories",
        })
        return {
          useListHook: () =>
            useCategories({ page: 1, limit: 2, enabled: true }),
          useDetailHook: () => useCategory({ id: "cat_1", enabled: true }),
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
          getCollections: async () => {
            const response = await args.service.getList()
            return { collections: response.items, count: response.count }
          },
          getCollection: args.service.getDetail,
        }
        const { useCollections, useCollection } = createCollectionHooks({
          service: mappedService,
          buildListParams: (input) => {
            args.onListInput(input)
            return input
          },
          buildDetailParams: (input) => {
            args.onDetailInput(input)
            return input
          },
          queryKeyNamespace: "test-collections",
        })
        return {
          useListHook: () =>
            useCollections({ page: 1, limit: 1, enabled: true }),
          useDetailHook: () => useCollection({ id: "col_1", enabled: true }),
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
          getRegions: async () => {
            const response = await args.service.getList()
            return { regions: response.items, count: response.count }
          },
          getRegion: args.service.getDetail,
        }
        const { useRegions, useRegion } = createRegionHooks({
          service: mappedService,
          buildListParams: (input) => {
            args.onListInput(input)
            return input
          },
          buildDetailParams: (input) => {
            args.onDetailInput(input)
            return input
          },
          queryKeyNamespace: "test-regions",
        })
        return {
          useListHook: () => useRegions({ page: 1, limit: 1, enabled: true }),
          useDetailHook: () => useRegion({ id: "reg_1", enabled: true }),
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
        getDetail: async () => ({ id: `${domain}_1` }),
        getList: async () => ({
          items: [{ id: `${domain}_1` }],
          count: 1,
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
      getCustomer: async () => customer,
      login: async () => null,
      logout: async () => undefined,
      register: async () => null,
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
      getCustomer: async () => ({ id: "cus_1" }),
      login: async () => null,
      logout: async () => undefined,
      register: async () => null,
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
      queryClient.getQueryCache().findAll({ queryKey: authQueryKeys.all() })
    ).toHaveLength(0)
  })

  it("invalidates customer and order domains on login", async () => {
    const service = {
      getCustomer: async () => ({ id: "cus_1" }),
      login: async (_input: { email: string; password: string }) => ({
        ok: true,
      }),
      logout: async () => undefined,
      register: async () => ({ ok: true }),
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
      await result.current.mutateAsync({
        email: "qa@example.com",
        password: "password",
      })
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
      .fn()
      .mockRejectedValue(new Error("Invalid email or password"))
    const service = {
      getCustomer: async () => ({ id: "cus_1" }),
      login,
      logout: async () => undefined,
      register: async () => ({ ok: true }),
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
      await expect(
        result.current.mutateAsync({
          email: "qa@example.com",
          password: "bad-password",
        })
      ).rejects.toThrow("Invalid email or password")
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
      addShippingMethod: async (cartId: string, optionId: string) => ({
        id: cartId,
        region_id: "reg_1",
        shipping_methods: [{ shipping_option_id: optionId }],
      }),
      calculateShippingOption: async (optionId: string) => ({
        id: optionId,
        price_type: "calculated",
        amount: 1200,
      }),
      initiatePaymentSession: async () => ({ id: "pay_col_1" }),
      listPaymentProviders: async () => [{ id: "pay_1" }],
      listShippingOptions: async () => [
        { id: "opt_fixed", price_type: "flat", amount: 500 },
        { id: "opt_calc", price_type: "calculated" },
      ],
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
      { wrapper }
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
        cartQueryKeys.active({ cartId: cart.id, regionId: "reg_1" })
      )
      expect(cached).toStrictEqual({
        id: cart.id,
        region_id: "reg_1",
        shipping_methods: [{ shipping_option_id: "opt_calc" }],
      })
    })

    expect(
      queryClient.getQueryData(cartQueryKeys.detail(cart.id))
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
      addShippingMethod: async (cartId: string) => ({
        id: cartId,
        region_id: "reg_1",
        shipping_methods: [],
      }),
      initiatePaymentSession: async () => ({ id: "pay_col_1" }),
      listPaymentProviders: async () => [{ id: "provider_1" }],
      listShippingOptions: async () => [] as ShippingOption[],
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
      cart
    )
    queryClient.setQueryData(cartQueryKeys.detail(cart.id), cart)

    const { result } = renderHook(
      () =>
        useCheckoutPayment({
          cart,
          cartId: cart.id,
          regionId: "reg_1",
        }),
      { wrapper }
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
          cartQueryKeys.active({ cartId: cart.id, regionId: "reg_1" })
        )
      ).toStrictEqual({
        ...cart,
        payment_collection: { id: "pay_col_1" },
      })
      expect(
        queryClient.getQueryData<Cart>(cartQueryKeys.detail(cart.id))
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
      addShippingMethod: async (cartId: string) => ({
        id: cartId,
        region_id: "reg_1",
        shipping_methods: [],
      }),
      initiatePaymentSession: async () => ({ id: "pay_col_1" }),
      listPaymentProviders: async () => [{ id: "provider_1" }],
      listShippingOptions: async () => [] as ShippingOption[],
    }

    const cartQueryKeys = createCartQueryKeys(
      "test-checkout-payment-cached-cart"
    )
    const { useCheckoutPayment } = createCheckoutHooks<
      Cart,
      ShippingOption,
      PaymentProvider,
      PaymentCollection,
      unknown
    >({
      cartQueryKeys,
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
      } satisfies Cart
    )

    const { result } = renderHook(
      () =>
        useCheckoutPayment({
          cartId: "cart_1",
          regionId: "reg_1",
        }),
      { wrapper }
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
      addShippingMethod: async (cartId: string) => ({
        id: cartId,
        region_id: "reg_1",
        shipping_methods: [],
      }),
      initiatePaymentSession: async (
        _cartId: string,
        _providerId: string,
        cart?: Cart | null
      ) => {
        receivedCart = cart
        return { id: "pay_col_1" }
      },
      listPaymentProviders: async () => [{ id: "provider_1" }],
      listShippingOptions: async () => [] as ShippingOption[],
    }

    const { useCheckoutPayment } = createCheckoutHooks<
      Cart,
      ShippingOption,
      PaymentProvider,
      PaymentCollection,
      unknown
    >({
      cartQueryKeys: createCartQueryKeys("test-checkout-payment-latest-cart"),
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
      { wrapper }
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

    const buildListParams = (input: {
      page?: number
      limit?: number
      enabled?: boolean
    }): ListParams => {
      const limit = input.limit ?? 20
      const page = input.page ?? 1
      return { limit, offset: (page - 1) * limit }
    }

    let fetchCount = 0
    const service = {
      getCategories: async (params: ListParams) => {
        fetchCount += 1
        return { categories: [{ id: `cat_${params.offset}` }], count: 1 }
      },
      getCategory: async () => null as Category | null,
    }

    const queryKeyNamespace = "test-prefetch-categories"
    const queryKeys = createCategoryQueryKeys<ListParams, DetailParams>(
      queryKeyNamespace
    )
    const { usePrefetchCategories } = createCategoryHooks({
      buildListParams,
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
    const listParams = buildListParams(input)
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
      }
    )
    const { result: noSkipResult } = renderHook(
      () => usePrefetchCategories({ skipIfCached: false }),
      { wrapper }
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

    const buildListParams = (input: {
      page?: number
      limit?: number
      enabled?: boolean
    }): ListParams => {
      const limit = input.limit ?? 20
      const page = input.page ?? 1
      return { limit, offset: (page - 1) * limit }
    }

    let fetchCount = 0
    const service = {
      getCollection: async () => null as Collection | null,
      getCollections: async (params: ListParams) => {
        fetchCount += 1
        return { collections: [{ id: `col_${params.offset}` }], count: 1 }
      },
    }

    const queryKeyNamespace = "test-prefetch-collections"
    const queryKeys = createCollectionQueryKeys<ListParams, DetailParams>(
      queryKeyNamespace
    )
    const { usePrefetchCollections } = createCollectionHooks({
      buildListParams,
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
    const listParams = buildListParams(input)
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
      }
    )
    const { result: noSkipResult } = renderHook(
      () => usePrefetchCollections({ skipIfCached: false }),
      { wrapper }
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

    interface ProductListParams {
      limit: number
      offset: number
      region_id?: string
    }

    interface ProductDetailParams {
      handle: string
      region_id?: string
    }

    const buildListParams = (
      input: ProductListInputBase
    ): ProductListParams => {
      const limit = input.limit ?? 20
      const page = input.page ?? 1
      const offset = (page - 1) * limit

      return {
        limit,
        offset,
        ...(input.region_id ? { region_id: input.region_id } : {}),
      }
    }

    let fetchCount = 0

    const service = {
      getProductByHandle: async () => null as Product | null,
      getProducts: async (params: ProductListParams) => {
        fetchCount += 1
        return {
          products: [{ id: `prod_${params.region_id ?? "default"}` }],
          count: 1,
          limit: params.limit,
          offset: params.offset,
        }
      },
    }

    const queryKeyNamespace = "test-prefetch"
    const queryKeys = createProductQueryKeys<
      ProductListParams,
      ProductDetailParams
    >(queryKeyNamespace)

    const { usePrefetchProducts } = createProductHooks({
      buildListParams,
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
    const listParams = buildListParams(input)

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

    let resolveFetch: (() => void) | undefined
    const fetchPromise = queryClient.fetchQuery({
      queryFn: async () => {
        await new Promise<void>((resolve) => {
          resolveFetch = resolve
        })

        return {
          products: [],
          count: 0,
          limit: 2,
          offset: 0,
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
      })
    ).toBeTruthy()

    expect(
      shouldSkipPrefetch({
        cacheOptions: { staleTime: 0 },
        queryClient,
        queryKey,
        skipIfCached: true,
        skipMode: "any",
      })
    ).toBeTruthy()

    resolveFetch?.()
    await fetchPromise
  })
})
