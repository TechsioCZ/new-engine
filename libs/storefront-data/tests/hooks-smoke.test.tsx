import { QueryClient } from "@tanstack/react-query"
import { isRecord } from "@techsio/std/object"
import { act, renderHook, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import type { ReactNode } from "react"
import { it, afterEach, expect, describe, beforeEach } from "vitest"

import { createCartHooks } from "../src/cart/hooks"
import { createCartQueryKeys } from "../src/cart/query-keys"
import type { CartService, UpdateCartInputBase } from "../src/cart/types"
import { StorefrontDataProvider } from "../src/client/provider"
import { createCustomerHooks } from "../src/customers/hooks"
import type { CustomerService } from "../src/customers/types"
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

const createWrapper = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <StorefrontDataProvider client={client}>{children}</StorefrontDataProvider>
  )
  return Wrapper
}

const trackedClients: QueryClient[] = []

const createTestClient = (
  config?: ConstructorParameters<typeof QueryClient>[0],
) => {
  const client = new QueryClient(config)
  trackedClients.push(client)
  return client
}

// ---- Cart address helper fixtures -----------------------------------------

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

interface CartUpdateParams {
  email?: string
  region_id?: string
  shipping_address?: AddressPayload
  billing_address?: AddressPayload
}

type UpdateInput = UpdateCartInputBase &
  CartUpdateParams & {
    shippingAddress: AddressInput
    billingAddress?: AddressInput
    useSameAddress?: boolean
  }

const isCartAddressPayload = (value: unknown): value is AddressPayload => {
  if (!isRecord(value)) {
    return false
  }
  const { company } = value
  const hasRequiredStrings =
    typeof value["first_name"] === "string" &&
    typeof value["last_name"] === "string" &&
    typeof value["address_1"] === "string"
  const hasLocationStrings =
    typeof value["city"] === "string" &&
    typeof value["postal_code"] === "string" &&
    typeof value["country_code"] === "string"
  const hasValidCompany = company === undefined || typeof company === "string"
  return hasRequiredStrings && hasLocationStrings && hasValidCompany
}

const isCart = (value: unknown): value is Cart => {
  if (!isRecord(value)) {
    return false
  }
  const regionId = value["region_id"]
  const shippingAddress = value["shipping_address"]
  const billingAddress = value["billing_address"]
  const hasValidId = typeof value["id"] === "string"
  const hasValidRegionId =
    regionId === undefined || regionId === null || typeof regionId === "string"
  const hasValidShippingAddress =
    shippingAddress === undefined || isCartAddressPayload(shippingAddress)
  const hasValidBillingAddress =
    billingAddress === undefined || isCartAddressPayload(billingAddress)
  const hasValidAddresses = hasValidShippingAddress && hasValidBillingAddress
  return hasValidId && hasValidRegionId && hasValidAddresses
}

const isCartUpdateParams = (value: unknown): value is CartUpdateParams => {
  if (!isRecord(value)) {
    return false
  }
  const { email } = value
  const regionId = value["region_id"]
  const shippingAddress = value["shipping_address"]
  const billingAddress = value["billing_address"]
  const hasValidEmail = email === undefined || typeof email === "string"
  const hasValidRegionId =
    regionId === undefined || typeof regionId === "string"
  const hasValidShippingAddress =
    shippingAddress === undefined || isCartAddressPayload(shippingAddress)
  const hasValidBillingAddress =
    billingAddress === undefined || isCartAddressPayload(billingAddress)
  const hasValidStrings = hasValidEmail && hasValidRegionId
  const hasValidAddresses = hasValidShippingAddress && hasValidBillingAddress
  return hasValidStrings && hasValidAddresses
}

const buildUpdateParams = (input: UpdateInput): CartUpdateParams => ({
  ...(input.email !== undefined && input.email !== ""
    ? { email: input.email }
    : {}),
  ...(input.region_id !== undefined && input.region_id !== ""
    ? { region_id: input.region_id }
    : {}),
  ...(input.shipping_address
    ? { shipping_address: input.shipping_address }
    : {}),
  ...(input.billing_address ? { billing_address: input.billing_address } : {}),
})

const buildAddressPayload = (input: AddressInput): AddressPayload => ({
  address_1: input.address1,
  city: input.city,
  country_code: input.countryCode,
  first_name: input.firstName,
  last_name: input.lastName,
  postal_code: input.postalCode,
  ...(input.company !== undefined && input.company !== ""
    ? { company: input.company }
    : {}),
})

// ---- Product list fixtures -------------------------------------------------

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

const isProduct = (value: unknown): value is Product =>
  isRecord(value) &&
  typeof value["id"] === "string" &&
  typeof value["title"] === "string"

const isProductListResponse = (
  value: unknown,
): value is {
  products: Product[]
  count: number
  limit: number
  offset: number
} => {
  if (!isRecord(value)) {
    return false
  }
  const { products } = value
  const hasValidProducts = Array.isArray(products) && products.every(isProduct)
  const hasValidNumbers =
    typeof value["count"] === "number" &&
    typeof value["limit"] === "number" &&
    typeof value["offset"] === "number"
  return hasValidProducts && hasValidNumbers
}

