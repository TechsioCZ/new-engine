import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { vi, beforeEach, describe, expect, it } from "vitest"

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

type TestValue = any

vi.setConfig({ testTimeout: 60 * 1000 })

medusaIntegrationTestRunner({
  env: {
    JWT_SECRET: "supersecret",
  },
  inApp: true,
  testSuite: ({ api, getContainer }) => {
    let storeHeaders: TestValue
    let cart: TestValue
    let product: TestValue
    let salesChannel: TestValue
    let region: TestValue
    let customerToken: TestValue

    beforeEach(async () => {
      const container = getContainer()
      await createAdminUser(adminHeaders, container)
      const publishableKey = await generatePublishableKey(container)
      storeHeaders = generateStoreHeaders({ publishableKey })
      const res = await createStoreUser({ api, storeHeaders })
      customerToken = res.token
      storeHeaders.headers.Authorization = `Bearer ${customerToken}`
      region = await regionSeeder({ adminHeaders, api, data: {} })

      salesChannel = await salesChannelSeeder({
        adminHeaders,
        api,
        data: {},
      })

      product = await productSeeder({
        adminHeaders,
        api,
        data: {
          sales_channels: [{ id: salesChannel.id }],
        },
      })

      await api.post(
        `/admin/api-keys/${publishableKey.id}/sales-channels`,
        { add: [salesChannel.id] },
        adminHeaders,
      )

      cart = await cartSeeder({
        api,
        data: {
          items: [{ quantity: 1, variant_id: product.variants[0].id }],
          region_id: region.id,
          sales_channel_id: salesChannel.id,
        },
        storeHeaders,
      })
    })

    describe("POST /admin/quotes/:id/messages", () => {
      let quote1: TestValue

      beforeEach(async () => {
        const {
          data: { quote: newQuote },
        } = await api.post("/store/quotes", { cart_id: cart.id }, storeHeaders)

        quote1 = newQuote
      })

      it("successfully creates an admin quote message", async () => {
        const {
          data: { quote },
        } = await api.post(
          `/admin/quotes/${quote1.id}/messages`,
          {
            item_id: cart.items[0].id,
            text: "test message",
          },
          adminHeaders,
        )

        expect(quote).toStrictEqual(
          expect.objectContaining({
            id: quote1.id,
            messages: [
              expect.objectContaining({
                admin_id: expect.any(String),
                customer_id: null,
                item_id: cart.items[0].id,
                text: "test message",
              }),
            ],
          }),
        )
      })
    })
  },
})
