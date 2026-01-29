import { QueryClient } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { createAuthHooks, createAuthQueryKeys } from "../src/auth"
import { createCartQueryKeys } from "../src/cart"
import { createCategoryHooks } from "../src/categories"
import { createCheckoutHooks } from "../src/checkout"
import { createCollectionHooks } from "../src/collections"
import {
  createProductHooks,
  createProductQueryKeys,
  type ProductListInputBase,
} from "../src/products"
import { createRegionHooks } from "../src/regions"
import { createCacheConfig } from "../src/shared"
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

  it("respects skipIfCached for product prefetch", async () => {
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

    expect(fetchCount).toBe(0)

    await act(async () => {
      await result.current.prefetchProducts(input, { skipIfCached: false })
    })

    expect(fetchCount).toBe(1)
  })
})
