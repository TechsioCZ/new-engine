import { createHmac, randomBytes } from "node:crypto"

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getRecordValue, isRecord } from "@techsio/std/object"
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import type { POST as PostHandler } from "../../../../../../../src/api/hooks/cms/invalidate/route"
import type {
  loadSearchProfiles,
  SearchProfile,
} from "../../../../../../../src/modules/meilisearch/profiles"

const WEBHOOK_SECRET = randomBytes(32).toString("hex")

const mockInvalidateCache =
  vi.fn<(collection: string, slug?: string, locale?: string) => Promise<void>>()
const mockGetPublishedSearchDocument =
  vi.fn<
    (
      collection: "articles" | "pages",
      id: string,
      locale: string,
    ) => Promise<unknown>
  >()
const mockReconcileContentSearchChange =
  vi.fn<(change: unknown, logger: unknown, scope: unknown) => Promise<void>>()
const mockLoadSearchProfiles = vi.fn<typeof loadSearchProfiles>(
  async () => await Promise.resolve([]),
)
const createSearchProfile = (locale: string): SearchProfile => ({
  availability: "all",
  domain: "example.test",
  indexes: {
    brand: `brand_${locale}`,
    category: `category_${locale}`,
    content: `content_${locale}`,
    product: `product_${locale}`,
  },
  key: `profile-${locale}`,
  limits: {
    autocomplete: { brand: 3, category: 3, content: 3, product: 6 },
    fullSearch: 1000,
    page: 48,
    popular: 12,
  },
  locale,
  minimumRankingScore: 0,
  salesChannelIds: ["sc_test"],
  separateVariantResults: false,
  shop: "test",
  strict: false,
})
const mockLogger = {
  debug: vi.fn<(message: string) => void>(),
  error: vi.fn<(messageOrError: string | Error, error?: Error) => void>(),
  info: vi.fn<(message: string) => void>(),
  warn: vi.fn<(message: string) => void>(),
}

vi.mock(
  import("../../../../../../../src/modules/meilisearch/content-events"),
  () => ({ reconcileContentSearchChange: mockReconcileContentSearchChange }),
)

vi.mock(
  import("../../../../../../../src/modules/meilisearch/profiles"),
  () => ({ loadSearchProfiles: mockLoadSearchProfiles }),
)

vi.mock(import("../../../../../../../src/modules/payload"), () => ({
  PAYLOAD_MODULE: "payload" as const,
}))

vi.mock(import("../../../../../../../src/utils/webhooks"), () => ({
  getHeaderValue: vi.fn<
    (req: MedusaRequest, name: string) => string | undefined
  >((req, name) => {
    const value = req.headers[name]
    return Array.isArray(value) ? value[0] : value
  }),
  isValidWebhookSignature: vi.fn<
    (sig: string | undefined, expected: string | undefined) => boolean
  >((sig, expected) => sig !== undefined && sig === expected),
}))

const originalEnv = process.env["PAYLOAD_WEBHOOK_SECRET"]

/**
 * Mock response shape used in place of `MedusaResponse` in this file.
 * Overriding `status` with a plain function-typed property (instead of the
 * method signature Express declares) keeps `expect(res.status)` from being
 * treated as an unbound method reference by typed lint rules.
 */
type MockResponse = MedusaResponse & {
  json: (body?: unknown) => MockResponse
  status: (code: number) => MockResponse
}

type MockRequest = MedusaRequest & {
  headers: Record<string, string>
  rawBody: string
  scope: { resolve: (key: string) => unknown }
}

/**
 * Asserts that a plain mock object contains the given keys before narrowing
 * it to a framework type. Building the mock as `unknown` first (instead of
 * the target type) avoids requiring every property of the huge Node
 * request interface while still validating the shape the route handler
 * actually reads from at runtime.
 */
const assertRequestShape: (
  candidate: unknown,
) => asserts candidate is MockRequest = (candidate) => {
  if (typeof candidate !== "object" || candidate === null) {
    throw new TypeError("Expected a mock request object")
  }

  for (const key of ["body", "headers", "rawBody", "scope"]) {
    if (!(key in candidate)) {
      throw new TypeError(`Mock request missing required key: ${key}`)
    }
  }
}

/** See {@link assertRequestShape}; same technique for the response mock. */
const assertResponseShape: (
  candidate: unknown,
) => asserts candidate is MockResponse = (candidate) => {
  if (typeof candidate !== "object" || candidate === null) {
    throw new TypeError("Expected a mock response object")
  }

  for (const key of ["json", "status"]) {
    if (!(key in candidate)) {
      throw new TypeError(`Mock response missing required key: ${key}`)
    }
  }
}

