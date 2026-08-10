import type { PUBLISHABLE_KEY_HEADER } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { getRecordValue, isRecord } from "@techsio/std/object"
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

const httpResponseSchema = z.object({
  data: z.unknown(),
  status: z.number(),
})

type HttpResponse = z.infer<typeof httpResponseSchema>

interface HttpClient {
  post: (path: string, body?: unknown, headers?: unknown) => Promise<unknown>
  get: (path: string, headers?: unknown) => Promise<unknown>
  delete: (path: string, headers?: unknown) => Promise<unknown>
}

interface StoreHeaders {
  headers: {
    [PUBLISHABLE_KEY_HEADER]: string
    Authorization?: string
  }
}

const isHttpClient = (value: unknown): value is HttpClient =>
  isRecord(value) &&
  typeof getRecordValue(value, "post") === "function" &&
  typeof getRecordValue(value, "get") === "function" &&
  typeof getRecordValue(value, "delete") === "function"

const requireHttpClient = (value: unknown): HttpClient => {
  if (!isHttpClient(value)) {
    throw new TypeError("Expected an HTTP client with post/get/delete methods")
  }

  return value
}

// The runner registers this suite before its beforeAll hook populates the API
// proxy, so validate the proxy when each request executes.
const createLazyHttpClient = (value: unknown): HttpClient => ({
  delete: async (path, headers) =>
    await requireHttpClient(value).delete(path, headers),
  get: async (path, headers) =>
    await requireHttpClient(value).get(path, headers),
  post: async (path, body, headers) =>
    await requireHttpClient(value).post(path, body, headers),
})

const toHttpResponse = (value: unknown): HttpResponse =>
  httpResponseSchema.parse(value)

const idSchema = z.string().trim().min(1)
const entitySchema = z.looseObject({ id: idSchema })
const productSchema = z.looseObject({
  variants: z.tuple([entitySchema]).rest(entitySchema),
})
const registeredUserSchema = z.looseObject({ token: idSchema })
const companyResponseSchema = z.object({ company: entitySchema })
const companiesResponseSchema = z.object({
  companies: z.tuple([entitySchema]).rest(entitySchema),
})

const firstCompanyFromResponse = (response: HttpResponse) =>
  companiesResponseSchema.parse(response.data).companies[0]

const companyFromResponse = (response: HttpResponse) =>
  companyResponseSchema.parse(response.data).company

const requestExpectingFailure = async (
  promise: Promise<unknown>,
): Promise<HttpResponse> => {
  try {
    await promise
  } catch (error) {
    return getHttpError(error).response
  }

  throw new Error("Expected the request to fail")
}

const anyStringMatcher = (): unknown => expect.any(String)

vi.setConfig({ testTimeout: 60 * 1000 })

