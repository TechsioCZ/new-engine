import type { MedusaContainer } from "@medusajs/framework/types"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { isRecord } from "@techsio/std/object"
import { hasTrimmedString } from "@techsio/std/string"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  adminHeaders,
  createAdminUser,
  createStoreUser,
} from "../../utils/admin"
import { getHttpError } from "../../utils/http-error"
import {
  cartSeeder,
  productSeeder,
  regionSeeder,
  salesChannelSeeder,
} from "../../utils/seeder"
import { generatePublishableKey, generateStoreHeaders } from "../../utils/store"

interface TestHeaders {
  headers: Record<string, string>
}

interface TestHttpResponse {
  data: unknown
  status: number
}

interface TestApiClient {
  get: (url: string, config?: TestHeaders) => Promise<TestHttpResponse>
  post: (
    url: string,
    body?: unknown,
    config?: TestHeaders,
  ) => Promise<TestHttpResponse>
}

interface TestSuiteOptions {
  api: TestApiClient
  getContainer: () => MedusaContainer
}

type HttpErrorResult = ReturnType<typeof getHttpError>

interface TestEntity {
  id: string
}

interface TestQuoteRef {
  draft_order_id: string
  id: string
}

interface TestCartItem {
  quantity: number
  unit_price: number
}

interface TestCart {
  firstItem: TestCartItem
  id: string
}

interface TestProduct {
  firstVariantId: string
}

const asRecord = (value: unknown, context: string): Record<string, unknown> => {
  if (!isRecord(value)) {
    throw new TypeError(`Expected an object for ${context}`)
  }
  return value
}

const asString = (value: unknown, context: string): string => {
  if (!hasTrimmedString(value)) {
    throw new TypeError(`Expected a non-empty string for ${context}`)
  }
  return value
}

const asNumber = (value: unknown, context: string): number => {
  if (typeof value !== "number") {
    throw new TypeError(`Expected a number for ${context}`)
  }
  return value
}

const asArray = (value: unknown, context: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw new TypeError(`Expected an array for ${context}`)
  }
  return value
}

const firstOf = (values: unknown[], context: string): unknown => {
  const [value] = values
  if (value === undefined) {
    throw new Error(`Expected at least one entry in ${context}`)
  }
  return value
}

const asEntity = (value: unknown, context: string): TestEntity => ({
  id: asString(asRecord(value, context)["id"], `${context}.id`),
})

const asTestCart = (value: unknown, context: string): TestCart => {
  const record = asRecord(value, context)
  const itemRecord = asRecord(
    firstOf(asArray(record["items"], `${context}.items`), `${context}.items`),
    `${context}.items entry`,
  )
  return {
    firstItem: {
      quantity: asNumber(
        itemRecord["quantity"],
        `${context}.items entry.quantity`,
      ),
      unit_price: asNumber(
        itemRecord["unit_price"],
        `${context}.items entry.unit_price`,
      ),
    },
    id: asString(record["id"], `${context}.id`),
  }
}

const asTestProduct = (value: unknown, context: string): TestProduct => {
  const record = asRecord(value, context)
  const variantRecord = asRecord(
    firstOf(
      asArray(record["variants"], `${context}.variants`),
      `${context}.variants`,
    ),
    `${context}.variants entry`,
  )
  return {
    firstVariantId: asString(
      variantRecord["id"],
      `${context}.variants entry.id`,
    ),
  }
}

const getQuoteRecord = (
  data: unknown,
  context: string,
): Record<string, unknown> =>
  asRecord(asRecord(data, context)["quote"], `${context}.quote`)

const getQuoteRef = (data: unknown, context: string): TestQuoteRef => {
  const quote = getQuoteRecord(data, context)
  return {
    draft_order_id: asString(
      quote["draft_order_id"],
      `${context}.quote.draft_order_id`,
    ),
    id: asString(quote["id"], `${context}.quote.id`),
  }
}

const getQuotesRecordArray = (
  data: unknown,
  context: string,
): Record<string, unknown>[] => {
  const quotes = asArray(asRecord(data, context)["quotes"], `${context}.quotes`)
  return quotes.map((quote) => asRecord(quote, `${context}.quotes entry`))
}

const requestError = async (
  request: Promise<TestHttpResponse>,
  context: string,
): Promise<HttpErrorResult> => {
  try {
    await request
  } catch (error) {
    return getHttpError(error)
  }
  throw new Error(`Expected ${context} to reject with an HTTP error`)
}

