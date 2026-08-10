import type { MedusaContainer } from "@medusajs/framework/types"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { getRecordValue, isRecord } from "@techsio/std/object"
import { hasTrimmedString } from "@techsio/std/string"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  adminHeaders,
  createAdminUser,
  createStoreUser,
} from "../../../utils/admin"
import {
  cartSeeder,
  productSeeder,
  regionSeeder,
  salesChannelSeeder,
} from "../../../utils/seeder"
import {
  generatePublishableKey,
  generateStoreHeaders,
} from "../../../utils/store"

interface TestHeaders {
  headers: Record<string, string>
}

interface TestHttpResponse {
  data: unknown
  status: number
}

interface TestApiClient {
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

interface TestEntity {
  id: string
}

interface TestCart {
  firstItemId: string
  id: string
}

interface TestProduct {
  firstVariantId: string
}

const asRecord = (value: unknown, context: string) => {
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
  id: asString(getRecordValue(asRecord(value, context), "id"), `${context}.id`),
})

const asTestCart = (value: unknown, context: string): TestCart => {
  const record = asRecord(value, context)
  const itemRecord = asRecord(
    firstOf(
      asArray(getRecordValue(record, "items"), `${context}.items`),
      `${context}.items`,
    ),
    `${context}.items entry`,
  )
  return {
    firstItemId: asString(
      getRecordValue(itemRecord, "id"),
      `${context}.items entry.id`,
    ),
    id: asString(getRecordValue(record, "id"), `${context}.id`),
  }
}

const asTestProduct = (value: unknown, context: string): TestProduct => {
  const record = asRecord(value, context)
  const variantRecord = asRecord(
    firstOf(
      asArray(getRecordValue(record, "variants"), `${context}.variants`),
      `${context}.variants`,
    ),
    `${context}.variants entry`,
  )
  return {
    firstVariantId: asString(
      getRecordValue(variantRecord, "id"),
      `${context}.variants entry.id`,
    ),
  }
}

const getQuoteRecord = (data: unknown, context: string) =>
  asRecord(getRecordValue(asRecord(data, context), "quote"), `${context}.quote`)

const objectMatcher = (value: object): unknown => expect.objectContaining(value)
const anyStringMatcher = (): unknown => expect.any(String)

vi.setConfig({ testTimeout: 60 * 1000 })

medusaIntegrationTestRunner({
  env: {
    JWT_SECRET: "supersecret",
  },
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

    describe("POST /admin/quotes/:id/messages", () => {
      let quote1: TestEntity

      beforeEach(async () => {
        const created = await api.post(
          "/store/quotes",
          { cart_id: cart.id },
          storeHeaders,
        )
        quote1 = asEntity(
          getQuoteRecord(created.data, "POST /store/quotes response"),
          "POST /store/quotes response quote",
        )
      })

      it("successfully creates an admin quote message", async () => {
        const response = await api.post(
          `/admin/quotes/${quote1.id}/messages`,
          {
            item_id: cart.firstItemId,
            text: "test message",
          },
          adminHeaders,
        )
        const quoteRecord = getQuoteRecord(
          response.data,
          "POST /admin/quotes/:id/messages response",
        )

        const messageMatcher = {
          admin_id: anyStringMatcher(),
          customer_id: null,
          item_id: cart.firstItemId,
          text: "test message",
        }
        const expected = {
          id: quote1.id,
          messages: [objectMatcher(messageMatcher)],
        }

        expect(quoteRecord).toStrictEqual(objectMatcher(expected))
      })
    })
  },
})
