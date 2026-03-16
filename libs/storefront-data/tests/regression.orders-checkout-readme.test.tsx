import type { HttpTypes } from "@medusajs/types"
import { QueryClient } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { ReactNode } from "react"
import { createCheckoutHooks } from "../src/checkout/hooks"
import { createMedusaCheckoutService } from "../src/checkout/medusa-service"
import { createMedusaCustomerService } from "../src/customers/medusa-service"
import { createMedusaOrderService } from "../src/orders/medusa-service"
import { StorefrontDataProvider } from "../src/client/provider"

const createWrapper = (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <StorefrontDataProvider client={client}>{children}</StorefrontDataProvider>
  )

describe("phase 2 regressions", () => {
  it("forwards AbortSignal in order list and detail requests", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({
        orders: [{ id: "order_1" }],
        count: 1,
      } satisfies HttpTypes.StoreOrderListResponse)
      .mockResolvedValueOnce({
        order: { id: "order_1" } as HttpTypes.StoreOrder,
      })

    const service = createMedusaOrderService(
      { client: { fetch } } as never,
      { defaultFields: "id,status" }
    )
    const controller = new AbortController()

    const list = await service.getOrders(
      { limit: 10, offset: 20 },
      controller.signal
    )
    expect(list.orders).toHaveLength(1)

    const detail = await service.getOrder({ id: "order_1" }, controller.signal)
    expect(detail?.id).toBe("order_1")

    expect(fetch).toHaveBeenNthCalledWith(1, "/store/orders", {
      query: {
        fields: "id,status",
        limit: 10,
        offset: 20,
      },
      signal: controller.signal,
    })
    expect(fetch).toHaveBeenNthCalledWith(2, "/store/orders/order_1", {
      query: {
        fields: "id,status",
      },
      signal: controller.signal,
    })
  })

  it("skips order detail fetch when id is missing", async () => {
    const fetch = vi.fn()
    const service = createMedusaOrderService(
      { client: { fetch } } as never,
      { defaultFields: "id,status" }
    )

    await expect(service.getOrder({})).resolves.toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("forwards AbortSignal in customer addresses fetch and keeps auth fallback", async () => {
    const sdk = {
      client: {
        fetch: vi
          .fn()
          .mockResolvedValueOnce({
            addresses: [{ id: "addr_1" }],
          } satisfies HttpTypes.StoreCustomerAddressListResponse)
          .mockRejectedValueOnce({ status: 401 }),
      },
      store: {
        customer: {
          listAddress: vi.fn(),
          createAddress: vi.fn(),
          updateAddress: vi.fn(),
          deleteAddress: vi.fn(),
          update: vi.fn(),
        },
      },
    }

    const service = createMedusaCustomerService(sdk as never)
    const controller = new AbortController()

    const success = await service.getAddresses({}, controller.signal)
    expect(success.addresses[0]?.id).toBe("addr_1")
    expect(sdk.client.fetch).toHaveBeenNthCalledWith(
      1,
      "/store/customers/me/addresses",
      { signal: controller.signal }
    )

    const unauthorized = await service.getAddresses({}, controller.signal)
    expect(unauthorized.addresses).toEqual([])
  })

  it("forwards AbortSignal in checkout read APIs", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({
        shipping_options: [{ id: "opt_1" }],
      } satisfies HttpTypes.StoreShippingOptionListResponse)
      .mockResolvedValueOnce({
        shipping_option: { id: "opt_1" } as HttpTypes.StoreCartShippingOption,
      } satisfies HttpTypes.StoreShippingOptionResponse)
      .mockResolvedValueOnce({
        payment_providers: [{ id: "pp_1" }],
      } satisfies HttpTypes.StorePaymentProviderListResponse)

    const sdk = {
      client: {
        fetch,
      },
      store: {
        cart: {
          addShippingMethod: vi.fn(),
          retrieve: vi.fn(),
          complete: vi.fn(),
        },
        payment: {
          initiatePaymentSession: vi.fn(),
        },
      },
    }
    const service = createMedusaCheckoutService(sdk as never)
    const controller = new AbortController()

    await service.listShippingOptions("cart_1", controller.signal)
    await service.calculateShippingOption(
      "opt_1",
      { cart_id: "cart_1", data: { note: "x" } },
      controller.signal
    )
    await service.listPaymentProviders("reg_1", controller.signal)

    expect(fetch).toHaveBeenNthCalledWith(1, "/store/shipping-options", {
      query: { cart_id: "cart_1" },
      signal: controller.signal,
    })
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/store/shipping-options/opt_1/calculate",
      {
        method: "POST",
        body: {
          cart_id: "cart_1",
          data: { note: "x" },
        },
        signal: controller.signal,
      }
    )
    expect(fetch).toHaveBeenNthCalledWith(3, "/store/payment-providers", {
      query: { region_id: "reg_1" },
      signal: controller.signal,
    })
  })

  it("handles checkout shipping when calculateShippingOption is not provided", async () => {
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
      listShippingOptions: async () =>
        [
          {
            id: "opt_fixed",
            price_type: "flat",
            amount: 500,
          },
        ] as ShippingOption[],
      addShippingMethod: async (cartId: string, optionId: string) =>
        ({
          id: cartId,
          region_id: "reg_1",
          shipping_methods: [{ shipping_option_id: optionId }],
        }) as Cart,
      listPaymentProviders: async () => [{ id: "pay_1" }] as PaymentProvider[],
      initiatePaymentSession: async () => ({ id: "pay_col_1" }) as PaymentCollection,
    }

    const { useCheckoutShipping } = createCheckoutHooks<
      Cart,
      ShippingOption,
      PaymentProvider,
      PaymentCollection,
      unknown
    >({
      service,
      queryKeyNamespace: "phase2-checkout",
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(
      () =>
        useCheckoutShipping({
          cartId: "cart_1",
          cart: { id: "cart_1", region_id: "reg_1" },
          calculatePrices: true,
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.shippingOptions).toHaveLength(1)
    })

    expect(result.current.isCalculating).toBe(false)
    expect(result.current.shippingPrices).toEqual({ opt_fixed: 500 })
  })

  it("documents SSR prefetch with query-key factory instead of hardcoded key", () => {
    const readme = readFileSync(join(process.cwd(), "README.md"), "utf8")

    expect(readme).toContain("createProductQueryKeys")
    expect(readme).toContain("productQueryKeys.list(listParams)")
    expect(readme).not.toContain('queryKey: ["my-app", "products", "list", {}]')
  })
})
