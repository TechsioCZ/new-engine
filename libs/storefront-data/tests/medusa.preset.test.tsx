import type { HttpTypes } from "@medusajs/types"
import { QueryClient } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { vi, describe, expect, it } from "vitest"

import type {
  MedusaAuthCredentials,
  MedusaRegisterData,
  MedusaUpdateCustomerData,
} from "../src/auth/medusa-service"
import type { AuthService } from "../src/auth/types"
import type { CartQueryKeys } from "../src/cart/types"
import type { CatalogFacets } from "../src/catalog/types"
import {
  createCheckoutCartAddressAdapter,
  createCheckoutCustomerAddressAdapter,
} from "../src/checkout/address"
import type {
  CheckoutAddressInput,
  CheckoutCustomerAddressUpdateInput,
  MedusaCartAddressPayload,
} from "../src/checkout/address"
import { StorefrontDataProvider } from "../src/client/provider"
import type { MedusaCustomerListInput } from "../src/customers/medusa-service"
import type { CustomerQueryKeys } from "../src/customers/types"
import { createMedusaStorefrontPreset } from "../src/medusa/preset"
import type { CreateMedusaStorefrontPresetConfig } from "../src/medusa/preset"
import type {
  MedusaOrderDetailInput,
  MedusaOrderListInput,
} from "../src/orders/medusa-service"
import type { OrderQueryKeys } from "../src/orders/types"
import type {
  MedusaProductListDetailKeyInput,
  MedusaProductListListKeyInput,
} from "../src/product-lists/medusa-service"
import type { ProductListQueryKeys } from "../src/product-lists/types"
import { createQueryKey } from "../src/shared/query-keys"
import {
  createStoreCart,
  createStoreCustomer,
  createTestMedusaSdk,
  createStoreCustomerAddress,
} from "./medusa-fixtures"

const createWrapper =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <StorefrontDataProvider client={client}>{children}</StorefrontDataProvider>
  )

interface StoreCartLike {
  id: string
  region_id?: string | null
  shipping_methods?: Array<{ shipping_option_id?: string }>
  payment_collection?: { payment_sessions?: unknown[] } | null
}

const createSdkMock = () => {
  const clientFetch = vi.fn(
    async (path: string): Promise<Record<string, unknown>> => {
      if (path === "/store/products") {
        return {
          count: 1,
          limit: 1,
          offset: 0,
          products: [{ id: "prod_1", handle: "p-1", title: "Product 1" }],
        }
      }

      if (path === "/store/shipping-options") {
        return {
          shipping_options: [{ amount: 150, id: "ship_1", price_type: "flat" }],
        }
      }

      if (path === "/store/payment-providers") {
        return {
          payment_providers: [],
        }
      }

      if (path === "/store/product-lists/list_1/cart") {
        return {
          cart: {
            id: "cart_from_list",
            region_id: "reg_1",
          },
        }
      }

      return {}
    },
  )

  const addShippingMethod = vi.fn(
    async (): Promise<{ cart: StoreCartLike }> => ({
      cart: {
        id: "cart_1",
        region_id: "reg_1",
        shipping_methods: [{ shipping_option_id: "ship_1" }],
      },
    }),
  )

  const sdk = createTestMedusaSdk()
  Object.defineProperty(sdk.client, "fetch", { value: clientFetch })
  Object.defineProperties(sdk.store.cart, {
    addShippingMethod: { value: addShippingMethod },
    retrieve: { value: vi.fn(async () => ({ cart: null })) },
  })
  Object.defineProperty(sdk.store.payment, "initiatePaymentSession", {
    value: vi.fn(async () => ({
      payment_collection: { payment_sessions: [] },
    })),
  })

  return {
    sdk,
    spies: {
      addShippingMethod,
      clientFetch,
    },
  }
}

