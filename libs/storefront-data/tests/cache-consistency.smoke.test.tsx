import { QueryClient } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { StorefrontDataProvider } from "../src/client"
import { createCustomerHooks, type CustomerService } from "../src/customers"
import { createOrderQueryKeys } from "../src/orders"
import {
  createProductHooks,
  createProductQueryKeys,
  type ProductListInputBase,
  type ProductService,
} from "../src/products"
import { createQueryKey, RegionProvider } from "../src/shared"

describe("storefront-data cache/query consistency", () => {
  it("keeps separate product cache entries when region context changes", async () => {
    type Product = { id: string; title: string }

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
      const limit = input.limit ?? 1
      const page = input.page ?? 1
      const offset = (page - 1) * limit

      return {
        limit,
        offset,
        region_id: input.region_id,
      }
    }

    const seenRegions: string[] = []

    const service: ProductService<
      Product,
      ProductListParams,
      ProductDetailParams
    > = {
      getProducts: async (params) => {
        const regionId = params.region_id ?? "unknown"
        seenRegions.push(regionId)

        return {
          products: [{ id: `prod_${regionId}`, title: `Product ${regionId}` }],
          count: 1,
          limit: params.limit,
          offset: params.offset,
        }
      },
      getProductByHandle: async () => null,
    }

    const queryKeyNamespace = "cache-consistency-region"
    const queryKeys = createProductQueryKeys<
      ProductListParams,
      ProductDetailParams
    >(queryKeyNamespace)

    const { useProducts } = createProductHooks({
      service,
      buildListParams,
      queryKeys,
      queryKeyNamespace,
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    let regionId = "reg_cz"

    const wrapper = ({ children }: { children: ReactNode }) => (
      <StorefrontDataProvider client={queryClient}>
        <RegionProvider region={{ region_id: regionId, country_code: "cz" }}>
          {children}
        </RegionProvider>
      </StorefrontDataProvider>
    )

    const { result, rerender } = renderHook(() => useProducts({ page: 1, limit: 1 }), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.products[0]?.id).toBe("prod_reg_cz")
    })

    regionId = "reg_us"
    rerender()

    await waitFor(() => {
      expect(result.current.products[0]?.id).toBe("prod_reg_us")
    })

    const regionCzKey = queryKeys.list(
      buildListParams({ page: 1, limit: 1, region_id: "reg_cz" })
    )
    const regionUsKey = queryKeys.list(
      buildListParams({ page: 1, limit: 1, region_id: "reg_us" })
    )

    expect(queryClient.getQueryData(regionCzKey)).toBeTruthy()
    expect(queryClient.getQueryData(regionUsKey)).toBeTruthy()
    expect(seenRegions).toContain("reg_cz")
    expect(seenRegions).toContain("reg_us")
  })

  it("invalidates both customer profile and auth customer keys on profile update", async () => {
    type Address = { id: string }
    type Customer = { id: string }

    type ListParams = { enabled?: boolean }
    type CreateParams = { address_1?: string }
    type UpdateParams = { address_1?: string }
    type UpdateCustomerParams = { metadata?: Record<string, unknown> }

    const service: CustomerService<
      Customer,
      Address,
      ListParams,
      CreateParams,
      UpdateParams,
      UpdateCustomerParams
    > = {
      getAddresses: async () => ({ addresses: [] }),
      createAddress: async () => ({ id: "addr_1" }),
      updateAddress: async () => ({ id: "addr_1" }),
      deleteAddress: async () => undefined,
      updateCustomer: async () => ({ id: "cust_1" }),
    }

    const queryKeyNamespace = "cache-consistency-customer"

    const { useUpdateCustomer } = createCustomerHooks({
      service,
      buildListParams: (input: ListParams) => input,
      buildCreateParams: (input: CreateParams) => input,
      buildUpdateParams: (input: UpdateParams & { addressId?: string }) => {
        const { addressId: _addressId, ...rest } = input
        return rest
      },
      buildUpdateCustomerParams: (input: UpdateCustomerParams) => input,
      queryKeyNamespace,
    })

    const profileQueryKey = createQueryKey(
      queryKeyNamespace,
      "customer",
      "profile"
    )
    const authCustomerQueryKey = createQueryKey(
      queryKeyNamespace,
      "auth",
      "customer"
    )

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    queryClient.setQueryData(profileQueryKey, { id: "cust_old" })
    queryClient.setQueryData(authCustomerQueryKey, { id: "cust_old" })

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const wrapper = ({ children }: { children: ReactNode }) => (
      <StorefrontDataProvider client={queryClient}>{children}</StorefrontDataProvider>
    )

    const { result } = renderHook(() => useUpdateCustomer(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ metadata: { locale: "cs-CZ" } })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: profileQueryKey,
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: authCustomerQueryKey,
    })

    expect(queryClient.getQueryState(profileQueryKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(authCustomerQueryKey)?.isInvalidated).toBe(
      true
    )
  })

  it("normalizes order list keys and separates cache by list params", () => {
    type ListParams = {
      limit: number
      offset: number
      status?: string[]
      enabled?: boolean
      filters?: {
        kind?: string
        name?: string
      }
    }

    type DetailParams = { id: string }

    const queryKeys = createOrderQueryKeys<ListParams, DetailParams>(
      "cache-consistency-orders"
    )

    const pendingWithEnabled = queryKeys.list({
      limit: 20,
      offset: 0,
      status: ["pending"],
      enabled: true,
      filters: {
        kind: "retail",
        name: undefined,
      },
    })

    const pendingNormalized = queryKeys.list({
      offset: 0,
      limit: 20,
      status: ["pending"],
      filters: {
        kind: "retail",
      },
    })

    const completed = queryKeys.list({
      limit: 20,
      offset: 0,
      status: ["completed"],
      filters: {
        kind: "retail",
      },
    })

    expect(pendingWithEnabled).toEqual(pendingNormalized)
    expect(pendingNormalized).not.toEqual(completed)
  })

  it("keeps primitive order detail params as distinct query keys", () => {
    const queryKeys = createOrderQueryKeys<{ limit: number }, string>(
      "cache-consistency-order-detail-primitive"
    )

    const first = queryKeys.detail("order_1")
    const second = queryKeys.detail("order_2")
    const sameAgain = queryKeys.detail("order_1")

    expect(first).toEqual(sameAgain)
    expect(first).not.toEqual(second)
  })
})
