import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import type { HttpTypes } from "@medusajs/types"
import { QueryClient } from "@tanstack/react-query"
import { isRecord } from "@techsio/std/object"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { vi, describe, expect, it } from "vitest"

import { createCheckoutHooks } from "../src/checkout/hooks"
import { createMedusaCheckoutService } from "../src/checkout/medusa-service"
import { StorefrontDataProvider } from "../src/client/provider"
import { createMedusaCustomerService } from "../src/customers/medusa-service"
import { createMedusaOrderService } from "../src/orders/medusa-service"
import {
  createStoreCustomerAddress,
  createStoreOrder,
  createStoreShippingOption,
  createStoreShippingOptionWithServiceZone,
  createTestMedusaSdk,
} from "./medusa-fixtures"

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

const createWrapper = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <StorefrontDataProvider client={client}>{children}</StorefrontDataProvider>
  )
  return Wrapper
}

const resolveTestRelativePath = (relativePath: string): string => {
  const resolvedUrl = new URL(relativePath, import.meta.url)
  if (resolvedUrl.protocol === "file:") {
    return fileURLToPath(resolvedUrl)
  }

  const decodedPathname = decodeURIComponent(resolvedUrl.pathname)
  if (decodedPathname.startsWith("/@fs/")) {
    return decodedPathname.slice("/@fs/".length)
  }

  return decodedPathname.replace(/^\/(?<drive>[A-Za-z]:)/u, "$<drive>")
}

type OrderFetch = (
  path: string,
  init?: { query?: Record<string, unknown>; signal?: AbortSignal | null },
) => Promise<unknown>

type CustomerFetch = (
  path: string,
  init?: { signal?: AbortSignal | null },
) => Promise<unknown>

type CheckoutFetch = (
  path: string,
  init?: {
    body?: Record<string, unknown>
    method?: string
    query?: Record<string, unknown>
    signal?: AbortSignal | null
  },
) => Promise<unknown>

