import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import { QueryClient } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import type {
  MedusaAuthCredentials,
  MedusaRegisterData,
  MedusaUpdateCustomerData,
} from "../src/auth/medusa-service"
import type { AuthService } from "../src/auth/types"
import { StorefrontDataProvider } from "../src/client/provider"
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
            getCartId: () => null,
            setCartId: () => {},
            clearCartId: () => {},
          },
        },
      },
    } satisfies CreateMedusaStorefrontPresetConfig

    const preset = createMedusaStorefrontPreset(config)
    expect(preset.hooks.cart).toBeDefined()
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

  it("uses custom customer/order query keys for auth cross-domain invalidation", async () => {
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
    const customCustomerQueryKeys: CustomerQueryKeys<MedusaCustomerListInput> = {
      all: () => ["custom", "customers"],
      profile: () => ["custom", "customers", "profile"],
      addresses: (params) => ["custom", "customers", "addresses", params ?? {}],
    }
    const customOrderQueryKeys: OrderQueryKeys<
      MedusaOrderListInput,
      MedusaOrderDetailInput
    > = {
      all: () => ["custom", "orders"],
      list: (params) => ["custom", "orders", "list", params ?? {}],
      detail: (params) => ["custom", "orders", "detail", params ?? {}],
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
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    queryClient.setQueryData(customCustomerQueryKeys.profile(), { id: "cus_old" })
    queryClient.setQueryData(customOrderQueryKeys.all(), [{ id: "order_old" }])
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
    expect(queryClient.getQueryState(customOrderQueryKeys.all())?.isInvalidated).toBe(
      true
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