medusaIntegrationTestRunner({
  env: {
    JWT_SECRET: "supersecret",
  },
  inApp: true,
  testSuite: ({ api, getContainer }) => {
    const httpClient = createLazyHttpClient(api)

    let storeHeaders: StoreHeaders
    let product: z.infer<typeof productSchema>
    let salesChannel: z.infer<typeof entitySchema>
    let region: z.infer<typeof entitySchema>
    let customerToken: string

    beforeEach(async () => {
      const container = getContainer()
      await createAdminUser(adminHeaders, container)
      const publishableKey = await generatePublishableKey(container)
      storeHeaders = generateStoreHeaders({ publishableKey })
      const registeredUser = registeredUserSchema.parse(
        await createStoreUser({ api: httpClient, storeHeaders }),
      )
      customerToken = registeredUser.token
      storeHeaders.headers.Authorization = `Bearer ${customerToken}`
      region = entitySchema.parse(
        await regionSeeder({ adminHeaders, api: httpClient, data: {} }),
      )

      salesChannel = entitySchema.parse(
        await salesChannelSeeder({
          adminHeaders,
          api: httpClient,
          data: {},
        }),
      )

      const salesChannelId = salesChannel.id

      product = productSchema.parse(
        await productSeeder({
          adminHeaders,
          api: httpClient,
          data: {
            sales_channels: [{ id: salesChannelId }],
          },
        }),
      )

      await httpClient.post(
        `/admin/api-keys/${publishableKey.id}/sales-channels`,
        { add: [salesChannelId] },
        adminHeaders,
      )

      const [firstVariant] = product.variants

      await cartSeeder({
        api: httpClient,
        data: {
          items: [
            {
              quantity: 1,
              variant_id: firstVariant.id,
            },
          ],
          region_id: region.id,
          sales_channel_id: salesChannelId,
        },
        storeHeaders,
      })
    })

    describe("POST /store/companies", () => {
      it("successfully creates a company", async () => {
        const response = toHttpResponse(
          await httpClient.post(
            "/store/companies",
            {
              address: "123 Test St",
              city: "Test City",
              country: "Test Country",
              currency_code: "USD",
              email: "test@company.com",
              logo_url: "https://test.com/logo.png",
              name: "Test Company",
              phone: "1234567890",
              spending_limit_reset_frequency: "monthly",
              state: "Test State",
              zip: "12345",
            },
            storeHeaders,
          ),
        )

        expect(response.status).toBe(200)
        const expectedCompany = {
          address: "123 Test St",
          city: "Test City",
          country: "Test Country",
          currency_code: "USD",
          email: "test@company.com",
          id: anyStringMatcher(),
          logo_url: "https://test.com/logo.png",
          name: "Test Company",
          phone: "1234567890",
          state: "Test State",
          zip: "12345",
        }
        expect(firstCompanyFromResponse(response)).toMatchObject(
          expectedCompany,
        )
      })
    })

    describe("GET /store/companies/:id", () => {
      it("successfully retrieves a company", async () => {
        const response1 = toHttpResponse(
          await httpClient.post(
            "/store/companies",
            {
              address: "123 Test St",
              city: "Test City",
              country: "Test Country",
              currency_code: "USD",
              email: "test@company.com",
              logo_url: "https://test.com/logo.png",
              name: "Test Company",
              phone: "1234567890",
              spending_limit_reset_frequency: "monthly",
              state: "Test State",
              zip: "12345",
            },
            storeHeaders,
          ),
        )

        const companyId = firstCompanyFromResponse(response1).id

        const response2 = toHttpResponse(
          await httpClient.get(`/store/companies/${companyId}`, storeHeaders),
        )

        const expectedCompany = {
          address: "123 Test St",
          city: "Test City",
          country: "Test Country",
          currency_code: "USD",
          email: "test@company.com",
          id: anyStringMatcher(),
          logo_url: "https://test.com/logo.png",
          name: "Test Company",
          phone: "1234567890",
          state: "Test State",
          zip: "12345",
        }
        expect(companyFromResponse(response2)).toMatchObject(expectedCompany)
      })

      it("should throw error when company does not exist", async () => {
        const response = await requestExpectingFailure(
          httpClient.get("/store/companies/does-not-exist", storeHeaders),
        )

        expect(response.data).toMatchObject({
          type: "not_found",
        })
      })
    })

    describe("POST /store/companies/:id", () => {
      let company1: z.infer<typeof entitySchema>

      beforeEach(async () => {
        const response = toHttpResponse(
          await httpClient.post(
            "/store/companies",
            {
              address: "123 Test St",
              city: "Test City",
              country: "Test Country",
              currency_code: "USD",
              email: "test@company.com",
              logo_url: "https://test.com/logo.png",
              name: "Test Company",
              phone: "1234567890",
              spending_limit_reset_frequency: "monthly",
              state: "Test State",
              zip: "12345",
            },
            storeHeaders,
          ),
        )

        company1 = firstCompanyFromResponse(response)
      })

      it("successfully updates a company", async () => {
        const companyId = company1.id
        const response = toHttpResponse(
          await httpClient.post(
            `/store/companies/${companyId}`,
            {
              address: "456 Updated Ave",
              city: "Updated City",
              country: "Updated Country",
              currency_code: "EUR",
              email: "updated@company.com",
              logo_url: "https://updated.com/logo.png",
              name: "Updated Company",
              phone: "0987654321",
              spending_limit_reset_frequency: "yearly",
              state: "Updated State",
              zip: "54321",
            },
            storeHeaders,
          ),
        )

        expect(companyFromResponse(response)).toMatchObject({
          address: "456 Updated Ave",
          city: "Updated City",
          country: "Updated Country",
          currency_code: "EUR",
          email: "updated@company.com",
          id: companyId,
          logo_url: "https://updated.com/logo.png",
          name: "Updated Company",
          phone: "0987654321",
          state: "Updated State",
          zip: "54321",
        })
      })

      it("should throw an error when company does not exist", async () => {
        const response = await requestExpectingFailure(
          httpClient.post(
            "/store/companies/does-not-exist",
            { name: "Nonexistent Company" },
            storeHeaders,
          ),
        )

        expect(response.data).toMatchObject({
          type: "not_found",
        })
      })
    })

    describe("DELETE /store/companies/:id", () => {
      let company1: z.infer<typeof entitySchema>

      beforeEach(async () => {
        const response = toHttpResponse(
          await httpClient.post(
            "/store/companies",
            {
              address: "123 Test St",
              city: "Test City",
              country: "Test Country",
              currency_code: "USD",
              email: "test@company.com",
              logo_url: "https://test.com/logo.png",
              name: "Test Company",
              phone: "1234567890",
              spending_limit_reset_frequency: "monthly",
              state: "Test State",
              zip: "12345",
            },
            storeHeaders,
          ),
        )

        company1 = firstCompanyFromResponse(response)
      })

      it("successfully deletes a company", async () => {
        const companyId = company1.id
        const response = toHttpResponse(
          await httpClient.delete(
            `/store/companies/${companyId}`,
            storeHeaders,
          ),
        )

        expect(response.status).toBe(204)
      })

      it("should throw an error when company does not exist", async () => {
        const response = await requestExpectingFailure(
          httpClient.delete("/store/companies/does-not-exist", storeHeaders),
        )

        expect(response.status).toBe(204)
      })
    })
  },
})