describe("phase 2 regressions", () => {
  it("forwards AbortSignal in order list and detail requests", async () => {
    const fetch = vi
      .fn<OrderFetch>()
      .mockResolvedValueOnce({
        count: 1,
        limit: 10,
        offset: 20,
        orders: [createStoreOrder("order_1")],
      } satisfies HttpTypes.StoreOrderListResponse)
      .mockResolvedValueOnce({
        order: createStoreOrder("order_1"),
      })

    const sdk = createTestMedusaSdk()
    Object.defineProperty(sdk.client, "fetch", { value: fetch })

    const service = createMedusaOrderService(sdk, {
      defaultFields: "id,status",
    })
    const controller = new AbortController()

    const list = await service.getOrders(
      { limit: 10, offset: 20 },
      controller.signal,
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

  it("supports separate order list/detail fields, sorting, and opt-in 404 nulls", async () => {
    const fetch = vi
      .fn<OrderFetch>()
      .mockResolvedValueOnce({
        count: 1,
        limit: 10,
        offset: 20,
        orders: [createStoreOrder("order_1")],
      } satisfies HttpTypes.StoreOrderListResponse)
      .mockRejectedValueOnce({ response: { status: 404 } })

    const sdk = createTestMedusaSdk()
    Object.defineProperty(sdk.client, "fetch", { value: fetch })

    const service = createMedusaOrderService(sdk, {
      defaultDetailFields: "id,*items",
      defaultListFields: "id,display_id",
      defaultOrder: "-created_at",
      returnNullOnNotFound: true,
    })
    const controller = new AbortController()

    const list = await service.getOrders(
      { limit: 10, offset: 20 },
      controller.signal,
    )
    expect(list.orders).toHaveLength(1)

    await expect(
      service.getOrder({ id: "order_missing" }, controller.signal),
    ).resolves.toBeNull()

    expect(fetch).toHaveBeenNthCalledWith(1, "/store/orders", {
      query: {
        fields: "id,display_id",
        limit: 10,
        offset: 20,
        order: "-created_at",
      },
      signal: controller.signal,
    })
    expect(fetch).toHaveBeenNthCalledWith(2, "/store/orders/order_missing", {
      query: {
        fields: "id,*items",
      },
      signal: controller.signal,
    })
  })

  it("skips order detail fetch when id is missing", async () => {
    const fetch = vi.fn<OrderFetch>()
    const sdk = createTestMedusaSdk()
    Object.defineProperty(sdk.client, "fetch", { value: fetch })

    const service = createMedusaOrderService(sdk, {
      defaultFields: "id,status",
    })

    await expect(service.getOrder({})).resolves.toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("forwards AbortSignal in customer addresses fetch and keeps auth fallback", async () => {
    const fetch = vi
      .fn<CustomerFetch>()
      .mockResolvedValueOnce({
        addresses: [createStoreCustomerAddress("addr_1")],
        count: 1,
        limit: 1,
        offset: 0,
      } satisfies HttpTypes.StoreCustomerAddressListResponse)
      .mockRejectedValueOnce({ status: 401 })

    const sdk = createTestMedusaSdk()
    Object.defineProperty(sdk.client, "fetch", { value: fetch })

    const service = createMedusaCustomerService(sdk)
    const controller = new AbortController()

    const success = await service.getAddresses({}, controller.signal)
    expect(success.addresses[0]?.id).toBe("addr_1")
    expect(fetch).toHaveBeenNthCalledWith(1, "/store/customers/me/addresses", {
      signal: controller.signal,
    })

    const unauthorized = await service.getAddresses({}, controller.signal)
    expect(unauthorized.addresses).toStrictEqual([])
  })

  it("forwards AbortSignal in checkout read APIs", async () => {
    const fetch = vi
      .fn<CheckoutFetch>()
      .mockResolvedValueOnce({
        shipping_options: [createStoreShippingOptionWithServiceZone("opt_1")],
      } satisfies HttpTypes.StoreShippingOptionListResponse)
      .mockResolvedValueOnce({
        shipping_option: createStoreShippingOption("opt_1"),
      } satisfies HttpTypes.StoreShippingOptionResponse)
      .mockResolvedValueOnce({
        count: 1,
        limit: 1,
        offset: 0,
        payment_providers: [{ id: "pp_1" }],
      } satisfies HttpTypes.StorePaymentProviderListResponse)

    const sdk = createTestMedusaSdk()
    Object.defineProperty(sdk.client, "fetch", { value: fetch })

    const service = createMedusaCheckoutService(sdk)
    const controller = new AbortController()

    await service.listShippingOptions("cart_1", controller.signal)
    await service.calculateShippingOption(
      "opt_1",
      { cart_id: "cart_1", data: { note: "x" } },
      controller.signal,
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
        body: {
          cart_id: "cart_1",
          data: { note: "x" },
        },
        method: "POST",
        signal: controller.signal,
      },
    )
    expect(fetch).toHaveBeenNthCalledWith(3, "/store/payment-providers", {
      query: { region_id: "reg_1" },
      signal: controller.signal,
    })
  })

  it("handles checkout shipping when calculateShippingOption is not provided", async () => {
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
    }

    const service = {
      addShippingMethod: async (cartId: string, optionId: string) =>
        await Promise.resolve({
          id: cartId,
          region_id: "reg_1",
          shipping_methods: [{ shipping_option_id: optionId }],
        } as Cart),
      initiatePaymentSession: async () =>
        await Promise.resolve({ id: "pay_col_1" }),
      listPaymentProviders: async () =>
        await Promise.resolve([{ id: "pay_1" }] as PaymentProvider[]),
      listShippingOptions: async () =>
        await Promise.resolve([
          {
            amount: 500,
            id: "opt_fixed",
            price_type: "flat",
          },
        ] as ShippingOption[]),
    }

    const { useCheckoutShipping } = createCheckoutHooks<
      Cart,
      ShippingOption,
      PaymentProvider,
      PaymentCollection,
      unknown
    >({
      decodeCart: decodeCheckoutCart,
      queryKeyNamespace: "phase2-checkout",
      service,
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
        useCheckoutShipping({
          calculatePrices: true,
          cart: { id: "cart_1", region_id: "reg_1" },
          cartId: "cart_1",
        }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.shippingOptions).toHaveLength(1)
    })

    expect(result.current.isCalculating).toBeFalsy()
    expect(result.current.shippingPrices).toStrictEqual({ opt_fixed: 500 })
  })

  it("documents preset-first SSR prefetch without hardcoded query keys", () => {
    const readme = readFileSync(
      resolveTestRelativePath("../README.md"),
      "utf-8",
    )

    expect(readme).toContain("createMedusaStorefrontPreset")
    expect(readme).toContain("productHooks.getListQueryOptions")
    expect(readme).toContain("There is no supported package-root import")
    expect(readme).not.toContain('queryKey: ["my-app", "products", "list", {}]')
  })
})
