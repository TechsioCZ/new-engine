import { QueryClient } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import type { ReactNode } from "react"
import { it, afterEach, expect, describe, beforeEach } from "vitest"

import { createCartHooks } from "../src/cart/hooks"
import { createCartQueryKeys } from "../src/cart/query-keys"
import type { CartService, UpdateCartInputBase } from "../src/cart/types"
import { StorefrontDataProvider } from "../src/client/provider"
import { createCustomerHooks } from "../src/customers/hooks"
import type {
  CustomerAddressListInputBase,
  CustomerService,
} from "../src/customers/types"
import { createOrderHooks } from "../src/orders/hooks"
import type {
  OrderDetailInputBase,
  OrderListInputBase,
  OrderService,
} from "../src/orders/types"
import { createProductHooks } from "../src/products/hooks"
import { createProductQueryKeys } from "../src/products/query-keys"
import type {
  ProductListInputBase,
  ProductService,
} from "../src/products/types"
import type { StorefrontAddressValidationIssue } from "../src/shared/address"
import { server } from "./msw-server"

const createWrapper =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <StorefrontDataProvider client={client}>{children}</StorefrontDataProvider>
  )

const trackedClients: QueryClient[] = []

const createTestClient = (
  config?: ConstructorParameters<typeof QueryClient>[0]
) => {
  const client = new QueryClient(config)
  trackedClients.push(client)
  return client
}

afterEach(() => {
  for (const client of trackedClients) {
    client.clear()
  }
  trackedClients.length = 0
})