const createMockRequest = (
  body: unknown,
  headers: Record<string, string> = {},
): MockRequest => {
  const bodyStr = JSON.stringify(body)
  const candidate: unknown = {
    body,
    headers,
    rawBody: bodyStr,
    scope: {
      resolve: vi.fn<(key: string) => unknown>((key) => {
        if (key === "payload") {
          return {
            getPublishedSearchDocument: mockGetPublishedSearchDocument,
            invalidateCache: mockInvalidateCache,
          }
        }
        if (key === "logger") {
          return mockLogger
        }
        return null
      }),
    },
  }
  assertRequestShape(candidate)
  return candidate
}

const createMockResponse = (): MockResponse => {
  const candidate: unknown = {
    json: vi.fn<(body?: unknown) => unknown>().mockReturnThis(),
    status: vi.fn<(code: number) => unknown>().mockReturnThis(),
  }
  assertResponseShape(candidate)
  return candidate
}

const generateSignature = (body: unknown): string =>
  createHmac("sha256", WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest("hex")

describe("POST /hooks/cms/invalidate route", () => {
  beforeAll(() => {
    process.env["PAYLOAD_WEBHOOK_SECRET"] = WEBHOOK_SECRET
  })

  afterAll(() => {
    if (originalEnv === undefined) {
      // delete required to unset env vars in Node.js
      delete process.env["PAYLOAD_WEBHOOK_SECRET"]
    } else {
      process.env["PAYLOAD_WEBHOOK_SECRET"] = originalEnv
    }
  })

  describe("POST /hooks/cms/invalidate", () => {
    let POST: typeof PostHandler

    beforeAll(async () => {
      ;({ POST } =
        await import("../../../../../../../src/api/hooks/cms/invalidate/route"))
    })

    beforeEach(() => {
      vi.clearAllMocks()
      process.env["PAYLOAD_WEBHOOK_SECRET"] = WEBHOOK_SECRET
    })

    it("returns 401 when signature is missing", async () => {
      const body = { collection: "pages", doc: { slug: "home" } }
      const req = createMockRequest(body, {})
      const res = createMockResponse()

      await POST(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" })
    })

    it("returns 401 when signature is invalid", async () => {
      const body = { collection: "pages", doc: { slug: "home" } }
      const req = createMockRequest(body, {
        "x-payload-signature": "invalid-signature",
      })
      const res = createMockResponse()

      await POST(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" })
    })

    it("returns 400 when collection is missing", async () => {
      const body = { doc: { slug: "home" } }
      const signature = generateSignature(body)
      const req = createMockRequest(body, {
        "x-payload-signature": signature,
      })
      const res = createMockResponse()

      await POST(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        error: "Missing or invalid collection",
      })
    })

    it("returns 200 and invalidates cache on valid request", async () => {
      const body = {
        collection: "pages",
        doc: { locale: "en", slug: "home" },
      }
      const signature = generateSignature(body)
      const req = createMockRequest(body, {
        "x-payload-signature": signature,
      })
      const res = createMockResponse()

      mockInvalidateCache.mockResolvedValue()

      await POST(req, res)

      expect(mockInvalidateCache).toHaveBeenCalledWith("pages", "home", "en")
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ success: true })
    })

    it("evicts both current and previous localized slugs", async () => {
      const body = {
        collection: "pages",
        doc: { locale: "en", previousSlug: "old-home", slug: "home" },
      }
      const signature = generateSignature(body)
      const req = createMockRequest(body, {
        "x-payload-signature": signature,
      })
      const res = createMockResponse()
      mockInvalidateCache.mockResolvedValue()

      await POST(req, res)

      expect(mockInvalidateCache).toHaveBeenNthCalledWith(
        1,
        "pages",
        "home",
        "en",
      )
      expect(mockInvalidateCache).toHaveBeenNthCalledWith(
        2,
        "pages",
        "old-home",
        "en",
      )
      expect(res.status).toHaveBeenCalledWith(200)
    })

    it("refetches locale-less updates for every profile locale", async () => {
      const body = {
        collection: "pages",
        doc: {
          id: "page_1",
          slug: { en: "home", sk: "domov" },
          status: "published",
          title: { en: "Home", sk: "Domov" },
          visibility: "public",
        },
        operation: "update",
      }
      const signature = generateSignature(body)
      const req = createMockRequest(body, {
        "x-payload-signature": signature,
      })
      const res = createMockResponse()
      mockInvalidateCache.mockResolvedValue()
      mockLoadSearchProfiles.mockResolvedValue([
        createSearchProfile("en"),
        createSearchProfile("sk"),
      ])
      mockGetPublishedSearchDocument.mockImplementation(
        async (_collection, id, locale) =>
          await Promise.resolve({
            id,
            locale,
            slug: locale === "sk" ? "domov" : "home",
            status: "published",
            title: locale === "sk" ? "Domov" : "Home",
            visibility: "public",
          }),
      )

      await POST(req, res)

      expect(mockInvalidateCache).toHaveBeenCalledWith(
        "pages",
        undefined,
        undefined,
      )
      expect(mockGetPublishedSearchDocument).toHaveBeenCalledTimes(2)
      expect(mockReconcileContentSearchChange).toHaveBeenCalledTimes(2)
      const reconciledLocales = mockReconcileContentSearchChange.mock.calls
        .flatMap(([change]) => {
          if (!isRecord(change)) {
            return []
          }
          const doc = getRecordValue(change, "doc")
          if (!isRecord(doc)) {
            return []
          }
          const locale = getRecordValue(doc, "locale")
          return typeof locale === "string" ? [locale] : []
        })
        .toSorted((left, right) => left.localeCompare(right))
      expect(reconciledLocales).toStrictEqual(["en", "sk"])
      const reconciledTitles = mockReconcileContentSearchChange.mock.calls
        .flatMap(([change]) => {
          if (!isRecord(change)) {
            return []
          }
          const doc = getRecordValue(change, "doc")
          if (!isRecord(doc)) {
            return []
          }
          const title = getRecordValue(doc, "title")
          return typeof title === "string" ? [title] : []
        })
        .toSorted((left, right) => left.localeCompare(right))
      expect(reconciledTitles).toStrictEqual(["Domov", "Home"])
    })

    it("reconciles global unpublish changes for every profile locale", async () => {
      const body = {
        collection: "pages",
        doc: {
          globalVisibilityChange: true,
          id: "page_1",
          slug: "home",
          status: "draft",
          visibility: "public",
        },
        operation: "update",
      }
      const signature = generateSignature(body)
      const req = createMockRequest(body, {
        "x-payload-signature": signature,
      })
      const res = createMockResponse()
      mockInvalidateCache.mockResolvedValue()
      mockLoadSearchProfiles.mockResolvedValue([
        createSearchProfile("en"),
        createSearchProfile("sk"),
      ])
      mockGetPublishedSearchDocument.mockResolvedValue(null)

      await POST(req, res)

      expect(mockGetPublishedSearchDocument).toHaveBeenCalledTimes(2)
      expect(mockReconcileContentSearchChange).toHaveBeenCalledTimes(2)
      for (const [change] of mockReconcileContentSearchChange.mock.calls) {
        expect(change).toMatchObject({ doc: { status: "unpublished" } })
      }
    })

    it("handles request without doc property", async () => {
      const body = { collection: "hero-carousels" }
      const signature = generateSignature(body)
      const req = createMockRequest(body, {
        "x-payload-signature": signature,
      })
      const res = createMockResponse()

      mockInvalidateCache.mockResolvedValue()

      await POST(req, res)

      expect(mockInvalidateCache).toHaveBeenCalledWith(
        "hero-carousels",
        undefined,
        undefined,
      )
      expect(res.status).toHaveBeenCalledWith(200)
    })

    it("returns 500 when cache invalidation fails", async () => {
      const body = {
        collection: "articles",
        doc: { locale: "cs", slug: "news" },
      }
      const signature = generateSignature(body)
      const req = createMockRequest(body, {
        "x-payload-signature": signature,
      })
      const res = createMockResponse()

      mockInvalidateCache.mockRejectedValue(
        new Error("Cache service unavailable"),
      )

      await POST(req, res)

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("CMS cache invalidation failed"),
        expect.any(Error),
      )
      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        collection: "articles",
        error: "Failed to invalidate cache",
        locale: "cs",
        slug: "news",
      })
    })

    it("handles invalidation error with missing doc fields", async () => {
      const body = { collection: "pages" }
      const signature = generateSignature(body)
      const req = createMockRequest(body, {
        "x-payload-signature": signature,
      })
      const res = createMockResponse()

      mockInvalidateCache.mockRejectedValue(new Error("Service error"))

      await POST(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        collection: "pages",
        error: "Failed to invalidate cache",
        locale: null,
        slug: null,
      })
    })

    it("handles non-Error throwables in catch block", async () => {
      const body = { collection: "pages", doc: { slug: "test" } }
      const signature = generateSignature(body)
      const req = createMockRequest(body, {
        "x-payload-signature": signature,
      })
      const res = createMockResponse()

      mockInvalidateCache.mockRejectedValue("string error")

      await POST(req, res)

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("CMS cache invalidation failed"),
        expect.any(Error),
      )
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe("POST /hooks/cms/invalidate - missing webhook secret", () => {
    it("returns 500 when webhook secret is not configured", async () => {
      // delete required to unset env vars in Node.js
      delete process.env["PAYLOAD_WEBHOOK_SECRET"]

      const { POST } =
        await import("../../../../../../../src/api/hooks/cms/invalidate/route")

      const body = { collection: "pages" }
      const req = createMockRequest(body, { "x-payload-signature": "any" })
      const res = createMockResponse()

      await POST(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        error: "Webhook secret not configured",
      })
    })
  })
})
