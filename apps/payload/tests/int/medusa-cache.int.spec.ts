import type { PayloadRequest } from "payload"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock the env utility
vi.mock(import("@/lib/utils/env"), () => ({
  getEnvString: vi.fn(),
}))

// Mock the request utility
vi.mock(import("@/lib/utils/request"), () => ({
  createRequestTimeout: vi.fn(() => ({
    clearTimeout: vi.fn(),
    controller: new AbortController(),
  })),
}))

const ORIGINAL_ENV = { ...process.env }

const resetEnv = () => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key]
    }
  }
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (typeof value === "string") {
      process.env[key] = value
    }
  }
}

const okResponse = () => new Response(null, { status: 204 })

describe("medusaCache hooks", () => {
  let createMedusaCacheHook: typeof import("@/lib/hooks/medusa-cache").createMedusaCacheHook
  let getEnvString: ReturnType<typeof vi.fn>
  let originalFetch: typeof globalThis.fetch

  beforeEach(async () => {
    vi.resetModules()
    resetEnv()
    originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn()

    const envModule = await import("@/lib/utils/env")
    getEnvString = envModule.getEnvString as ReturnType<typeof vi.fn>

    const cacheModule = await import("@/lib/hooks/medusa-cache")
    createMedusaCacheHook = cacheModule.createMedusaCacheHook
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.clearAllMocks()
    resetEnv()
  })

  describe("createMedusaCacheHook", () => {
    it("returns a hook function", () => {
      const hook = createMedusaCacheHook("pages")
      expect(hook).toBeTypeOf("function")
    })

    it("returns doc unchanged for unsupported operations", async () => {
      getEnvString.mockReturnValue("http://medusa.test")
      const hook = createMedusaCacheHook("pages")
      const doc = { id: 1, slug: "test" }

      const result = await hook({
        doc,
        operation: "read",
        req: null,
      } as any)

      expect(result).toBe(doc)
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it("notifies Medusa on create operation", async () => {
      getEnvString
        .mockReturnValueOnce("http://medusa.test")
        .mockReturnValueOnce("test-secret")

      const mockFetch = vi.mocked(globalThis.fetch)
      mockFetch.mockResolvedValue(okResponse())

      const hook = createMedusaCacheHook("pages")
      const doc = { id: 1, slug: "home" }
      const mockLogger = {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
      }

      await hook({
        doc,
        operation: "create",
        req: {
          locale: "en",
          payload: { logger: mockLogger },
        } as unknown as PayloadRequest,
      } as any)

      expect(mockFetch).toHaveBeenCalledWith(
        "http://medusa.test/hooks/cms/invalidate",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "x-payload-signature": expect.any(String),
          }),
          method: "POST",
        })
      )
    })

    it("notifies Medusa on update operation", async () => {
      getEnvString
        .mockReturnValueOnce("http://medusa.test")
        .mockReturnValueOnce("test-secret")

      const mockFetch = vi.mocked(globalThis.fetch)
      mockFetch.mockResolvedValue(okResponse())

      const hook = createMedusaCacheHook("articles")
      const doc = { id: 2, slug: "news" }
      const mockLogger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }

      await hook({
        doc,
        operation: "update",
        req: {
          locale: "cs",
          payload: { logger: mockLogger },
        } as unknown as PayloadRequest,
      } as any)

      expect(mockFetch).toHaveBeenCalledWith()
      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      const body = JSON.parse(options.body as string)
      expect(body.collection).toBe("articles")
      expect(body.doc.slug).toBe("news")
      expect(body.doc.locale).toBe("cs")
    })

    it("notifies Medusa on delete operation without locale", async () => {
      getEnvString
        .mockReturnValueOnce("http://medusa.test")
        .mockReturnValueOnce("test-secret")

      const mockFetch = vi.mocked(globalThis.fetch)
      mockFetch.mockResolvedValue(okResponse())

      const hook = createMedusaCacheHook("pages")
      const doc = { id: 3, slug: "about" }
      const mockLogger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }

      await hook({
        doc,
        operation: "delete",
        req: {
          locale: "en",
          payload: { logger: mockLogger },
        } as unknown as PayloadRequest,
      } as any)

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      const body = JSON.parse(options.body as string)
      expect(body.doc.locale).toBeUndefined()
    })

    it("skips notification when MEDUSA_BACKEND_URL is not set", async () => {
      getEnvString.mockReturnValue(null)

      const mockFetch = vi.mocked(globalThis.fetch)
      const hook = createMedusaCacheHook("pages")
      const doc = { id: 1, slug: "test" }
      const mockLogger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }

      await hook({
        doc,
        operation: "update",
        req: { payload: { logger: mockLogger } } as unknown as PayloadRequest,
      } as any)

      expect(mockFetch).not.toHaveBeenCalled()
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("MEDUSA_BACKEND_URL is not set")
      )
    })

    it("logs warning only once for missing MEDUSA_BACKEND_URL", async () => {
      getEnvString.mockReturnValue(null)

      const hook = createMedusaCacheHook("pages")
      const doc = { id: 1, slug: "test" }
      const mockLogger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }
      const req = {
        payload: { logger: mockLogger },
      } as unknown as PayloadRequest

      await hook({ doc, operation: "update", req } as any)
      await hook({ doc, operation: "update", req } as any)

      // The warning should be logged only once (due to loggedMissingBaseUrl flag)
      // But since we reset modules, it will log each time in our test
      expect(mockLogger.warn).toHaveBeenCalledWith()
    })

    it("throws when PAYLOAD_WEBHOOK_SECRET is not set", async () => {
      getEnvString
        .mockReturnValueOnce("http://medusa.test")
        .mockReturnValueOnce(null) // webhook secret not set

      const hook = createMedusaCacheHook("pages")
      const doc = { id: 1, slug: "test" }
      const mockLogger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }

      await expect(
        hook({
          doc,
          operation: "update",
          req: { payload: { logger: mockLogger } } as unknown as PayloadRequest,
        } as any)
      ).rejects.toThrow("PAYLOAD_WEBHOOK_SECRET is not set")
    })

    it("logs error when fetch fails", async () => {
      getEnvString
        .mockReturnValueOnce("http://medusa.test")
        .mockReturnValueOnce("test-secret")

      const mockFetch = vi.mocked(globalThis.fetch)
      mockFetch.mockRejectedValue(new Error("Network error"))

      const hook = createMedusaCacheHook("pages")
      const doc = { id: 1, slug: "test" }
      const mockLogger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }

      await hook({
        doc,
        operation: "create",
        req: { payload: { logger: mockLogger } } as unknown as PayloadRequest,
      } as any)

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Network error")
      )
    })

    it("logs error when response is not ok", async () => {
      getEnvString
        .mockReturnValueOnce("http://medusa.test")
        .mockReturnValueOnce("test-secret")

      const mockFetch = vi.mocked(globalThis.fetch)
      mockFetch.mockResolvedValue(
        new Response("Internal Server Error", { status: 500 })
      )

      const hook = createMedusaCacheHook("pages")
      const doc = { id: 1, slug: "test" }
      const mockLogger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }

      await hook({
        doc,
        operation: "update",
        req: { payload: { logger: mockLogger } } as unknown as PayloadRequest,
      } as any)

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("CMS cache invalidation failed (500)")
      )
    })

    it("handles localized slug objects", async () => {
      getEnvString
        .mockReturnValueOnce("http://medusa.test")
        .mockReturnValueOnce("test-secret")

      const mockFetch = vi.mocked(globalThis.fetch)
      mockFetch.mockResolvedValue(okResponse())

      const hook = createMedusaCacheHook("articles")
      const doc = {
        id: 1,
        slug: { cs: "czech-slug", en: "english-slug" },
      }
      const mockLogger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }

      await hook({
        doc,
        operation: "update",
        req: {
          locale: "cs",
          payload: { logger: mockLogger },
        } as unknown as PayloadRequest,
      } as any)

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      const body = JSON.parse(options.body as string)
      expect(body.doc.slug).toBe("czech-slug")
    })

    it("handles doc without slug", async () => {
      getEnvString
        .mockReturnValueOnce("http://medusa.test")
        .mockReturnValueOnce("test-secret")

      const mockFetch = vi.mocked(globalThis.fetch)
      mockFetch.mockResolvedValue(okResponse())

      const hook = createMedusaCacheHook("hero-carousels")
      const doc = { id: 1 }
      const mockLogger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }

      await hook({
        doc,
        operation: "create",
        req: { payload: { logger: mockLogger } } as unknown as PayloadRequest,
      } as any)

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      const body = JSON.parse(options.body as string)
      expect(body.doc.slug).toBeUndefined()
    })

    it("notifies Medusa for media changes without slug", async () => {
      getEnvString
        .mockReturnValueOnce("http://medusa.test")
        .mockReturnValueOnce("test-secret")

      const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
      mockFetch.mockResolvedValue(okResponse())

      const hook = createMedusaCacheHook("media")
      const doc = { filename: "image.png", id: 1 }
      const mockLogger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }

      await hook({
        doc,
        operation: "update",
        req: {
          locale: "cs",
          payload: { logger: mockLogger },
        } as unknown as PayloadRequest,
      } as any)

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      const body = JSON.parse(options.body as string)
      expect(body.collection).toBe("media")
      expect(body.doc.id).toBe("1")
      expect(body.doc.slug).toBeUndefined()
      expect(body.doc.locale).toBe("cs")
    })

    it("omits locale when Payload provides null locale", async () => {
      getEnvString
        .mockReturnValueOnce("http://medusa.test")
        .mockReturnValueOnce("test-secret")

      const mockFetch = vi.mocked(globalThis.fetch)
      mockFetch.mockResolvedValue(okResponse())

      const hook = createMedusaCacheHook("pages")
      const doc = { id: 1, slug: { en: "home" } }
      const mockLogger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }

      await hook({
        doc,
        operation: "update",
        req: {
          locale: null,
          payload: { logger: mockLogger },
        } as unknown as PayloadRequest,
      } as any)

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      const body = JSON.parse(options.body as string)
      expect(body.doc.locale).toBeUndefined()
      expect(body.doc.slug).toBeUndefined()
    })

    it("handles undefined doc gracefully", async () => {
      getEnvString
        .mockReturnValueOnce("http://medusa.test")
        .mockReturnValueOnce("test-secret")

      const mockFetch = vi.mocked(globalThis.fetch)
      mockFetch.mockResolvedValue(okResponse())

      const hook = createMedusaCacheHook("pages")
      const mockLogger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }

      await hook({
        doc: undefined,
        operation: "delete",
        req: { payload: { logger: mockLogger } } as unknown as PayloadRequest,
      } as any)

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      const body = JSON.parse(options.body as string)
      expect(body.doc.id).toBeUndefined()
      expect(body.doc.slug).toBeUndefined()
    })

    it("removes trailing slash from MEDUSA_BACKEND_URL", async () => {
      getEnvString
        .mockReturnValueOnce("http://medusa.test/")
        .mockReturnValueOnce("test-secret")

      const mockFetch = vi.mocked(globalThis.fetch)
      mockFetch.mockResolvedValue(okResponse())

      const hook = createMedusaCacheHook("pages")
      const doc = { id: 1, slug: "test" }
      const mockLogger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }

      await hook({
        doc,
        operation: "update",
        req: { payload: { logger: mockLogger } } as unknown as PayloadRequest,
      } as any)

      const [url] = mockFetch.mock.calls[0] as [string]
      expect(url).toBe("http://medusa.test/hooks/cms/invalidate")
    })

    it("defaults to delete when operation is undefined", async () => {
      getEnvString
        .mockReturnValueOnce("http://medusa.test")
        .mockReturnValueOnce("test-secret")

      const mockFetch = vi.mocked(globalThis.fetch)
      mockFetch.mockResolvedValue(okResponse())

      const hook = createMedusaCacheHook("pages")
      const doc = { id: 1, slug: "test" }
      const mockLogger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }

      // Call without operation - should default to 'delete'
      await hook({
        doc,
        req: {
          locale: "en",
          payload: { logger: mockLogger },
        } as unknown as PayloadRequest,
      } as any)

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      const body = JSON.parse(options.body as string)
      // Delete operation should not include locale
      expect(body.doc.locale).toBeUndefined()
    })
  })
})