describe("storefront-data hook smoke tests", () => {
  const baseUrl = "https://storefront.test"

  describe("cart address helper", () => {
    interface AddressInput {
      firstName: string
      lastName: string
      address1: string
      city: string
      postalCode: string
      countryCode: string
      company?: string
    }

    interface AddressPayload {
      first_name: string
      last_name: string
      address_1: string
      city: string
      postal_code: string
      country_code: string
      company?: string
    }

    interface Cart {
      id: string
      region_id?: string | null
      shipping_address?: AddressPayload
      billing_address?: AddressPayload
    }

    interface UpdateParams {
      email?: string
      region_id?: string
      shipping_address?: AddressPayload
      billing_address?: AddressPayload
    }

    type UpdateInput = UpdateCartInputBase &
      UpdateParams & {
        shippingAddress: AddressInput
        billingAddress?: AddressInput
        useSameAddress?: boolean
      }

    let lastUpdatePayload: UpdateParams | null = null

    beforeEach(() => {
      lastUpdatePayload = null
      server.use(
        http.post(`${baseUrl}/carts/:cartId`, async ({ request, params }) => {
          const payload = (await request.json()) as UpdateParams
          lastUpdatePayload = payload
          return HttpResponse.json({
            cart: {
              billing_address: payload.billing_address,
              id: String(params["cartId"]),
              region_id: payload.region_id ?? null,
              shipping_address: payload.shipping_address,
            },
          })
        })
      )
    })

    it("maps shipping and billing addresses", async () => {
      const cartService: CartService<
        Cart,
        UpdateParams,
        UpdateParams,
        never,
        never,
        unknown
      > = {
        createCart: async () => ({ id: "cart_test" }),
        retrieveCart: async () => null,
        updateCart: async (cartId, params) => {
          const response = await fetch(`${baseUrl}/carts/${cartId}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(params),
          })
          const data = await response.json()
          return data.cart as Cart
        },
      }

      const buildUpdateParams = (input: UpdateInput): UpdateParams => ({
        ...(input.email ? { email: input.email } : {}),
        ...(input.region_id ? { region_id: input.region_id } : {}),
        ...(input.shipping_address
          ? { shipping_address: input.shipping_address }
          : {}),
        ...(input.billing_address
          ? { billing_address: input.billing_address }
          : {}),
      })

      const buildAddressPayload = (input: AddressInput): AddressPayload => ({
        address_1: input.address1,
        city: input.city,
        country_code: input.countryCode,
        first_name: input.firstName,
        last_name: input.lastName,
        postal_code: input.postalCode,
        ...(input.company ? { company: input.company } : {}),
      })

      const cartQueryKeys = createCartQueryKeys("smoke-cart")

      const { useUpdateCartAddress } = createCartHooks<
        Cart,
        UpdateInput,
        UpdateParams,
        UpdateInput,
        UpdateParams,
        never,
        never,
        never,
        never,
        unknown,
        AddressInput,
        AddressPayload
      >({
        addressAdapter: {
          normalize: (input) => ({
            ...input,
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            address1: input.address1.trim(),
          }),
          toPayload: (input) => buildAddressPayload(input),
          validate: (input, context) => {
            const issues: StorefrontAddressValidationIssue[] = []
            if (!input.firstName) {
              issues.push({
                scope: context.scope,
                field: "firstName",
                code: "required",
                message: "first name required",
              })
            }
            if (!input.lastName) {
              issues.push({
                scope: context.scope,
                field: "lastName",
                code: "required",
                message: "last name required",
              })
            }
            return issues.length ? issues : null
          },
        },
        buildAddParams: (input) => input,
        buildUpdateItemParams: (input) => input,
        buildUpdateParams,
        queryKeys: cartQueryKeys,
        service: cartService,
      })

      const queryClient = createTestClient({
        defaultOptions: {
          mutations: {
            retry: false,
          },
          queries: {
            retry: false,
          },
        },
      })

      const wrapper = createWrapper(queryClient)
      const { result } = renderHook(() => useUpdateCartAddress(), { wrapper })

      const shippingInput: AddressInput = {
        address1: "Main 1",
        city: "Prague",
        countryCode: "cz",
        firstName: "Test",
        lastName: "User",
        postalCode: "11000",
      }

      await act(async () => {
        await result.current.mutateAsync({
          cartId: "cart_123",
          email: "test@example.com",
          region_id: "reg_123",
          shippingAddress: shippingInput,
          useSameAddress: true,
        })
      })

      expect(lastUpdatePayload).toBeTruthy()
      expect(lastUpdatePayload?.shipping_address?.first_name).toBe("Test")
      expect(lastUpdatePayload?.billing_address?.first_name).toBe("Test")

      const cachedCart = queryClient.getQueryData<Cart>(
        cartQueryKeys.active({
          cartId: "cart_123",
          regionId: "reg_123",
        })
      )

      expect(cachedCart?.id).toBe("cart_123")
    })
  })

  describe("infinite products", () => {
    interface Product {
      id: string
      title: string
    }

    interface ProductListParams {
      limit: number
      offset: number
      region_id?: string
    }

    interface ProductDetailParams {
      handle: string
    }

    const buildListParams = (
      input: ProductListInputBase
    ): ProductListParams => {
      const limit = input.limit ?? 2
      const page = input.page ?? 1
      const offset = (page - 1) * limit

      return {
        limit,
        offset,
        ...(input.region_id ? { region_id: input.region_id } : {}),
      }
    }

    it("fetches pages separately from list cache", async () => {
      const offsets: number[] = []
      let requestCount = 0

      server.use(
        http.get(`${baseUrl}/products`, ({ request }) => {
          requestCount += 1
          const url = new URL(request.url)
          const limit = Number(url.searchParams.get("limit") ?? "0")
          const offset = Number(url.searchParams.get("offset") ?? "0")
          offsets.push(offset)

          const products = Array.from({ length: limit }).map((_, index) => ({
            id: `prod_${offset + index}`,
            title: `Product ${offset + index}`,
          }))

          return HttpResponse.json({
            count: 4,
            limit,
            offset,
            products,
          })
        })
      )

      const service: ProductService<
        Product,
        ProductListParams,
        ProductDetailParams
      > = {
        getProductByHandle: async () => null,
        getProducts: async (params) => {
          const query = new URLSearchParams({
            limit: String(params.limit),
            offset: String(params.offset),
            region_id: params.region_id ?? "",
          })
          const response = await fetch(`${baseUrl}/products?${query}`)
          return await response.json()
        },
      }

      const queryKeyNamespace = "smoke-products"
      const { useInfiniteProducts } = createProductHooks({
        buildListParams,
        queryKeyNamespace,
        service,
      })

      const queryClient = createTestClient({
        defaultOptions: {
          queries: { retry: false },
        },
      })

      const queryKeys = createProductQueryKeys<
        ProductListParams,
        ProductDetailParams
      >(queryKeyNamespace)

      const listParams = buildListParams({ limit: 2, page: 1 })
      queryClient.setQueryData(queryKeys.list(listParams), {
        count: 4,
        limit: 2,
        offset: 0,
        products: [],
      })

      const wrapper = createWrapper(queryClient)
      const { result } = renderHook(
        () =>
          useInfiniteProducts({
            limit: 2,
            page: 1,
            region_id: "reg_infinite",
          }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.products.length).toBeGreaterThan(0)
      })

      expect(requestCount).toBe(1)

      await act(async () => {
        await result.current.fetchNextPage()
      })

      await waitFor(() => {
        expect(result.current.products).toHaveLength(4)
      })

      expect(offsets).toStrictEqual([0, 2])
    })

    it("advances page index when initial limit differs", async () => {
      const offsets: number[] = []

      server.use(
        http.get(`${baseUrl}/products`, ({ request }) => {
          const url = new URL(request.url)
          const limit = Number(url.searchParams.get("limit") ?? "0")
          const offset = Number(url.searchParams.get("offset") ?? "0")
          offsets.push(offset)

          const products = Array.from({ length: limit }).map((_, index) => ({
            id: `prod_${offset + index}`,
            title: `Product ${offset + index}`,
          }))

          return HttpResponse.json({
            count: 12,
            limit,
            offset,
            products,
          })
        })
      )

      const service: ProductService<
        Product,
        ProductListParams,
        ProductDetailParams
      > = {
        getProductByHandle: async () => null,
        getProducts: async (params) => {
          const query = new URLSearchParams({
            limit: String(params.limit),
            offset: String(params.offset),
            region_id: params.region_id ?? "",
          })
          const response = await fetch(`${baseUrl}/products?${query}`)
          return await response.json()
        },
      }

      const { useInfiniteProducts } = createProductHooks({
        buildListParams,
        queryKeyNamespace: "smoke-products-initial-limit",
        service,
      })

      const queryClient = createTestClient({
        defaultOptions: {
          queries: { retry: false },
        },
      })

      const wrapper = createWrapper(queryClient)
      const { result } = renderHook(
        () =>
          useInfiniteProducts({
            initialLimit: 2,
            limit: 4,
            page: 1,
            region_id: "reg_infinite",
          }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.products).toHaveLength(2)
      })

      await act(async () => {
        await result.current.fetchNextPage()
      })

      await waitFor(() => {
        expect(result.current.products).toHaveLength(6)
      })

      expect(offsets).toStrictEqual([0, 4])
    })
  })

  describe("orders", () => {
    interface Order {
      id: string
    }

    interface OrderListParams {
      limit: number
      offset: number
    }

    interface OrderDetailParams {
      id: string
    }

    const buildListParams = (input: OrderListInputBase): OrderListParams => {
      const limit = input.limit ?? 20
      const page = input.page ?? 1
      const offset = (page - 1) * limit
      return { limit, offset }
    }

    const buildDetailParams = (
      input: OrderDetailInputBase
    ): OrderDetailParams => {
      if (!input.id) {
        throw new Error("Order id is required for order queries")
      }
      return { id: input.id }
    }

    it("fetches order list and detail", async () => {
      server.use(
        http.get(`${baseUrl}/orders`, ({ request }) => {
          const url = new URL(request.url)
          const limit = Number(url.searchParams.get("limit") ?? "0")
          const offset = Number(url.searchParams.get("offset") ?? "0")
          return HttpResponse.json({
            count: 1,
            limit,
            offset,
            orders: [{ id: "order_1" }],
          })
        }),
        http.get(`${baseUrl}/orders/:id`, ({ params }) =>
          HttpResponse.json({ order: { id: String(params["id"]) } })
        )
      )

      const service: OrderService<Order, OrderListParams, OrderDetailParams> = {
        getOrder: async (params) => {
          const response = await fetch(`${baseUrl}/orders/${params.id}`)
          const data = await response.json()
          return data.order as Order
        },
        getOrders: async (params) => {
          const query = new URLSearchParams({
            limit: String(params.limit),
            offset: String(params.offset),
          })
          const response = await fetch(`${baseUrl}/orders?${query}`)
          return await response.json()
        },
      }

      const { useOrders, useOrder } = createOrderHooks({
        buildDetailParams,
        buildListParams,
        queryKeyNamespace: "smoke-orders",
        service,
      })

      const queryClient = createTestClient({
        defaultOptions: { queries: { retry: false } },
      })

      const wrapper = createWrapper(queryClient)

      const listHook = renderHook(() => useOrders({ limit: 1, page: 1 }), {
        wrapper,
      })

      await waitFor(() => {
        expect(listHook.result.current.isSuccess).toBeTruthy()
      })

      expect(listHook.result.current.orders).toHaveLength(1)

      const detailHook = renderHook(() => useOrder({ id: "order_1" }), {
        wrapper,
      })

      await waitFor(() => {
        expect(detailHook.result.current.order?.id).toBe("order_1")
      })
    })
  })

  describe("customers", () => {
    interface Address {
      id: string
      address_1?: string
    }
    interface Customer {
      id: string
    }

    type ListParams = Record<string, never>
    interface CreateParams {
      address_1?: string
    }
    interface UpdateParams {
      address_1?: string
    }
    interface UpdateCustomerParams {
      metadata?: Record<string, unknown>
    }

    let lastCreateBody: CreateParams | null = null
    let lastUpdateBody: Record<string, unknown> | null = null

    beforeEach(() => {
      lastCreateBody = null
      lastUpdateBody = null
      server.use(
        http.get(`${baseUrl}/customers/me/addresses`, () =>
          HttpResponse.json({
            addresses: [{ address_1: "Main", id: "addr_1" }],
          })
        ),
        http.post(`${baseUrl}/customers/me/addresses`, async ({ request }) => {
          lastCreateBody = (await request.json()) as CreateParams
          return HttpResponse.json({
            address: { address_1: "New", id: "addr_2" },
          })
        }),
        http.post(
          `${baseUrl}/customers/me/addresses/:id`,
          async ({ request, params }) => {
            lastUpdateBody = (await request.json()) as Record<string, unknown>
            return HttpResponse.json({
              address: { address_1: "Updated", id: String(params["id"]) },
            })
          }
        ),
        http.delete(`${baseUrl}/customers/me/addresses/:id`, () =>
          HttpResponse.json({})
        ),
        http.post(`${baseUrl}/customers/me`, async ({ request }) => {
          lastUpdateBody = (await request.json()) as Record<string, unknown>
          return HttpResponse.json({ customer: { id: "cust_1" } })
        })
      )
    })

    it("lists and mutates addresses with customer updates", async () => {
      const service: CustomerService<
        Customer,
        Address,
        ListParams,
        CreateParams,
        UpdateParams,
        UpdateCustomerParams
      > = {
        createAddress: async (params) => {
          const response = await fetch(`${baseUrl}/customers/me/addresses`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(params),
          })
          const data = await response.json()
          return data.address as Address
        },
        deleteAddress: async (addressId) => {
          await fetch(`${baseUrl}/customers/me/addresses/${addressId}`, {
            method: "DELETE",
          })
        },
        getAddresses: async () => {
          const response = await fetch(`${baseUrl}/customers/me/addresses`)
          return await response.json()
        },
        updateAddress: async (addressId, params) => {
          const response = await fetch(
            `${baseUrl}/customers/me/addresses/${addressId}`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(params),
            }
          )
          const data = await response.json()
          return data.address as Address
        },
        updateCustomer: async (params) => {
          const response = await fetch(`${baseUrl}/customers/me`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(params),
          })
          const data = await response.json()
          return data.customer as Customer
        },
      }

      const {
        useCustomerAddresses,
        useCreateCustomerAddress,
        useUpdateCustomerAddress,
        useDeleteCustomerAddress,
        useUpdateCustomer,
      } = createCustomerHooks({
        buildListParams: () => ({}),
        queryKeyNamespace: "smoke-customers",
        service,
      })

      const queryClient = createTestClient({
        defaultOptions: {
          mutations: { retry: false },
          queries: { retry: false },
        },
      })
      const wrapper = createWrapper(queryClient)

      const listHook = renderHook(() => useCustomerAddresses({}), {
        wrapper,
      })

      await waitFor(() => {
        expect(listHook.result.current.isSuccess).toBeTruthy()
      })

      expect(listHook.result.current.addresses).toHaveLength(1)

      const createHook = renderHook(() => useCreateCustomerAddress(), {
        wrapper,
      })

      await act(async () => {
        await createHook.result.current.mutateAsync({ address_1: "New" })
      })

      expect(lastCreateBody?.address_1).toBe("New")

      const updateHook = renderHook(() => useUpdateCustomerAddress(), {
        wrapper,
      })

      await act(async () => {
        await updateHook.result.current.mutateAsync({
          addressId: "addr_1",
          address_1: "Updated",
        })
      })

      expect(lastUpdateBody?.["addressId"]).toBeUndefined()

      const deleteHook = renderHook(() => useDeleteCustomerAddress(), {
        wrapper,
      })

      await act(async () => {
        await deleteHook.result.current.mutateAsync({ addressId: "addr_1" })
      })
      await waitFor(() => {
        expect(deleteHook.result.current.isSuccess).toBeTruthy()
      })

      const updateCustomerHook = renderHook(() => useUpdateCustomer(), {
        wrapper,
      })

      await act(async () => {
        await updateCustomerHook.result.current.mutateAsync({
          metadata: { company: "QA" },
        })
      })

      expect(lastUpdateBody?.["metadata"]).toStrictEqual({ company: "QA" })
    })
  })
})