const buildListParams = (input: ProductListInputBase): ProductListParams => {
  const limit = input.limit ?? 2
  const page = input.page ?? 1
  const offset = (page - 1) * limit

  return {
    limit,
    offset,
    ...(input.region_id !== undefined && input.region_id !== ""
      ? { region_id: input.region_id }
      : {}),
  }
}

// ---- Order fixtures ---------------------------------------------------------

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

const isOrder = (value: unknown): value is Order =>
  isRecord(value) && typeof value["id"] === "string"

const isOrderListResponse = (
  value: unknown,
): value is { orders: Order[]; count: number } => {
  if (!isRecord(value)) {
    return false
  }
  const { orders } = value
  return (
    Array.isArray(orders) &&
    orders.every(isOrder) &&
    typeof value["count"] === "number"
  )
}

const buildOrderListParams = (input: OrderListInputBase): OrderListParams => {
  const limit = input.limit ?? 20
  const page = input.page ?? 1
  const offset = (page - 1) * limit
  return { limit, offset }
}

const buildDetailParams = (input: OrderDetailInputBase): OrderDetailParams => {
  if (input.id === undefined || input.id === "") {
    throw new Error("Order id is required for order queries")
  }
  return { id: input.id }
}

// ---- Customer fixtures -------------------------------------------------------

interface Address {
  id: string
  address_1?: string
}
interface Customer {
  id: string
}

interface CreateParams {
  address_1?: string
}

const isAddress = (value: unknown): value is Address => {
  if (!isRecord(value)) {
    return false
  }
  const address1 = value["address_1"]
  return (
    typeof value["id"] === "string" &&
    (address1 === undefined || typeof address1 === "string")
  )
}

const isCustomer = (value: unknown): value is Customer =>
  isRecord(value) && typeof value["id"] === "string"

const isCreateParams = (value: unknown): value is CreateParams => {
  if (!isRecord(value)) {
    return false
  }
  const address1 = value["address_1"]
  return address1 === undefined || typeof address1 === "string"
}

const isCustomerAddressListResponse = (
  value: unknown,
): value is { addresses: Address[] } => {
  if (!isRecord(value)) {
    return false
  }
  const { addresses } = value
  return Array.isArray(addresses) && addresses.every(isAddress)
}

