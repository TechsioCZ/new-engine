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
  env: {
    JWT_SECRET: "supersecret",
  },
  inApp: true,
  testSuite: ({ api, getContainer }) => {
    let storeHeaders: TestValue
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

      await cartSeeder({
        api,
        data: {
          items: [{ quantity: 1, variant_id: product.variants[0].id }],
          region_id: region.id,
          sales_channel_id: salesChannel.id,
        },
        storeHeaders,
      })
    })

    describe("POST /store/companies", () => {
      it("successfully creates a company", async () => {
        const response = await api.post(
          "/store/companies",
          {
            address: "123 Test St",
            city: "Test City",
            country: "Test Country",
            currency_code: "USD",
            email: "test@company.com",
            logo_url: "http://test.com/logo.png",
            name: "Test Company",
            phone: "1234567890",
            spending_limit_reset_frequency: "monthly",
            state: "Test State",
            zip: "12345",
          },
          storeHeaders,
        )

        expect(response.status).toStrictEqual(200)
        expect(response.data.companies[0]).toMatchObject({
          address: "123 Test St",
          city: "Test City",
          country: "Test Country",
          currency_code: "USD",
          email: "test@company.com",
          id: expect.any(String),
          logo_url: "http://test.com/logo.png",
          name: "Test Company",
          phone: "1234567890",
          state: "Test State",
          zip: "12345",
        })
      })
    })

    describe("GET /store/companies/:id", () => {
      it("successfully retrieves a company", async () => {
        const response1 = await api.post(
          "/store/companies",
          {
            address: "123 Test St",
            city: "Test City",
            country: "Test Country",
            currency_code: "USD",
            email: "test@company.com",
            logo_url: "http://test.com/logo.png",
            name: "Test Company",
            phone: "1234567890",
            spending_limit_reset_frequency: "monthly",
            state: "Test State",
            zip: "12345",
          },
          storeHeaders,
        )

        const response2 = await api.get(
          `/store/companies/${response1.data.companies[0].id}`,
          storeHeaders,
        )

        expect(response2.data.company).toMatchObject({
          address: "123 Test St",
          city: "Test City",
          country: "Test Country",
          currency_code: "USD",
          email: "test@company.com",
          id: expect.any(String),
          logo_url: "http://test.com/logo.png",
          name: "Test Company",
          phone: "1234567890",
          state: "Test State",
          zip: "12345",
        })
      })

      it("should throw error when company does not exist", async () => {
        const { response } = await api
          .get("/store/companies/does-not-exist", storeHeaders)
          .catch(getHttpError)

        expect(response.data).toMatchObject({
          type: "not_found",
        })
      })
    })

    describe("POST /store/companies/:id", () => {
      let company1: TestValue

      beforeEach(async () => {
        const response = await api.post(
          "/store/companies",
          {
            address: "123 Test St",
            city: "Test City",
            country: "Test Country",
            currency_code: "USD",
            email: "test@company.com",
            logo_url: "http://test.com/logo.png",
            name: "Test Company",
            phone: "1234567890",
            spending_limit_reset_frequency: "monthly",
            state: "Test State",
            zip: "12345",
          },
          storeHeaders,
        )

        company1 = response.data.companies[0]
      })

      it("successfully updates a company", async () => {
        const response = await api.post(
          `/store/companies/${company1.id}`,
          {
            address: "456 Updated Ave",
            city: "Updated City",
            country: "Updated Country",
            currency_code: "EUR",
            email: "updated@company.com",
            logo_url: "http://updated.com/logo.png",
            name: "Updated Company",
            phone: "0987654321",
            spending_limit_reset_frequency: "yearly",
            state: "Updated State",
            zip: "54321",
          },
          storeHeaders,
        )

        expect(response.data.company).toMatchObject({
          address: "456 Updated Ave",
          city: "Updated City",
          country: "Updated Country",
          currency_code: "EUR",
          email: "updated@company.com",
          id: company1.id,
          logo_url: "http://updated.com/logo.png",
          name: "Updated Company",
          phone: "0987654321",
          state: "Updated State",
          zip: "54321",
        })
      })

      it("should throw an error when company does not exist", async () => {
        const { response } = await api
          .post(
            "/store/companies/does-not-exist",
            { name: "Nonexistent Company" },
            storeHeaders,
          )
          .catch(getHttpError)

        expect(response.data).toMatchObject({
          type: "not_found",
        })
      })
    })

    describe("DELETE /store/companies/:id", () => {
      let company1: TestValue

      beforeEach(async () => {
        const response = await api.post(
          "/store/companies",
          {
            address: "123 Test St",
            city: "Test City",
            country: "Test Country",
            currency_code: "USD",
            email: "test@company.com",
            logo_url: "http://test.com/logo.png",
            name: "Test Company",
            phone: "1234567890",
            spending_limit_reset_frequency: "monthly",
            state: "Test State",
            zip: "12345",
          },
          storeHeaders,
        )

        company1 = response.data.companies[0]
      })

      it("successfully deletes a company", async () => {
        const response = await api.delete(
          `/store/companies/${company1.id}`,
          storeHeaders,
        )

        expect(response.status).toStrictEqual(204)
      })

      it("should throw an error when company does not exist", async () => {
        const response = await api
          .delete("/store/companies/does-not-exist", storeHeaders)
          .catch(getHttpError)

        expect(response.status).toStrictEqual(204)
      })
    })
  },
})
