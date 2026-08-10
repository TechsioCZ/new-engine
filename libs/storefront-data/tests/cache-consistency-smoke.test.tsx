import { QueryClient } from "@tanstack/react-query"
import { getRecordValue, isRecord } from "@techsio/std/object"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { vi, describe, expect, it } from "vitest"

import { StorefrontDataProvider } from "../src/client/provider"
import { createCustomerHooks } from "../src/customers/hooks"
import type {
  CustomerProfileUpdateInputBase,
  CustomerService,
} from "../src/customers/types"
import { createOrderQueryKeys } from "../src/orders/query-keys"
import { createProductHooks } from "../src/products/hooks"
import { createProductQueryKeys } from "../src/products/query-keys"
import type {
  ProductListInputBase,
  ProductService,
} from "../src/products/types"
import { createQueryKey } from "../src/shared/query-keys"
import { RegionProvider } from "../src/shared/region-context"

interface CacheTestProductListParams {
  limit: number
  offset: number
  region_id?: string
}

const buildCacheTestListParams = (
  input: ProductListInputBase,
): CacheTestProductListParams => {
  const limit = input.limit ?? 1
  const page = input.page ?? 1
  const offset = (page - 1) * limit
  return {
    limit,
    offset,
    ...(input.region_id === undefined || input.region_id === ""
      ? {}
      : { region_id: input.region_id }),
  }
}

interface ProductDetailParams {
  handle: string
  region_id?: string
}

const createProviderWrapper = (queryClient: QueryClient) =>
  function StorefrontDataTestProvider({ children }: { children: ReactNode }) {
    return (
      <StorefrontDataProvider client={queryClient}>
        {children}
      </StorefrontDataProvider>
    )
  }