describe("storefront-data hook smoke tests", () => {
  afterEach(() => {
    for (const client of trackedClients) {
      client.clear()
    }
    trackedClients.length = 0
  })

  const baseUrl = "https://storefront.test"

  describe("cart address helper", () => {
    let lastUpdatePayload: CartUpdateParams | null = null

    beforeEach(() => {
      lastUpdatePayload = null
      server.use(
        http.post(`${baseUrl}/carts/:cartId`, async ({ request, params }) => {
          const rawPayload: unknown = await request.json()
          if (!isCartUpdateParams(rawPayload)) {
            throw new TypeError("Invalid cart update payload")
          }
          lastUpdatePayload = rawPayload
          return HttpResponse.json({
            cart: {
              billing_address: rawPayload.billing_address,
              id: String(params["cartId"]),
              region_id: rawPayload.region_id ?? null,
              shipping_address: rawPayload.shipping_address,
            },
          })
        }),
      )
    })

    it("maps shipping and billing addresses", async () => {
      const cartService: CartService<
        Cart,
        CartUpdateParams,
        CartUpdateParams,
        never,
        never,
        unknown
      > = {
        createCart: async () => {
          await Promise.resolve()
          return { id: "cart_test" }
        },
        retrieveCart: async () => {
          await Promise.resolve()
          return null
        },
        updateCart: async (cartId, params) => {
          const response = await fetch(`${baseUrl}/carts/${cartId}`, {
            body: JSON.stringify(params),
            headers: { "content-type": "application/json" },
            method: "POST",
          })
          const data: unknown = await response.json()
          if (!isRecord(data)) {
            throw new TypeError("Invalid cart response")
          }
          const { cart } = data
          if (!isCart(cart)) {
            throw new TypeError("Invalid cart response")
          }
          return cart
        },
      }

      const cartQueryKeys = createCartQueryKeys("smoke-cart")

      const { useUpdateCartAddress } = createCartHooks<
        Cart,
        UpdateInput,
        CartUpdateParams,
        UpdateInput,
        CartUpdateParams,
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
            address1: input.address1.trim(),
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
          }),
          toPayload: (input) => buildAddressPayload(input),
          validate: (input, context) => {
            const issues: StorefrontAddressValidationIssue[] = []
            if (!input.firstName) {
              issues.push({
                code: "required",
                field: "firstName",
                message: "first name required",
                scope: context.scope,
              })
            }
            if (!input.lastName) {
              issues.push({
                code: "required",
                field: "lastName",
                message: "last name required",
                scope: context.scope,
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
        }),
      )

      expect(cachedCart?.id).toBe("cart_123")
    })
  })

  describe("infinite products", () => {
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
        }),
      )

      const service: ProductService<
        Product,
        ProductListParams,
        ProductDetailParams
      > = {
        getProductByHandle: async () => {
          await Promise.resolve()
          return null
        },
        getProducts: async (params) => {
          const query = new URLSearchParams({
            limit: String(params.limit),
            offset: String(params.offset),
            region_id: params.region_id ?? "",
          })
          const response = await fetch(`${baseUrl}/products?${query}`)
          const data: unknown = await response.json()
          if (!isProductListResponse(data)) {
            throw new TypeError("Invalid products list response")
          }
          return data
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
        { wrapper },
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
        }),
      )

      const service: ProductService<
        Product,
        ProductListParams,
        ProductDetailParams
      > = {
        getProductByHandle: async () => {
          await Promise.resolve()
          return null
        },
        getProducts: async (params) => {
          const query = new URLSearchParams({
            limit: String(params.limit),
            offset: String(params.offset),
            region_id: params.region_id ?? "",
          })
          const response = await fetch(`${baseUrl}/products?${query}`)
          const data: unknown = await response.json()
          if (!isProductListResponse(data)) {
            throw new TypeError("Invalid products list response")
          }
          return data
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
        { wrapper },
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
          HttpResponse.json({ order: { id: String(params["id"]) } }),
        ),
      )

      const service: OrderService<Order, OrderListParams, OrderDetailParams> = {
        getOrder: async (params) => {
          const response = await fetch(`${baseUrl}/orders/${params.id}`)
          const data: unknown = await response.json()
          if (!isRecord(data)) {
            throw new TypeError("Invalid order response")
          }
          const { order } = data
          if (!isOrder(order)) {
            throw new TypeError("Invalid order response")
          }
          return order
        },
        getOrders: async (params) => {
          const query = new URLSearchParams({
            limit: String(params.limit),
            offset: String(params.offset),
          })
          const response = await fetch(`${baseUrl}/orders?${query}`)
          const data: unknown = await response.json()
          if (!isOrderListResponse(data)) {
            throw new TypeError("Invalid orders list response")
          }
          return data
        },
      }

      const { useOrders, useOrder } = createOrderHooks({
        buildDetailParams,
        buildListParams: buildOrderListParams,
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
    type ListParams = Record<string, never>
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
          }),
        ),
        http.post(`${baseUrl}/customers/me/addresses`, async ({ request }) => {
          const rawBody: unknown = await request.json()
          if (!isCreateParams(rawBody)) {
            throw new TypeError("Invalid create address payload")
          }
          lastCreateBody = rawBody
          return HttpResponse.json({
            address: { address_1: "New", id: "addr_2" },
          })
        }),
        http.post(
          `${baseUrl}/customers/me/addresses/:id`,
          async ({ request, params }) => {
            const rawBody: unknown = await request.json()
            if (!isRecord(rawBody)) {
              throw new TypeError("Invalid update address payload")
            }
            lastUpdateBody = rawBody
            return HttpResponse.json({
              address: { address_1: "Updated", id: String(params["id"]) },
            })
          },
        ),
        http.delete(`${baseUrl}/customers/me/addresses/:id`, () =>
          HttpResponse.json({}),
        ),
        http.post(`${baseUrl}/customers/me`, async ({ request }) => {
          const rawBody: unknown = await request.json()
          if (!isRecord(rawBody)) {
            throw new TypeError("Invalid update customer payload")
          }
          lastUpdateBody = rawBody
          return HttpResponse.json({ customer: { id: "cust_1" } })
        }),
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
            body: JSON.stringify(params),
            headers: { "content-type": "application/json" },
            method: "POST",
          })
          const data: unknown = await response.json()
          if (!isRecord(data)) {
            throw new TypeError("Invalid address response")
          }
          const { address } = data
          if (!isAddress(address)) {
            throw new TypeError("Invalid address response")
          }
          return address
        },
        deleteAddress: async (addressId) => {
          await fetch(`${baseUrl}/customers/me/addresses/${addressId}`, {
            method: "DELETE",
          })
        },
        getAddresses: async () => {
          const response = await fetch(`${baseUrl}/customers/me/addresses`)
          const data: unknown = await response.json()
          if (!isCustomerAddressListResponse(data)) {
            throw new TypeError("Invalid addresses list response")
          }
          return data
        },
        updateAddress: async (addressId, params) => {
          const response = await fetch(
            `${baseUrl}/customers/me/addresses/${addressId}`,
            {
              body: JSON.stringify(params),
              headers: { "content-type": "application/json" },
              method: "POST",
            },
          )
          const data: unknown = await response.json()
          if (!isRecord(data)) {
            throw new TypeError("Invalid address response")
          }
          const { address } = data
          if (!isAddress(address)) {
            throw new TypeError("Invalid address response")
          }
          return address
        },
        updateCustomer: async (params) => {
          const response = await fetch(`${baseUrl}/customers/me`, {
            body: JSON.stringify(params),
            headers: { "content-type": "application/json" },
            method: "POST",
          })
          const data: unknown = await response.json()
          if (!isRecord(data)) {
            throw new TypeError("Invalid customer response")
          }
          const { customer } = data
          if (!isCustomer(customer)) {
            throw new TypeError("Invalid customer response")
          }
          return customer
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
