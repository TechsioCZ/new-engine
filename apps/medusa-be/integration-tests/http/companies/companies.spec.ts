import type { PUBLISHABLE_KEY_HEADER } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { isRecord } from "@techsio/std/object"
import { hasTrimmedString } from "@techsio/std/string"
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

interface HttpResponse {
  data: unknown
  status: number
}

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
  typeof value["post"] === "function" &&
  typeof value["get"] === "function" &&
  typeof value["delete"] === "function"

const toHttpClient = (value: unknown): HttpClient => {
  if (!isHttpClient(value)) {
    throw new TypeError("Expected an HTTP client with post/get/delete methods")
  }

  return value
}

const isHttpResponse = (value: unknown): value is HttpResponse =>
  isRecord(value) && "data" in value && typeof value["status"] === "number"

const toHttpResponse = (value: unknown): HttpResponse => {
  if (!isHttpResponse(value)) {
    throw new TypeError("Expected an HTTP response with data and status")
  }

  return value
}

const toRecord = (value: unknown, message: string): Record<string, unknown> => {
  if (!isRecord(value)) {
    throw new TypeError(message)
  }

  return value
}

const toArray = (value: unknown, message: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw new TypeError(message)
  }

  return value
}

const toFirstRecord = (
  value: unknown,
  message: string,
): Record<string, unknown> => {
  const [first] = toArray(value, message)

  return toRecord(first, message)
}

const readStringField = (
  record: Record<string, unknown>,
  key: string,
): string => {
  const field = record[key]

  if (!hasTrimmedString(field)) {
    throw new TypeError(`Expected field "${key}" to be a non-empty string`)
  }

  return field
}

const firstCompanyFromResponse = (
  response: HttpResponse,
): Record<string, unknown> =>
  toFirstRecord(
    toRecord(response.data, "Expected response data to be an object")[
      "companies"
    ],
    "Expected companies to be an array",
  )

const companyFromResponse = (response: HttpResponse): Record<string, unknown> =>
  toRecord(
    toRecord(response.data, "Expected response data to be an object")[
      "company"
    ],
    "Expected company to be an object",
  )

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

type SeedRecord = Record<string, unknown>

vi.setConfig({ testTimeout: 60 * 1000 })

medusaIntegrationTestRunner({
  env: {
    JWT_SECRET: "supersecret",
  },
  inApp: true,
  testSuite: ({ api, getContainer }) => {
    const httpClient = toHttpClient(api)

    let storeHeaders: StoreHeaders
    let product: SeedRecord
    let salesChannel: SeedRecord
    let region: SeedRecord
    let customerToken: string

    beforeEach(async () => {
      const container = getContainer()
      await createAdminUser(adminHeaders, container)
      const publishableKey = await generatePublishableKey(container)
      storeHeaders = generateStoreHeaders({ publishableKey })
      const registeredUser = toRecord(
        await createStoreUser({ api: httpClient, storeHeaders }),
        "Expected store user response to be an object",
      )
      customerToken = readStringField(registeredUser, "token")
      storeHeaders.headers.Authorization = `Bearer ${customerToken}`
      region = toRecord(
        await regionSeeder({ adminHeaders, api: httpClient, data: {} }),
        "Expected region to be an object",
      )

      salesChannel = toRecord(
        await salesChannelSeeder({
          adminHeaders,
          api: httpClient,
          data: {},
        }),
        "Expected sales channel to be an object",
      )

      const salesChannelId = readStringField(salesChannel, "id")

      product = toRecord(
        await productSeeder({
          adminHeaders,
          api: httpClient,
          data: {
            sales_channels: [{ id: salesChannelId }],
          },
        }),
        "Expected product to be an object",
      )

      await httpClient.post(
        `/admin/api-keys/${publishableKey.id}/sales-channels`,
        { add: [salesChannelId] },
        adminHeaders,
      )

      const firstVariant = toFirstRecord(
        product["variants"],
        "Expected product variants to be an array",
      )

      await cartSeeder({
        api: httpClient,
        data: {
          items: [
            {
              quantity: 1,
              variant_id: readStringField(firstVariant, "id"),
            },
          ],
          region_id: readStringField(region, "id"),
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
        const expectedCompany: Record<string, unknown> = {
          address: "123 Test St",
          city: "Test City",
          country: "Test Country",
          currency_code: "USD",
          email: "test@company.com",
          id: expect.any(String),
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

        const companyId = readStringField(
          firstCompanyFromResponse(response1),
          "id",
        )

        const response2 = toHttpResponse(
          await httpClient.get(`/store/companies/${companyId}`, storeHeaders),
        )

        const expectedCompany: Record<string, unknown> = {
          address: "123 Test St",
          city: "Test City",
          country: "Test Country",
          currency_code: "USD",
          email: "test@company.com",
          id: expect.any(String),
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
      let company1: SeedRecord

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
        const companyId = readStringField(company1, "id")
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
      let company1: SeedRecord

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
        const companyId = readStringField(company1, "id")
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