describe("storefront-data cache/query consistency", () => {
  it("keeps separate product cache entries when region context changes", async () => {
    interface Product {
      id: string
      title: string
    }

    const seenRegions: string[] = []

    const service: ProductService<
      Product,
      CacheTestProductListParams,
      ProductDetailParams
    > = {
      getProductByHandle: async () => await Promise.resolve(null),
      getProducts: async (params) => {
        const regionId = params.region_id ?? "unknown"
        seenRegions.push(regionId)

        return await Promise.resolve({
          count: 1,
          limit: params.limit,
          offset: params.offset,
          products: [{ id: `prod_${regionId}`, title: `Product ${regionId}` }],
        })
      },
    }

    const queryKeyNamespace = "cache-consistency-region"
    const queryKeys = createProductQueryKeys<
      CacheTestProductListParams,
      ProductDetailParams
    >(queryKeyNamespace)

    const { useProducts } = createProductHooks({
      buildListParams: buildCacheTestListParams,
      queryKeyNamespace,
      queryKeys,
      service,
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    let regionId = "reg_cz"

    const wrapper = ({ children }: { children: ReactNode }) => (
      <StorefrontDataProvider client={queryClient}>
        <RegionProvider region={{ country_code: "cz", region_id: regionId }}>
          {children}
        </RegionProvider>
      </StorefrontDataProvider>
    )

    const { result, rerender } = renderHook(
      () => useProducts({ limit: 1, page: 1 }),
      {
        wrapper,
      },
    )

    await waitFor(() => {
      expect(result.current.products[0]?.id).toBe("prod_reg_cz")
    })

    regionId = "reg_us"
    rerender()

    await waitFor(() => {
      expect(result.current.products[0]?.id).toBe("prod_reg_us")
    })

    const regionCzKey = queryKeys.list(
      buildCacheTestListParams({ limit: 1, page: 1, region_id: "reg_cz" }),
    )
    const regionUsKey = queryKeys.list(
      buildCacheTestListParams({ limit: 1, page: 1, region_id: "reg_us" }),
    )

    expect(queryClient.getQueryData(regionCzKey)).toBeTruthy()
    expect(queryClient.getQueryData(regionUsKey)).toBeTruthy()
    expect(seenRegions).toContain("reg_cz")
    expect(seenRegions).toContain("reg_us")
  })

  it("invalidates both customer profile and auth customer keys on profile update", async () => {
    interface Address {
      id: string
    }
    interface Customer {
      id: string
    }

    interface ListParams {
      enabled?: boolean
    }
    interface CreateParams {
      address_1?: string
    }
    interface UpdateParams {
      address_1?: string
    }
    type UpdateCustomerParams = CustomerProfileUpdateInputBase

    const service: CustomerService<
      Customer,
      Address,
      ListParams,
      CreateParams,
      UpdateParams,
      UpdateCustomerParams
    > = {
      createAddress: async () => await Promise.resolve({ id: "addr_1" }),
      deleteAddress: async () => {
        await Promise.resolve()
      },
      getAddresses: async () => await Promise.resolve({ addresses: [] }),
      updateAddress: async () => await Promise.resolve({ id: "addr_1" }),
      updateCustomer: async () => await Promise.resolve({ id: "cust_1" }),
    }

    const queryKeyNamespace = "cache-consistency-customer"

    const { useUpdateCustomer } = createCustomerHooks({
      addressAdapter: {
        toCreateParams: (input: CreateParams) => input,
        toUpdateParams: (input: UpdateParams & { addressId?: string }) => {
          const params: UpdateParams & { addressId?: string } = { ...input }
          delete params.addressId
          return params
        },
      },
      buildListParams: (input: ListParams) => input,
      buildUpdateCustomerParams: (input: UpdateCustomerParams) => input,
      queryKeyNamespace,
      service,
    })

    const profileQueryKey = createQueryKey(
      queryKeyNamespace,
      "customer",
      "profile",
    )
    const authCustomerQueryKey = createQueryKey(
      queryKeyNamespace,
      "auth",
      "customer",
    )

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })

    queryClient.setQueryData(profileQueryKey, { id: "cust_old" })
    queryClient.setQueryData(authCustomerQueryKey, { id: "cust_old" })

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const wrapper = createProviderWrapper(queryClient)

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

    expect(
      queryClient.getQueryState(profileQueryKey)?.isInvalidated,
    ).toBeTruthy()
    expect(
      queryClient.getQueryState(authCustomerQueryKey)?.isInvalidated,
    ).toBeTruthy()
  })

  it("invalidates auth customer cache after address mutations", async () => {
    interface Address {
      id: string
    }
    interface Customer {
      id: string
    }

    interface ListParams {
      enabled?: boolean
    }
    interface CreateParams {
      address_1?: string
    }
    interface UpdateParams {
      address_1?: string
    }
    type UpdateCustomerParams = CustomerProfileUpdateInputBase

    const service: CustomerService<
      Customer,
      Address,
      ListParams,
      CreateParams,
      UpdateParams,
      UpdateCustomerParams
    > = {
      createAddress: async () => await Promise.resolve({ id: "addr_1" }),
      deleteAddress: async () => {
        await Promise.resolve()
      },
      getAddresses: async () => await Promise.resolve({ addresses: [] }),
      updateAddress: async () => await Promise.resolve({ id: "addr_1" }),
      updateCustomer: async () => await Promise.resolve({ id: "cust_1" }),
    }

    const queryKeyNamespace = "cache-consistency-customer-address-mutations"
    const {
      useCreateCustomerAddress,
      useUpdateCustomerAddress,
      useDeleteCustomerAddress,
    } = createCustomerHooks({
      addressAdapter: {
        toCreateParams: (input: CreateParams) => input,
        toUpdateParams: (input: UpdateParams & { addressId?: string }) => {
          const params: UpdateParams & { addressId?: string } = { ...input }
          delete params.addressId
          return params
        },
      },
      buildListParams: (input: ListParams) => input,
      buildUpdateCustomerParams: (input: UpdateCustomerParams) => input,
      queryKeyNamespace,
      service,
    })

    const authCustomerQueryKey = createQueryKey(
      queryKeyNamespace,
      "auth",
      "customer",
    )

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })

    queryClient.setQueryData(authCustomerQueryKey, { id: "cust_old" })

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const wrapper = createProviderWrapper(queryClient)

    const createHook = renderHook(() => useCreateCustomerAddress(), {
      wrapper,
    })
    const updateHook = renderHook(() => useUpdateCustomerAddress(), {
      wrapper,
    })
    const deleteHook = renderHook(() => useDeleteCustomerAddress(), {
      wrapper,
    })

    await act(async () => {
      await createHook.result.current.mutateAsync({ address_1: "Main 1" })
    })
    await act(async () => {
      await updateHook.result.current.mutateAsync({
        addressId: "addr_1",
        address_1: "Main 2",
      })
    })
    await act(async () => {
      await deleteHook.result.current.mutateAsync({ addressId: "addr_1" })
    })

    const authInvalidationCalls = invalidateSpy.mock.calls.filter(
      ([arg]) =>
        isRecord(arg) &&
        JSON.stringify(getRecordValue(arg, "queryKey")) ===
          JSON.stringify(authCustomerQueryKey),
    )

    expect(authInvalidationCalls).toHaveLength(3)
    expect(
      queryClient.getQueryState(authCustomerQueryKey)?.isInvalidated,
    ).toBeTruthy()
  })

  it("normalizes order list keys and separates cache by list params", () => {
    interface ListParams {
      limit: number
      offset: number
      status?: string[]
      enabled?: boolean
      filters?: {
        kind?: string
        name?: string
      }
    }

    interface DetailParams {
      id: string
    }

    const queryKeys = createOrderQueryKeys<ListParams, DetailParams>(
      "cache-consistency-orders",
    )

    const pendingWithEnabled = queryKeys.list({
      enabled: true,
      filters: {
        kind: "retail",
      },
      limit: 20,
      offset: 0,
      status: ["pending"],
    })

    const pendingNormalized = queryKeys.list({
      filters: {
        kind: "retail",
      },
      limit: 20,
      offset: 0,
      status: ["pending"],
    })

    const completed = queryKeys.list({
      filters: {
        kind: "retail",
      },
      limit: 20,
      offset: 0,
      status: ["completed"],
    })

    expect(pendingWithEnabled).toStrictEqual(pendingNormalized)
    expect(pendingNormalized).not.toStrictEqual(completed)
  })

  it("keeps primitive order detail params as distinct query keys", () => {
    const queryKeys = createOrderQueryKeys<{ limit: number }, string>(
      "cache-consistency-order-detail-primitive",
    )

    const first = queryKeys.detail("order_1")
    const second = queryKeys.detail("order_2")
    const sameAgain = queryKeys.detail("order_1")

    expect(first).toStrictEqual(sameAgain)
    expect(first).not.toStrictEqual(second)
  })
})
