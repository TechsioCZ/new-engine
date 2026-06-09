import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import { QueryClient } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import type { CatalogFacets } from "../src/catalog/types"
import type {
  MedusaAuthCredentials,
  MedusaRegisterData,
  MedusaUpdateCustomerData,
} from "../src/auth/medusa-service"
import type { AuthService } from "../src/auth/types"
import { StorefrontDataProvider } from "../src/client/provider"
import {
  createCheckoutCartAddressAdapter,
  createCheckoutCustomerAddressAdapter,
  type CheckoutAddressInput,
  type MedusaCartAddressPayload,
  type CheckoutCustomerAddressUpdateInput,
} from "../src/checkout/address"
import type { MedusaCustomerListInput } from "../src/customers/medusa-service"
import type { CustomerQueryKeys } from "../src/customers/types"
import {
  createMedusaStorefrontPreset,
  type CreateMedusaStorefrontPresetConfig,
} from "../src/medusa/preset"
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
import type { CartQueryKeys } from "../src/cart/types"
import { createQueryKey } from "../src/shared/query-keys"

const createWrapper = (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <StorefrontDataProvider client={client}>{children}</StorefrontDataProvider>
  )

type StoreCartLike = {
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
          products: [{ id: "prod_1", handle: "p-1", title: "Product 1" }],
          count: 1,
          limit: 1,
          offset: 0,
        }
      }

      if (path === "/store/shipping-options") {
        return {
          shipping_options: [{ id: "ship_1", amount: 150, price_type: "flat" }],
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
    }
  )

  const addShippingMethod = vi.fn(
    async (): Promise<{ cart: StoreCartLike }> => ({
      cart: {
        id: "cart_1",
        region_id: "reg_1",
        shipping_methods: [{ shipping_option_id: "ship_1" }],
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
          addShippingMethod,
          retrieve: vi.fn(async () => ({ cart: null })),
        },
        payment: {
          initiatePaymentSession: vi.fn(
            async () => ({ payment_collection: { payment_sessions: [] } })
          ),
        },
      },
    } as unknown as Medusa,
    spies: {
      clientFetch,
      addShippingMethod,
    },
  }
}

