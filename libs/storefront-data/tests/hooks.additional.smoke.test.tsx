import { QueryClient } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { createAuthHooks, createAuthQueryKeys } from "../src/auth"
import { createCartQueryKeys } from "../src/cart"
import { createCategoryHooks, createCategoryQueryKeys } from "../src/categories"
import { createCheckoutHooks } from "../src/checkout"
import {
  createCollectionHooks,
  createCollectionQueryKeys,
} from "../src/collections"
import {
  createProductHooks,
  createProductQueryKeys,
  type ProductListInputBase,
} from "../src/products"
import { createRegionHooks } from "../src/regions"
import { createCacheConfig, createQueryKey } from "../src/shared"
import { StorefrontDataProvider } from "../src/client"

const createWrapper = (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <StorefrontDataProvider client={client}>{children}</StorefrontDataProvider>
  )

describe("storefront-data missing hook coverage", () => {
  it("strips enabled from categories list/detail params", async () => {
    type Category = { id: string }

    let listSawEnabled = false
    let detailSawEnabled = false

    const service = {
      getCategories: async () => ({
        categories: [{ id: "cat_1" }],
        count: 1,
      }),
      getCategory: async () => ({ id: "cat_1" }),
    }

    const { useCategories, useCategory } = createCategoryHooks({
      service,
      buildListParams: (input: {
        page?: number
        limit?: number
        offset?: number
        enabled?: boolean
      }) => {
        listSawEnabled = "enabled" in input
        return input
      },
      buildDetailParams: (input: { id: string; enabled?: boolean }) => {
        detailSawEnabled = "enabled" in input
        return input
      },
      queryKeyNamespace: "test-categories",
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)

    const { result: listResult } = renderHook(
      () => useCategories({ page: 1, limit: 2, enabled: true }),
      { wrapper }
    )

    await waitFor(() => {
      expect(listResult.current.isSuccess).toBe(true)
    })

    expect(listSawEnabled).toBe(false)

    const { result: detailResult } = renderHook(
      () => useCategory({ id: "cat_1", enabled: true }),
      { wrapper }
    )

    await waitFor(() => {
      expect(detailResult.current.isSuccess).toBe(true)
    })

    expect(detailSawEnabled).toBe(false)
  })

  it("strips enabled from collections list/detail params", async () => {
    type Collection = { id: string }

    let listSawEnabled = false
    let detailSawEnabled = false

    const service = {
      getCollections: async () => ({
        collections: [{ id: "col_1" }],
        count: 1,
      }),
      getCollection: async () => ({ id: "col_1" }),
    }

    const { useCollections, useCollection } = createCollectionHooks({
      service,
      buildListParams: (input: {
        page?: number
        limit?: number
        offset?: number
        enabled?: boolean
      }) => {
        listSawEnabled = "enabled" in input
        return input
      },
      buildDetailParams: (input: { id: string; enabled?: boolean }) => {
        detailSawEnabled = "enabled" in input
        return input
      },
      queryKeyNamespace: "test-collections",
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)

    const { result: listResult } = renderHook(
      () => useCollections({ page: 1, limit: 1, enabled: true }),
      { wrapper }
    )

    await waitFor(() => {
      expect(listResult.current.isSuccess).toBe(true)
    })

    expect(listSawEnabled).toBe(false)

    const { result: detailResult } = renderHook(
      () => useCollection({ id: "col_1", enabled: true }),
      { wrapper }
    )

    await waitFor(() => {
      expect(detailResult.current.isSuccess).toBe(true)
    })

    expect(detailSawEnabled).toBe(false)
  })

  it("strips enabled from regions list/detail params", async () => {
    type Region = { id: string }

    let listSawEnabled = false
    let detailSawEnabled = false

    const service = {
      getRegions: async () => ({
        regions: [{ id: "reg_1" }],
        count: 1,
      }),
      getRegion: async () => ({ id: "reg_1" }),
    }

    const { useRegions, useRegion } = createRegionHooks({
      service,
      buildListParams: (input: {
        page?: number
        limit?: number
        offset?: number
        enabled?: boolean
      }) => {
        listSawEnabled = "enabled" in input
        return input
      },
      buildDetailParams: (input: { id: string; enabled?: boolean }) => {
        detailSawEnabled = "enabled" in input
        return input
      },
      queryKeyNamespace: "test-regions",
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)

    const { result: listResult } = renderHook(
      () => useRegions({ page: 1, limit: 1, enabled: true }),
      { wrapper }
    )

    await waitFor(() => {
      expect(listResult.current.isSuccess).toBe(true)
    })

    expect(listSawEnabled).toBe(false)

    const { result: detailResult } = renderHook(
      () => useRegion({ id: "reg_1", enabled: true }),
      { wrapper }
    )

    await waitFor(() => {
      expect(detailResult.current.isSuccess).toBe(true)
    })

    expect(detailSawEnabled).toBe(false)
  })

  it("exposes auth state", async () => {
    const customer = { id: "cus_1" }

    const service = {
      getCustomer: async () => customer,
      login: async () => null,
      register: async () => null,
      logout: async () => undefined,
    }

    const { useAuth } = createAuthHooks({
      service,
      queryKeyNamespace: "test-auth",
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.customer).toEqual(customer)
  })

  it("clears auth cache on logout", async () => {
    const service = {
      getCustomer: async () => ({ id: "cus_1" }),
      login: async () => null,
      register: async () => null,
      logout: async () => undefined,
    }

    const queryKeyNamespace = "test-auth-logout"
    const authQueryKeys = createAuthQueryKeys(queryKeyNamespace)
    const { useLogout } = createAuthHooks({
      service,
      queryKeyNamespace,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
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
      login: async () => ({ ok: true }),
      register: async () => ({ ok: true }),
      logout: async () => undefined,
    }

    const queryKeyNamespace = "test-auth-invalidation"
    const customerDomainKey = createQueryKey(queryKeyNamespace, "customer")
    const ordersDomainKey = createQueryKey(queryKeyNamespace, "orders")
    const { useLogin } = createAuthHooks({
      service,
      queryKeyNamespace,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => useLogin(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({} as never)
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

  it("calculates checkout shipping prices and writes cart updates", async () => {
    type Cart = {
      id: string
      region_id?: string | null
      shipping_methods?: { shipping_option_id?: string }[]
    }

    type ShippingOption = {
      id: string
      price_type?: string | null
      amount?: number | null
    }

    type PaymentProvider = { id: string }
    type PaymentCollection = { id: string }

    const service = {
      listShippingOptions: async () => [
        { id: "opt_fixed", price_type: "flat", amount: 500 },
        { id: "opt_calc", price_type: "calculated" },
      ],
      calculateShippingOption: async (optionId: string) => ({
        id: optionId,
        price_type: "calculated",
        amount: 1200,
      }),
      addShippingMethod: async (cartId: string, optionId: string) => ({
        id: cartId,
        region_id: "reg_1",
        shipping_methods: [{ shipping_option_id: optionId }],
      }),
      listPaymentProviders: async () => [{ id: "pay_1" }],
      initiatePaymentSession: async () => ({ id: "pay_col_1" }),
    }

    const cartQueryKeys = createCartQueryKeys("test-checkout-cart")
    const { useCheckoutShipping } = createCheckoutHooks<
      Cart,
      ShippingOption,
      PaymentProvider,
      PaymentCollection,
      unknown
    >({
      service,
      queryKeyNamespace: "test-checkout",
      cartQueryKeys,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
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
          cartId: cart.id,
          cart,
          calculatePrices: true,
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.shippingOptions).toHaveLength(2)
    })

    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false)
    })

    expect(result.current.shippingPrices).toEqual({
      opt_fixed: 500,
      opt_calc: 1200,
    })

    act(() => {
      result.current.setShippingMethod("opt_calc")
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData(
        cartQueryKeys.active({ cartId: cart.id, regionId: "reg_1" })
      )
      expect(cached).toEqual({
        id: cart.id,
        region_id: "reg_1",
        shipping_methods: [{ shipping_option_id: "opt_calc" }],
      })
    })
  })

  it("lists checkout payment providers and invalidates cart on payment", async () => {
    type Cart = {
      id: string
      region_id?: string | null
      shipping_methods?: { shipping_option_id?: string }[]
      payment_collection?: { payment_sessions?: unknown[] }
    }

    type ShippingOption = {
      id: string
      price_type?: string | null
      amount?: number | null
    }

    type PaymentProvider = { id: string }
    type PaymentCollection = { id: string }

    const service = {
      listShippingOptions: async () => [] as ShippingOption[],
      addShippingMethod: async (cartId: string) => ({
        id: cartId,
        region_id: "reg_1",
        shipping_methods: [],
      }),
      listPaymentProviders: async () => [{ id: "provider_1" }],
      initiatePaymentSession: async () => ({ id: "pay_col_1" }),
    }

    const cartQueryKeys = createCartQueryKeys("test-checkout-payment-cart")
    const { useCheckoutPayment } = createCheckoutHooks<
      Cart,
      ShippingOption,
      PaymentProvider,
      PaymentCollection,
      unknown
    >({
      service,
      queryKeyNamespace: "test-checkout-payment",
      cartQueryKeys,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const wrapper = createWrapper(queryClient)

    const cart: Cart = {
      id: "cart_1",
      region_id: "reg_1",
      shipping_methods: [{ shipping_option_id: "opt_fixed" }],
    }

    const { result } = renderHook(
      () =>
        useCheckoutPayment({
          cartId: cart.id,
          regionId: "reg_1",
          cart,
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.paymentProviders).toHaveLength(1)
    })

    expect(result.current.canInitiatePayment).toBe(true)

    act(() => {
      result.current.initiatePayment("provider_1")
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: cartQueryKeys.all(),
      })
    })
  })

  it("initiates checkout payment without forwarding render-time cart", async () => {
    type Cart = {
      id: string
      region_id?: string | null
      shipping_methods?: { shipping_option_id?: string }[]
      payment_collection?: { payment_sessions?: unknown[] }
    }

    type ShippingOption = {
      id: string
      price_type?: string | null
      amount?: number | null
    }

    type PaymentProvider = { id: string }
    type PaymentCollection = { id: string }

    let receivedCart: Cart | null | undefined = { id: "initial" }
    const service = {
      listShippingOptions: async () => [] as ShippingOption[],
      addShippingMethod: async (cartId: string) => ({
        id: cartId,
        region_id: "reg_1",
        shipping_methods: [],
      }),
      listPaymentProviders: async () => [{ id: "provider_1" }],
      initiatePaymentSession: async (
        _cartId: string,
        _providerId: string,
        cart?: Cart | null
      ) => {
        receivedCart = cart
        return { id: "pay_col_1" }
      },
    }

    const { useCheckoutPayment } = createCheckoutHooks<
      Cart,
      ShippingOption,
      PaymentProvider,
      PaymentCollection,
      unknown
    >({
      service,
      queryKeyNamespace: "test-checkout-payment-latest-cart",
      cartQueryKeys: createCartQueryKeys("test-checkout-payment-latest-cart"),
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)

    const staleRenderCart: Cart = {
      id: "cart_1",
      region_id: "reg_1",
      shipping_methods: [{ shipping_option_id: "opt_fixed" }],
      payment_collection: undefined,
    }

    const { result } = renderHook(
      () =>
        useCheckoutPayment({
          cartId: staleRenderCart.id,
          regionId: "reg_1",
          cart: staleRenderCart,
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
    type Category = { id: string }
    type ListParams = { limit: number; offset: number }
    type DetailParams = { id: string }

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
      service,
      buildListParams,
      queryKeys,
      cacheConfig: createCacheConfig({
        static: { staleTime: 0 },
      }),
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)

    const input = { page: 1, limit: 2 }
    const listParams = buildListParams(input)
    queryClient.setQueryData(queryKeys.list(listParams), {
      categories: [],
      count: 0,
    })

    const { result: freshResult } = renderHook(
      () => usePrefetchCategories(),
      { wrapper }
    )
    const { result: anyResult } = renderHook(
      () => usePrefetchCategories({ skipMode: "any" }),
      { wrapper }
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
    type Collection = { id: string }
    type ListParams = { limit: number; offset: number }
    type DetailParams = { id: string }

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
      getCollections: async (params: ListParams) => {
        fetchCount += 1
        return { collections: [{ id: `col_${params.offset}` }], count: 1 }
      },
      getCollection: async () => null as Collection | null,
    }

    const queryKeyNamespace = "test-prefetch-collections"
    const queryKeys = createCollectionQueryKeys<ListParams, DetailParams>(
      queryKeyNamespace
    )
    const { usePrefetchCollections } = createCollectionHooks({
      service,
      buildListParams,
      queryKeys,
      cacheConfig: createCacheConfig({
        static: { staleTime: 0 },
      }),
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)

    const input = { page: 1, limit: 2 }
    const listParams = buildListParams(input)
    queryClient.setQueryData(queryKeys.list(listParams), {
      collections: [],
      count: 0,
    })

    const { result: freshResult } = renderHook(
      () => usePrefetchCollections(),
      { wrapper }
    )
    const { result: anyResult } = renderHook(
      () => usePrefetchCollections({ skipMode: "any" }),
      { wrapper }
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
    type Product = { id: string }

    type ProductListParams = {
      limit: number
      offset: number
      region_id?: string
    }

    type ProductDetailParams = {
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
        region_id: input.region_id,
      }
    }

    let fetchCount = 0

    const service = {
      getProducts: async (params: ProductListParams) => {
        fetchCount += 1
        return {
          products: [{ id: `prod_${params.region_id ?? "default"}` }],
          count: 1,
          limit: params.limit,
          offset: params.offset,
        }
      },
      getProductByHandle: async () => null as Product | null,
    }

    const queryKeyNamespace = "test-prefetch"
    const queryKeys = createProductQueryKeys<
      ProductListParams,
      ProductDetailParams
    >(queryKeyNamespace)

    const { usePrefetchProducts } = createProductHooks({
      service,
      buildListParams,
      queryKeys,
      cacheConfig: createCacheConfig({
        semiStatic: {
          staleTime: 0,
        },
      }),
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => usePrefetchProducts(), { wrapper })

    const input = { page: 1, limit: 2, region_id: "reg_1" }
    const listParams = buildListParams(input)

    queryClient.setQueryData(queryKeys.list(listParams), {
      products: [],
      count: 0,
      limit: listParams.limit,
      offset: listParams.offset,
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
})