describe(createMedusaStorefrontPreset, () => {
  it("allows thin cart hook overrides without buildAddParams", () => {
    const { sdk } = createSdkMock()

    const config = {
      cart: {
        hooks: {
          cartStorage: {
            clear: () => undefined,
            get: () => null,
            set: () => undefined,
          },
        },
      },
      sdk,
    } satisfies CreateMedusaStorefrontPresetConfig

    const preset = createMedusaStorefrontPreset(config)
    expect(preset.hooks.cart).toBeDefined()
  })

  it("accepts shared checkout address adapters for both cart and customer hooks", () => {
    const { sdk } = createSdkMock()
    type ExtendedCatalogFacets = CatalogFacets & {
      dosage: CatalogFacets["brand"]
    }

    const preset = createMedusaStorefrontPreset<
      HttpTypes.StoreProduct,
      HttpTypes.StoreProductCategory,
      HttpTypes.StoreCollection,
      HttpTypes.StoreProduct,
      ExtendedCatalogFacets,
      CheckoutAddressInput,
      MedusaCartAddressPayload,
      CheckoutAddressInput,
      CheckoutCustomerAddressUpdateInput
    >({
      cart: {
        hooks: {
          addressAdapter: createCheckoutCartAddressAdapter(),
        },
      },
      catalog: {
        fallbackFacets: {
          brand: [],
          dosage: [],
          form: [],
          ingredient: [],
          price: {
            max: null,
            min: null,
          },
          status: [],
        },
      },
      customers: {
        hooks: {
          addressAdapter: createCheckoutCustomerAddressAdapter(),
        },
      },
      sdk,
    })

    expect(preset.hooks.cart).toBeDefined()
    expect(preset.hooks.customers).toBeDefined()
  })

  it("requires explicit fallback facets for custom catalog facet shapes", () => {
    const { sdk } = createSdkMock()
    type ExtendedCatalogFacets = CatalogFacets & {
      dosage: CatalogFacets["brand"]
    }

    // @ts-expect-error custom facet shapes must provide catalog.fallbackFacets
    const invalidConfig: CreateMedusaStorefrontPresetConfig<
      HttpTypes.StoreProduct,
      HttpTypes.StoreProductCategory,
      HttpTypes.StoreCollection,
      HttpTypes.StoreProduct,
      ExtendedCatalogFacets
    > = { sdk }

    expect(invalidConfig).toBeDefined()
  })

  it("builds namespaced query keys", () => {
    const { sdk } = createSdkMock()
    const preset = createMedusaStorefrontPreset({
      queryKeyNamespace: ["tenant", "n1"],
      sdk,
    })

    expect(preset.queryKeys.cart.detail("cart_1")).toStrictEqual([
      "tenant",
      "n1",
      "cart",
      "detail",
      "cart_1",
    ])

    expect(
      preset.queryKeys.products.list({
        limit: 12,
      }),
    ).toStrictEqual(["tenant", "n1", "products", "list", { limit: 12 }])

    expect(
      preset.queryKeys.productLists.detail({
        customerId: "cus_1",
        id: "list_1",
      }),
    ).toStrictEqual([
      "tenant",
      "n1",
      "product-lists",
      "detail",
      {
        customerId: "cus_1",
        id: "list_1",
      },
    ])
  })

  it("exposes product-list hook input controls through preset types", () => {
    const { sdk } = createSdkMock()
    const preset = createMedusaStorefrontPreset({
      sdk,
    })
    type ProductListsInput = NonNullable<
      Parameters<typeof preset.hooks.productLists.useProductLists>[0]
    >
    type ProductListInput = Parameters<
      typeof preset.hooks.productLists.useProductList
    >[0]
    type SuspenseProductListInput = Parameters<
      typeof preset.hooks.productLists.useSuspenseProductList
    >[0]

    const listInput = {
      customerId: "cus_1",
      enabled: false,
      limit: 12,
      page: 2,
    } satisfies ProductListsInput
    const detailInput = {
      customerId: "cus_1",
      enabled: false,
      id: "list_1",
    } satisfies ProductListInput
    const suspenseDetailInput = {
      customerId: "cus_1",
      id: "list_1",
    } satisfies SuspenseProductListInput
    // @ts-expect-error suspense product-list detail input requires id
    const missingSuspenseInput: SuspenseProductListInput = {
      customerId: "cus_1",
    }

    expect(listInput.page).toBe(2)
    expect(detailInput.enabled).toBeFalsy()
    expect(suspenseDetailInput.id).toBe("list_1")
    expect(missingSuspenseInput.customerId).toBe("cus_1")
  })

  it("passes domain hook overrides to the composed hooks", async () => {
    const { sdk, spies } = createSdkMock()
    const preset = createMedusaStorefrontPreset({
      products: {
        hooks: {
          requireRegion: false,
        },
      },
      sdk,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(
      () =>
        preset.hooks.products.useProducts({
          limit: 1,
        }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBeTruthy()
    })

    expect(spies.clientFetch).toHaveBeenCalledWith(
      "/store/products",
      expect.objectContaining({
        query: expect.objectContaining({
          limit: 1,
        }),
      }),
    )
  })

  it("uses preset cart query keys as default checkout cart sync target", async () => {
    const { sdk } = createSdkMock()
    const customCartNamespace = ["custom", "cart"] as const
    const customCartQueryKeys: CartQueryKeys = {
      active: (params) => createQueryKey(customCartNamespace, "active", params),
      all: () => createQueryKey(customCartNamespace),
      detail: (cartId) => createQueryKey(customCartNamespace, "detail", cartId),
    }

    const preset = createMedusaStorefrontPreset({
      cart: {
        queryKeys: customCartQueryKeys,
      },
      sdk,
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(
      () =>
        preset.hooks.checkout.useCheckoutShipping({
          cart: createStoreCart("cart_1", {
            region_id: "reg_1",
            shipping_methods: [],
          }),
          cartId: "cart_1",
        }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.shippingOptions).toHaveLength(1)
    })

    await act(async () => {
      await result.current.setShippingMethodAsync("ship_1")
    })

    expect(
      queryClient.getQueryData(
        customCartQueryKeys.active({
          cartId: "cart_1",
          regionId: "reg_1",
        }),
      ),
    ).toStrictEqual(
      expect.objectContaining({
        id: "cart_1",
      }),
    )
  })

  it("uses custom user-data query keys for auth cross-domain invalidation", async () => {
    const { sdk } = createSdkMock()
    const customAuthService: AuthService<
      HttpTypes.StoreCustomer,
      MedusaAuthCredentials,
      MedusaRegisterData,
      MedusaUpdateCustomerData,
      unknown,
      string,
      string
    > = {
      getCustomer: async () => null,
      login: async () => "token",
      logout: async () => {},
      register: async () => "token",
      updateCustomer: async () => ({ id: "cus_1" }) as HttpTypes.StoreCustomer,
    }
    const customCustomerNamespace = ["custom", "customers"] as const
    const customCustomerQueryKeys: CustomerQueryKeys<MedusaCustomerListInput> =
      {
        addresses: (params) =>
          createQueryKey(customCustomerNamespace, "addresses", params ?? {}),
        all: () => createQueryKey(customCustomerNamespace),
        profile: () => createQueryKey(customCustomerNamespace, "profile"),
      }
    const customOrderNamespace = ["custom", "orders"] as const
    const customOrderQueryKeys: OrderQueryKeys<
      MedusaOrderListInput,
      MedusaOrderDetailInput
    > = {
      all: () => createQueryKey(customOrderNamespace),
      detail: (params) =>
        createQueryKey(customOrderNamespace, "detail", params ?? {}),
      list: (params) =>
        createQueryKey(customOrderNamespace, "list", params ?? {}),
    }
    const customProductListNamespace = ["custom", "product-lists"] as const
    const customProductListQueryKeys: ProductListQueryKeys<
      MedusaProductListListKeyInput,
      MedusaProductListDetailKeyInput
    > = {
      all: () => createQueryKey(customProductListNamespace),
      detail: (params) =>
        createQueryKey(customProductListNamespace, "detail", params ?? {}),
      list: (params) =>
        createQueryKey(customProductListNamespace, "list", params ?? {}),
    }

    const preset = createMedusaStorefrontPreset({
      auth: {
        service: customAuthService,
      },
      customers: {
        queryKeys: customCustomerQueryKeys,
      },
      orders: {
        queryKeys: customOrderQueryKeys,
      },
      productLists: {
        queryKeys: customProductListQueryKeys,
      },
      sdk,
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    queryClient.setQueryData(customCustomerQueryKeys.profile(), {
      id: "cus_old",
    })
    queryClient.setQueryData(customCustomerQueryKeys.addresses({}), [
      { id: "addr_old" },
    ])
    queryClient.setQueryData(customOrderQueryKeys.list({}), [
      { id: "order_old" },
    ])
    queryClient.setQueryData(
      customProductListQueryKeys.list({
        customerId: "cus_old",
      }),
      [{ id: "list_old" }],
    )
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => preset.hooks.auth.useLogin(), {
      wrapper,
    })

    await act(async () => {
      await result.current.mutateAsync({
        email: "john@example.com",
        password: "secret123",
      })
    })

    expect(
      queryClient.getQueryState(customCustomerQueryKeys.profile())
        ?.isInvalidated,
    ).toBeTruthy()
    expect(
      queryClient.getQueryState(customCustomerQueryKeys.addresses({}))
        ?.isInvalidated,
    ).toBeTruthy()
    expect(
      queryClient.getQueryState(customOrderQueryKeys.list({}))?.isInvalidated,
    ).toBeTruthy()
    expect(
      queryClient.getQueryState(
        customProductListQueryKeys.list({
          customerId: "cus_old",
        }),
      )?.isInvalidated,
    ).toBeTruthy()
  })

  it("syncs carts created from product lists through preset cart cache", async () => {
    const { sdk, spies } = createSdkMock()
    let storedCartId: string | null = null
    const preset = createMedusaStorefrontPreset({
      cart: {
        hooks: {
          cartStorage: {
            clear: () => {
              storedCartId = null
            },
            get: () => storedCartId,
            set: (value) => {
              storedCartId = value
            },
          },
        },
      },
      sdk,
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(
      () => preset.hooks.productLists.useCreateProductListCart(),
      {
        wrapper,
      },
    )

    await act(async () => {
      await result.current.mutateAsync({
        listId: "list_1",
        regionId: "reg_1",
      })
    })

    expect(spies.clientFetch).toHaveBeenCalledWith(
      "/store/product-lists/list_1/cart",
      {
        body: {
          region_id: "reg_1",
        },
        method: "POST",
      },
    )
    expect(storedCartId).toBe("cart_from_list")
    expect(
      queryClient.getQueryData(preset.queryKeys.cart.detail("cart_from_list")),
    ).toStrictEqual(
      expect.objectContaining({
        id: "cart_from_list",
        region_id: "reg_1",
      }),
    )
    expect(
      queryClient.getQueryData(
        preset.queryKeys.cart.active({
          cartId: "cart_from_list",
          regionId: "reg_1",
        }),
      ),
    ).toStrictEqual(
      expect.objectContaining({
        id: "cart_from_list",
        region_id: "reg_1",
      }),
    )
  })

  it("supports overriding auth/order/customer services through preset config", async () => {
    const { sdk } = createSdkMock()

    const customAuthService = {
      getCustomer: vi.fn(async () => null),
      login: vi.fn(async () => "token"),
      logout: vi.fn(async () => {}),
      register: vi.fn(async () => "token"),
    }

    const customOrderService = {
      getOrder: vi.fn(async () => null),
      getOrders: vi.fn(
        async (): Promise<{
          orders: HttpTypes.StoreOrder[]
          count: number
        }> => ({
          orders: [],
          count: 0,
        }),
      ),
    }

    const customCustomerService = {
      createAddress: vi.fn(async () => createStoreCustomerAddress("addr_1")),
      deleteAddress: vi.fn(async () => {}),
      getAddresses: vi.fn(
        async (): Promise<{
          addresses: HttpTypes.StoreCustomerAddress[]
        }> => ({
          addresses: [],
        }),
      ),
      updateAddress: vi.fn(async () => createStoreCustomerAddress("addr_1")),
      updateCustomer: vi.fn(async () => createStoreCustomer("cus_1")),
    }

    const preset = createMedusaStorefrontPreset({
      auth: {
        service: customAuthService,
      },
      customers: {
        service: customCustomerService,
      },
      orders: {
        service: customOrderService,
      },
      sdk,
    })

    expect(preset.services.auth).toBe(customAuthService)
    expect(preset.services.orders).toBe(customOrderService)
    expect(preset.services.customers).toBe(customCustomerService)

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)

    renderHook(() => preset.hooks.auth.useAuth(), { wrapper })
    renderHook(() => preset.hooks.orders.useOrders({ limit: 5, offset: 0 }), {
      wrapper,
    })
    renderHook(() => preset.hooks.customers.useCustomerAddresses({}), {
      wrapper,
    })

    await waitFor(() => {
      expect(customAuthService.getCustomer).toHaveBeenCalledWith()
      expect(customOrderService.getOrders).toHaveBeenCalledWith(
        { limit: 5, offset: 0 },
        expect.any(Object),
      )
      expect(customCustomerService.getAddresses).toHaveBeenCalledWith(
        {},
        expect.any(Object),
      )
    })
  })
})
