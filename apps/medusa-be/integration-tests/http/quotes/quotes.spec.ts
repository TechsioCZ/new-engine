import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { vi, beforeEach, describe, expect, it } from "vitest"

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

type TestValue = any

vi.setConfig({ testTimeout: 60 * 1000 })

medusaIntegrationTestRunner({
  env: {},
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

    describe("POST /store/quotes", () => {
      it("successfully initiates a quote with a draft order", async () => {
        const response = await api.post(
          "/store/quotes",
          { cart_id: cart.id },
          storeHeaders,
        )

        expect(response.status).toBe(200)
        expect(response.data.quote).toStrictEqual(
          expect.objectContaining({
            cart_id: cart.id,
            draft_order: expect.objectContaining({
              items: [
                expect.objectContaining({
                  quantity: cart.items[0].quantity,
                  unit_price: cart.items[0].unit_price,
                }),
              ],
              status: "draft",
              summary: expect.objectContaining({
                paid_total: 0,
                refunded_total: 0,
                transaction_total: 0,
                pending_difference: 100,
                current_order_total: 100,
                original_order_total: 100,
              }),
              version: 1,
            }),
            draft_order_id: expect.any(String),
            id: expect.any(String),
            order_change: expect.objectContaining({
              actions: [],
            }),
          }),
        )
      })
    })

    describe("GET /store/quotes/:id", () => {
      it("successfully retrieves a quote", async () => {
        const {
          data: { quote: newQuote },
        } = await api.post("/store/quotes", { cart_id: cart.id }, storeHeaders)

        const {
          data: { quote },
        } = await api.get(`/store/quotes/${newQuote.id}`, storeHeaders)

        expect(quote).toStrictEqual(
          expect.objectContaining({
            cart: expect.objectContaining({
              id: cart.id,
            }),
            draft_order: expect.objectContaining({
              id: newQuote.draft_order_id,
            }),
            id: expect.any(String),
          }),
        )
      })

      it("should throw error when quote does not exist", async () => {
        const {
          response: { data },
        } = await api
          .get("/store/quotes/does-not-exist", storeHeaders)
          .catch(getHttpError)

        expect(data).toStrictEqual({
          message: "Quote id not found: does-not-exist",
          type: "not_found",
        })
      })
    })

    describe("GET /store/quotes", () => {
      let cart2: TestValue

      beforeEach(async () => {
        cart2 = await cartSeeder({
          api,
          data: {
            items: [{ quantity: 1, variant_id: product.variants[0].id }],
            region_id: region.id,
            sales_channel_id: salesChannel.id,
          },
          storeHeaders,
        })
      })

      it("successfully retrieves all quote for a customer", async () => {
        const {
          data: { quote: quote1 },
        } = await api.post("/store/quotes", { cart_id: cart.id }, storeHeaders)

        const {
          data: { quote: quote2 },
        } = await api.post("/store/quotes", { cart_id: cart2.id }, storeHeaders)

        const {
          data: { quotes },
        } = await api.get("/store/quotes", storeHeaders)

        expect(quotes).toStrictEqual(
          expect.arrayContaining([
            expect.objectContaining({
              cart: expect.objectContaining({
                id: cart.id,
              }),
              draft_order: expect.objectContaining({
                id: quote1.draft_order_id,
              }),
              id: quote1.id,
            }),
            expect.objectContaining({
              cart: expect.objectContaining({
                id: cart2.id,
              }),
              draft_order: expect.objectContaining({
                id: quote2.draft_order_id,
              }),
              id: quote2.id,
            }),
          ]),
        )
      })
    })

    describe("POST /store/quotes/:id/accept", () => {
      let quote1: TestValue

      beforeEach(async () => {
        const {
          data: { quote: newQuote },
        } = await api.post("/store/quotes", { cart_id: cart.id }, storeHeaders)

        quote1 = newQuote
      })

      it("successfully accepts a quote", async () => {
        await api.post(`/admin/quotes/${quote1.id}/send`, {}, adminHeaders)

        const {
          data: { quote },
        } = await api.post(
          `/store/quotes/${quote1.id}/accept?fields=+draft_order.is_draft_order,+draft_order.status`,
          {},
          storeHeaders,
        )

        expect(quote).toStrictEqual(
          expect.objectContaining({
            draft_order: expect.objectContaining({
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
            }),
            id: quote1.id,
          }),
        )
      })

      it("should throw an error when quote is already accepted", async () => {
        await api.post(`/admin/quotes/${quote1.id}/send`, {}, adminHeaders)

        await api.post(`/store/quotes/${quote1.id}/accept`, {}, storeHeaders)

        const { response } = await api
          .post(`/store/quotes/${quote1.id}/accept`, {}, storeHeaders)
          .catch(getHttpError)

        expect(response.data).toStrictEqual({
          message: "Cannot accept quote when quote status is accepted",
          type: "invalid_data",
        })
      })
    })

    describe("POST /store/quotes/:id/reject", () => {
      let quote1: TestValue

      beforeEach(async () => {
        const {
          data: { quote: newQuote },
        } = await api.post("/store/quotes", { cart_id: cart.id }, storeHeaders)

        quote1 = newQuote
      })

      it("successfully rejects a quote", async () => {
        await api.post(`/admin/quotes/${quote1.id}/send`, {}, adminHeaders)

        const {
          data: { quote },
        } = await api.post(
          `/store/quotes/${quote1.id}/reject?fields=+draft_order.status`,
          {},
          storeHeaders,
        )

        expect(quote).toStrictEqual(
          expect.objectContaining({
            id: quote1.id,
            status: "customer_rejected",
          }),
        )
      })
    })
  },
})