describe("createMedusaStorefrontPreset", () => {
  it("allows thin cart hook overrides without buildAddParams", () => {
    const { sdk } = createSdkMock()

    const config = {
      sdk,
      cart: {
        hooks: {
          cartStorage: {
            get: () => null,
            set: () => undefined,
            clear: () => undefined,
          },
        },
      },
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
      CheckoutCustomerAddressUpdateInput<CheckoutAddressInput>
    >({
      sdk,
      cart: {
        hooks: {
          addressAdapter: createCheckoutCartAddressAdapter(),
        },
      },
      customers: {
        hooks: {
          addressAdapter: createCheckoutCustomerAddressAdapter(),
        },
      },
      catalog: {
        fallbackFacets: {
          status: [],
          form: [],
          brand: [],
          ingredient: [],
          price: {
            min: null,
            max: null,
          },
          dosage: [],
        },
      },
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
    const invalidConfig = {
      sdk,
    } satisfies CreateMedusaStorefrontPresetConfig<
      HttpTypes.StoreProduct,
      HttpTypes.StoreProductCategory,
      HttpTypes.StoreCollection,
      HttpTypes.StoreProduct,
      ExtendedCatalogFacets
    >

    expect(invalidConfig).toBeDefined()
  })

  it("builds namespaced query keys", () => {
    const { sdk } = createSdkMock()
    const preset = createMedusaStorefrontPreset({
      sdk,
      queryKeyNamespace: ["tenant", "n1"],
    })

    expect(preset.queryKeys.cart.detail("cart_1")).toEqual([
      "tenant",
      "n1",
      "cart",
      "detail",
      "cart_1",
    ])

    expect(
      preset.queryKeys.products.list({
        limit: 12,
      })
    ).toEqual(["tenant", "n1", "products", "list", { limit: 12 }])

    expect(
      preset.queryKeys.productLists.detail({
        id: "list_1",
        customerId: "cus_1",
      })
    ).toEqual([
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
      page: 2,
      limit: 12,
      customerId: "cus_1",
      enabled: false,
    } satisfies ProductListsInput
    const detailInput = {
      id: "list_1",
      customerId: "cus_1",
      enabled: false,
    } satisfies ProductListInput
    const suspenseDetailInput = {
      id: "list_1",
      customerId: "cus_1",
    } satisfies SuspenseProductListInput
    // @ts-expect-error suspense product-list detail input requires id
    const missingSuspenseInput: SuspenseProductListInput = {
      customerId: "cus_1",
    }

    expect(listInput.page).toBe(2)
    expect(detailInput.enabled).toBe(false)
    expect(suspenseDetailInput.id).toBe("list_1")
    expect(missingSuspenseInput.customerId).toBe("cus_1")
  })

  it("passes domain hook overrides to the composed hooks", async () => {
    const { sdk, spies } = createSdkMock()
    const preset = createMedusaStorefrontPreset({
      sdk,
      products: {
        hooks: {
          requireRegion: false,
        },
      },
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
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(spies.clientFetch).toHaveBeenCalledWith(
      "/store/products",
      expect.objectContaining({
        query: expect.objectContaining({
          limit: 1,
        }),
      })
    )
  })

  it("uses preset cart query keys as default checkout cart sync target", async () => {
    const { sdk } = createSdkMock()
    const customCartNamespace = ["custom", "cart"] as const
    const customCartQueryKeys: CartQueryKeys = {
      all: () => createQueryKey(customCartNamespace),
      active: (params) => createQueryKey(customCartNamespace, "active", params),
      detail: (cartId) => createQueryKey(customCartNamespace, "detail", cartId),
    }

    const preset = createMedusaStorefrontPreset({
      sdk,
      cart: {
        queryKeys: customCartQueryKeys,
      },
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
        preset.hooks.checkout.useCheckoutShipping({
          cartId: "cart_1",
          cart: {
            id: "cart_1",
            region_id: "reg_1",
            shipping_methods: [],
          },
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.shippingOptions.length).toBe(1)
    })

    await act(async () => {
      await result.current.setShippingMethodAsync("ship_1")
    })

    expect(
      queryClient.getQueryData(
        customCartQueryKeys.active({
          cartId: "cart_1",
          regionId: "reg_1",
        })
      )
    ).toEqual(
      expect.objectContaining({
        id: "cart_1",
      })
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
      updateCustomer: async () => ({ id: "cus_1" } as HttpTypes.StoreCustomer),
    }
    const customCustomerNamespace = ["custom", "customers"] as const
    const customCustomerQueryKeys: CustomerQueryKeys<MedusaCustomerListInput> = {
      all: () => createQueryKey(customCustomerNamespace),
      profile: () => createQueryKey(customCustomerNamespace, "profile"),
      addresses: (params) =>
        createQueryKey(customCustomerNamespace, "addresses", params ?? {}),
    }
    const customOrderNamespace = ["custom", "orders"] as const
    const customOrderQueryKeys: OrderQueryKeys<
      MedusaOrderListInput,
      MedusaOrderDetailInput
    > = {
      all: () => createQueryKey(customOrderNamespace),
      list: (params) => createQueryKey(customOrderNamespace, "list", params ?? {}),
      detail: (params) =>
        createQueryKey(customOrderNamespace, "detail", params ?? {}),
    }
    const customProductListNamespace = ["custom", "product-lists"] as const
    const customProductListQueryKeys: ProductListQueryKeys<
      MedusaProductListListKeyInput,
      MedusaProductListDetailKeyInput
    > = {
      all: () => createQueryKey(customProductListNamespace),
      list: (params) =>
        createQueryKey(customProductListNamespace, "list", params ?? {}),
      detail: (params) =>
        createQueryKey(customProductListNamespace, "detail", params ?? {}),
    }

    const preset = createMedusaStorefrontPreset({
      sdk,
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
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    queryClient.setQueryData(customCustomerQueryKeys.profile(), { id: "cus_old" })
    queryClient.setQueryData(customCustomerQueryKeys.addresses({}), [
      { id: "addr_old" },
    ])
    queryClient.setQueryData(customOrderQueryKeys.list({}), [{ id: "order_old" }])
    queryClient.setQueryData(
      customProductListQueryKeys.list({
        customerId: "cus_old",
      }),
      [{ id: "list_old" }]
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
      queryClient.getQueryState(customCustomerQueryKeys.profile())?.isInvalidated
    ).toBe(true)
    expect(
      queryClient.getQueryState(customCustomerQueryKeys.addresses({}))?.isInvalidated
    ).toBe(true)
    expect(queryClient.getQueryState(customOrderQueryKeys.list({}))?.isInvalidated).toBe(
      true
    )
    expect(
      queryClient.getQueryState(
        customProductListQueryKeys.list({
          customerId: "cus_old",
        })
      )?.isInvalidated
    ).toBe(true)
  })

  it("syncs carts created from product lists through preset cart cache", async () => {
    const { sdk, spies } = createSdkMock()
    let storedCartId: string | null = null
    const preset = createMedusaStorefrontPreset({
      sdk,
      cart: {
        hooks: {
          cartStorage: {
            get: () => storedCartId,
            set: (value) => {
              storedCartId = value
            },
            clear: () => {
              storedCartId = null
            },
          },
        },
      },
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(
      () => preset.hooks.productLists.useCreateProductListCart(),
      { wrapper }
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
        method: "POST",
        body: {
          region_id: "reg_1",
        },
      }
    )
    expect(storedCartId).toBe("cart_from_list")
    expect(
      queryClient.getQueryData(preset.queryKeys.cart.detail("cart_from_list"))
    ).toEqual(
      expect.objectContaining({
        id: "cart_from_list",
        region_id: "reg_1",
      })
    )
    expect(
      queryClient.getQueryData(
        preset.queryKeys.cart.active({
          cartId: "cart_from_list",
          regionId: "reg_1",
        })
      )
    ).toEqual(
      expect.objectContaining({
        id: "cart_from_list",
        region_id: "reg_1",
      })
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
      getOrders: vi.fn(
        async (): Promise<{ orders: HttpTypes.StoreOrder[]; count: number }> => ({
          orders: [],
          count: 0,
        })
      ),
      getOrder: vi.fn(async () => null),
    }

    const customCustomerService = {
      getAddresses: vi.fn(
        async (): Promise<{
          addresses: HttpTypes.StoreCustomerAddress[]
        }> => ({
          addresses: [],
        })
      ),
      createAddress: vi.fn(async () => ({ id: "addr_1" })),
      updateAddress: vi.fn(async () => ({ id: "addr_1" })),
      deleteAddress: vi.fn(async () => {}),
      updateCustomer: vi.fn(async () => ({ id: "cus_1" })),
    }

    const preset = createMedusaStorefrontPreset({
      sdk,
      auth: {
        service: customAuthService,
      },
      orders: {
        service: customOrderService,
      },
      customers: {
        service: customCustomerService,
      },
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
      expect(customAuthService.getCustomer).toHaveBeenCalled()
      expect(customOrderService.getOrders).toHaveBeenCalledWith(
        { limit: 5, offset: 0 },
        expect.any(Object)
      )
      expect(customCustomerService.getAddresses).toHaveBeenCalledWith(
        {},
        expect.any(Object)
      )
    })
  })
})
