import { QueryClient } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import type { ReactNode } from "react"
import {
  createCartHooks,
  createCartQueryKeys,
  type CartService,
  type UpdateCartInputBase,
} from "../src/cart"
import {
  createCustomerHooks,
  type CustomerAddressListInputBase,
  type CustomerService,
} from "../src/customers"
import {
  createOrderHooks,
  type OrderDetailInputBase,
  type OrderListInputBase,
  type OrderService,
} from "../src/orders"
import {
  createProductHooks,
  createProductQueryKeys,
  type ProductListInputBase,
  type ProductService,
} from "../src/products"
import { StorefrontDataProvider } from "../src/client"
import { server } from "./msw-server"

const createWrapper = (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <StorefrontDataProvider client={client}>{children}</StorefrontDataProvider>
  )

const trackedClients: QueryClient[] = []

const createTestClient = (config?: ConstructorParameters<typeof QueryClient>[0]) => {
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
    type AddressInput = {
      firstName: string
      lastName: string
      address1: string
      city: string
      postalCode: string
      countryCode: string
      company?: string
    }

    type AddressPayload = {
      first_name: string
      last_name: string
      address_1: string
      city: string
      postal_code: string
      country_code: string
      company?: string
    }

    type Cart = {
      id: string
      region_id?: string | null
      shipping_address?: AddressPayload
      billing_address?: AddressPayload
    }

    type UpdateParams = {
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
              id: String(params.cartId),
              region_id: payload.region_id ?? null,
              shipping_address: payload.shipping_address,
              billing_address: payload.billing_address,
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
        retrieveCart: async () => null,
        createCart: async () => ({ id: "cart_test" }),
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
        email: input.email,
        region_id: input.region_id,
        shipping_address: input.shipping_address,
        billing_address: input.billing_address,
      })

      const buildAddressPayload = (input: AddressInput): AddressPayload => ({
        first_name: input.firstName,
        last_name: input.lastName,
        address_1: input.address1,
        city: input.city,
        postal_code: input.postalCode,
        country_code: input.countryCode,
        company: input.company,
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
        service: cartService,
        buildUpdateParams,
        queryKeys: cartQueryKeys,
        normalizeShippingAddressInput: (input) => ({
          ...input,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          address1: input.address1.trim(),
        }),
        validateShippingAddressInput: (input) => {
          const errors: string[] = []
          if (!input.firstName) {
            errors.push("first name required")
          }
          if (!input.lastName) {
            errors.push("last name required")
          }
          return errors.length ? errors : null
        },
        buildShippingAddress: buildAddressPayload,
        buildBillingAddress: buildAddressPayload,
      })

      const queryClient = createTestClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
          mutations: {
            retry: false,
          },
        },
      })

      const wrapper = createWrapper(queryClient)
      const { result } = renderHook(() => useUpdateCartAddress(), { wrapper })

      const shippingInput: AddressInput = {
        firstName: "Test",
        lastName: "User",
        address1: "Main 1",
        city: "Prague",
        postalCode: "11000",
        countryCode: "cz",
      }

      await act(async () => {
        await result.current.mutateAsync({
          cartId: "cart_123",
          region_id: "reg_123",
          email: "test@example.com",
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
    type Product = { id: string; title: string }

    type ProductListParams = {
      limit: number
      offset: number
      region_id?: string
    }

    type ProductDetailParams = {
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
        region_id: input.region_id,
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
            products,
            count: 4,
            limit,
            offset,
          })
        })
      )

      const service: ProductService<Product, ProductListParams, ProductDetailParams> = {
        getProducts: async (params) => {
          const query = new URLSearchParams({
            limit: String(params.limit),
            offset: String(params.offset),
            region_id: params.region_id ?? "",
          })
          const response = await fetch(`${baseUrl}/products?${query}`)
          return response.json()
        },
        getProductByHandle: async () => null,
      }

      const queryKeyNamespace = "smoke-products"
      const { useInfiniteProducts } = createProductHooks({
        service,
        buildListParams,
        queryKeyNamespace,
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

      const listParams = buildListParams({ page: 1, limit: 2 })
      queryClient.setQueryData(queryKeys.list(listParams), {
        products: [],
        count: 4,
        limit: 2,
        offset: 0,
      })

      const wrapper = createWrapper(queryClient)
      const { result } = renderHook(
        () =>
          useInfiniteProducts({
            page: 1,
            limit: 2,
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
        expect(result.current.products.length).toBe(4)
      })

      expect(offsets).toEqual([0, 2])
    })
  })

  describe("orders", () => {
    type Order = { id: string }

    type OrderListParams = {
      limit: number
      offset: number
    }

    type OrderDetailParams = {
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
    ): OrderDetailParams => ({ id: input.id })

    it("fetches order list and detail", async () => {
      server.use(
        http.get(`${baseUrl}/orders`, ({ request }) => {
          const url = new URL(request.url)
          const limit = Number(url.searchParams.get("limit") ?? "0")
          const offset = Number(url.searchParams.get("offset") ?? "0")
          return HttpResponse.json({
            orders: [{ id: "order_1" }],
            count: 1,
            limit,
            offset,
          })
        }),
        http.get(`${baseUrl}/orders/:id`, ({ params }) => {
          return HttpResponse.json({ order: { id: String(params.id) } })
        })
      )

      const service: OrderService<Order, OrderListParams, OrderDetailParams> = {
        getOrders: async (params) => {
          const query = new URLSearchParams({
            limit: String(params.limit),
            offset: String(params.offset),
          })
          const response = await fetch(`${baseUrl}/orders?${query}`)
          return response.json()
        },
        getOrder: async (params) => {
          const response = await fetch(`${baseUrl}/orders/${params.id}`)
          const data = await response.json()
          return data.order as Order
        },
      }

      const { useOrders, useOrder } = createOrderHooks({
        service,
        buildListParams,
        buildDetailParams,
        queryKeyNamespace: "smoke-orders",
      })

      const queryClient = createTestClient({
        defaultOptions: { queries: { retry: false } },
      })

      const wrapper = createWrapper(queryClient)

      const listHook = renderHook(
        () => useOrders({ page: 1, limit: 1 }),
        { wrapper }
      )

      await waitFor(() => {
        expect(listHook.result.current.isSuccess).toBe(true)
      })

      expect(listHook.result.current.orders).toHaveLength(1)

      const detailHook = renderHook(
        () => useOrder({ id: "order_1" }),
        { wrapper }
      )

      await waitFor(() => {
        expect(detailHook.result.current.order?.id).toBe("order_1")
      })
    })
  })

  describe("customers", () => {
    type Address = { id: string; address_1?: string }
    type Customer = { id: string }

    type ListParams = Record<string, never>
    type CreateParams = { address_1?: string }
    type UpdateParams = { address_1?: string }
    type UpdateCustomerParams = { metadata?: Record<string, unknown> }

    let lastCreateBody: CreateParams | null = null
    let lastUpdateBody: Record<string, unknown> | null = null

    beforeEach(() => {
      lastCreateBody = null
      lastUpdateBody = null
      server.use(
        http.get(`${baseUrl}/customers/me/addresses`, () => {
          return HttpResponse.json({ addresses: [{ id: "addr_1", address_1: "Main" }] })
        }),
        http.post(`${baseUrl}/customers/me/addresses`, async ({ request }) => {
          lastCreateBody = (await request.json()) as CreateParams
          return HttpResponse.json({ address: { id: "addr_2", address_1: "New" } })
        }),
        http.post(`${baseUrl}/customers/me/addresses/:id`, async ({ request, params }) => {
          lastUpdateBody = (await request.json()) as Record<string, unknown>
          return HttpResponse.json({ address: { id: String(params.id), address_1: "Updated" } })
        }),
        http.delete(`${baseUrl}/customers/me/addresses/:id`, () => {
          return HttpResponse.json({})
        }),
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
        getAddresses: async () => {
          const response = await fetch(`${baseUrl}/customers/me/addresses`)
          return response.json()
        },
        createAddress: async (params) => {
          const response = await fetch(`${baseUrl}/customers/me/addresses`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(params),
          })
          const data = await response.json()
          return data.address as Address
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
        deleteAddress: async (addressId) => {
          await fetch(`${baseUrl}/customers/me/addresses/${addressId}`, {
            method: "DELETE",
          })
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
        service,
        buildListParams: () => ({}),
        queryKeyNamespace: "smoke-customers",
      })

      const queryClient = createTestClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })
      const wrapper = createWrapper(queryClient)

      const listHook = renderHook(
        () => useCustomerAddresses({} as CustomerAddressListInputBase),
        { wrapper }
      )

      await waitFor(() => {
        expect(listHook.result.current.isSuccess).toBe(true)
      })

      expect(listHook.result.current.addresses).toHaveLength(1)

      const createHook = renderHook(() => useCreateCustomerAddress(), { wrapper })

      await act(async () => {
        await createHook.result.current.mutateAsync({ address_1: "New" })
      })

      expect(lastCreateBody?.address_1).toBe("New")

      const updateHook = renderHook(() => useUpdateCustomerAddress(), { wrapper })

      await act(async () => {
        await updateHook.result.current.mutateAsync({
          addressId: "addr_1",
          address_1: "Updated",
        })
      })

      expect(lastUpdateBody?.addressId).toBeUndefined()

      const deleteHook = renderHook(() => useDeleteCustomerAddress(), { wrapper })

      await act(async () => {
        await deleteHook.result.current.mutateAsync({ addressId: "addr_1" })
      })

      const updateCustomerHook = renderHook(() => useUpdateCustomer(), { wrapper })

      await act(async () => {
        await updateCustomerHook.result.current.mutateAsync({
          metadata: { company: "QA" },
        })
      })

      expect(lastUpdateBody?.metadata).toEqual({ company: "QA" })
    })
  })
})