vi.setConfig({ testTimeout: 60 * 1000 })

medusaIntegrationTestRunner({
  env: {},
  inApp: true,
  testSuite: ({ api, getContainer }: TestSuiteOptions) => {
    let storeHeaders: TestHeaders
    let cart: TestCart
    let product: TestProduct
    let salesChannel: TestEntity
    let region: TestEntity
    let customerToken: string

    beforeEach(async () => {
      const container = getContainer()
      await createAdminUser(adminHeaders, container)
      const publishableKey = await generatePublishableKey(container)
      storeHeaders = {
        headers: { ...generateStoreHeaders({ publishableKey }).headers },
      }
      const res = await createStoreUser({ api, storeHeaders })
      customerToken = asString(res.token, "createStoreUser result token")
      storeHeaders.headers["Authorization"] = `Bearer ${customerToken}`
      region = asEntity(
        await regionSeeder({ adminHeaders, api, data: {} }),
        "regionSeeder result",
      )

      salesChannel = asEntity(
        await salesChannelSeeder({
          adminHeaders,
          api,
          data: {},
        }),
        "salesChannelSeeder result",
      )

      product = asTestProduct(
        await productSeeder({
          adminHeaders,
          api,
          data: {
            sales_channels: [{ id: salesChannel.id }],
          },
        }),
        "productSeeder result",
      )

      await api.post(
        `/admin/api-keys/${publishableKey.id}/sales-channels`,
        { add: [salesChannel.id] },
        adminHeaders,
      )

      cart = asTestCart(
        await cartSeeder({
          api,
          data: {
            items: [{ quantity: 1, variant_id: product.firstVariantId }],
            region_id: region.id,
            sales_channel_id: salesChannel.id,
          },
          storeHeaders,
        }),
        "cartSeeder result",
      )
    })

    describe("POST /store/quotes", () => {
      it("successfully initiates a quote with a draft order", async () => {
        const response = await api.post(
          "/store/quotes",
          { cart_id: cart.id },
          storeHeaders,
        )
        const quoteRecord = getQuoteRecord(
          response.data,
          "POST /store/quotes response",
        )

        const draftOrderMatcher: Record<string, unknown> = {
          items: [
            expect.objectContaining({
              quantity: cart.firstItem.quantity,
              unit_price: cart.firstItem.unit_price,
            }),
          ],
          status: "draft",
          summary: expect.objectContaining({
            current_order_total: 100,
            original_order_total: 100,
            paid_total: 0,
            pending_difference: 100,
            refunded_total: 0,
            transaction_total: 0,
          }),
          version: 1,
        }
        const expected: Record<string, unknown> = {
          cart_id: cart.id,
          draft_order: expect.objectContaining(draftOrderMatcher),
          draft_order_id: expect.any(String),
          id: expect.any(String),
          order_change: expect.objectContaining({
            actions: [],
          }),
        }

        expect(response.status).toBe(200)
        expect(quoteRecord).toStrictEqual(expect.objectContaining(expected))
      })
    })

    describe("GET /store/quotes/:id", () => {
      it("successfully retrieves a quote", async () => {
        const created = await api.post(
          "/store/quotes",
          { cart_id: cart.id },
          storeHeaders,
        )
        const newQuote = getQuoteRef(
          created.data,
          "POST /store/quotes response",
        )

        const retrieved = await api.get(
          `/store/quotes/${newQuote.id}`,
          storeHeaders,
        )
        const quoteRecord = getQuoteRecord(
          retrieved.data,
          "GET /store/quotes/:id response",
        )

        const expected: Record<string, unknown> = {
          cart: expect.objectContaining({
            id: cart.id,
          }),
          draft_order: expect.objectContaining({
            id: newQuote.draft_order_id,
          }),
          id: expect.any(String),
        }

        expect(quoteRecord).toStrictEqual(expect.objectContaining(expected))
      })

      it("should throw error when quote does not exist", async () => {
        const httpError = await requestError(
          api.get("/store/quotes/does-not-exist", storeHeaders),
          "GET /store/quotes/does-not-exist",
        )

        expect(httpError.response.data).toStrictEqual({
          message: "Quote id not found: does-not-exist",
          type: "not_found",
        })
      })
    })

    describe("GET /store/quotes", () => {
      let cart2: TestCart

      beforeEach(async () => {
        cart2 = asTestCart(
          await cartSeeder({
            api,
            data: {
              items: [{ quantity: 1, variant_id: product.firstVariantId }],
              region_id: region.id,
              sales_channel_id: salesChannel.id,
            },
            storeHeaders,
          }),
          "cartSeeder result (cart2)",
        )
      })

      it("successfully retrieves all quote for a customer", async () => {
        const created1 = await api.post(
          "/store/quotes",
          { cart_id: cart.id },
          storeHeaders,
        )
        const quote1 = getQuoteRef(
          created1.data,
          "POST /store/quotes response (quote1)",
        )

        const created2 = await api.post(
          "/store/quotes",
          { cart_id: cart2.id },
          storeHeaders,
        )
        const quote2 = getQuoteRef(
          created2.data,
          "POST /store/quotes response (quote2)",
        )

        const listed = await api.get("/store/quotes", storeHeaders)
        const quotes = getQuotesRecordArray(
          listed.data,
          "GET /store/quotes response",
        )

        const quote1Matcher: Record<string, unknown> = {
          cart: expect.objectContaining({
            id: cart.id,
          }),
          draft_order: expect.objectContaining({
            id: quote1.draft_order_id,
          }),
          id: quote1.id,
        }
        const quote2Matcher: Record<string, unknown> = {
          cart: expect.objectContaining({
            id: cart2.id,
          }),
          draft_order: expect.objectContaining({
            id: quote2.draft_order_id,
          }),
          id: quote2.id,
        }

        expect(quotes).toStrictEqual(
          expect.arrayContaining([
            expect.objectContaining(quote1Matcher),
            expect.objectContaining(quote2Matcher),
          ]),
        )
      })
    })

    describe("POST /store/quotes/:id/accept", () => {
      let quote1: TestQuoteRef

      beforeEach(async () => {
        const created = await api.post(
          "/store/quotes",
          { cart_id: cart.id },
          storeHeaders,
        )
        quote1 = getQuoteRef(created.data, "POST /store/quotes response")
      })

      it("successfully accepts a quote", async () => {
        await api.post(`/admin/quotes/${quote1.id}/send`, {}, adminHeaders)

        const accepted = await api.post(
          `/store/quotes/${quote1.id}/accept?fields=+draft_order.is_draft_order,+draft_order.status`,
          {},
          storeHeaders,
        )
        const quoteRecord = getQuoteRecord(
          accepted.data,
          "POST /store/quotes/:id/accept response",
        )

        const draftOrderMatcher: Record<string, unknown> = {
          id: quote1.draft_order_id,
          is_draft_order: false,
          payment_collections: [
            expect.objectContaining({
              amount: 100,
            }),
          ],
          status: "pending",
          summary: expect.objectContaining({
            pending_difference: 100,
          }),
        }
        const expected: Record<string, unknown> = {
          draft_order: expect.objectContaining(draftOrderMatcher),
          id: quote1.id,
        }

        expect(quoteRecord).toStrictEqual(expect.objectContaining(expected))
      })

      it("should throw an error when quote is already accepted", async () => {
        await api.post(`/admin/quotes/${quote1.id}/send`, {}, adminHeaders)
        await api.post(`/store/quotes/${quote1.id}/accept`, {}, storeHeaders)

        const httpError = await requestError(
          api.post(`/store/quotes/${quote1.id}/accept`, {}, storeHeaders),
          `POST /store/quotes/${quote1.id}/accept second attempt`,
        )

        expect(httpError.response.data).toStrictEqual({
          message: "Cannot accept quote when quote status is accepted",
          type: "invalid_data",
        })
      })
    })

    describe("POST /store/quotes/:id/reject", () => {
      let quote1: TestQuoteRef

      beforeEach(async () => {
        const created = await api.post(
          "/store/quotes",
          { cart_id: cart.id },
          storeHeaders,
        )
        quote1 = getQuoteRef(created.data, "POST /store/quotes response")
      })

      it("successfully rejects a quote", async () => {
        await api.post(`/admin/quotes/${quote1.id}/send`, {}, adminHeaders)

        const rejected = await api.post(
          `/store/quotes/${quote1.id}/reject?fields=+draft_order.status`,
          {},
          storeHeaders,
        )
        const quoteRecord = getQuoteRecord(
          rejected.data,
          "POST /store/quotes/:id/reject response",
        )

        expect(quoteRecord).toStrictEqual(
          expect.objectContaining({
            id: quote1.id,
            status: "customer_rejected",
          }),
        )
      })
    })
  },
})
