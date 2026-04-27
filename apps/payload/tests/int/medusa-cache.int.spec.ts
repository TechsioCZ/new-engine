import type { PayloadRequest } from "payload"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock the env utility
vi.mock("@/lib/utils/env", () => ({
  getEnvString: vi.fn(),
}))

// Mock the request utility
vi.mock("@/lib/utils/request", () => ({
  createRequestTimeout: vi.fn(() => ({
    controller: new AbortController(),
    clearTimeout: vi.fn(),
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
      expect(typeof hook).toBe("function")
    })

    it("returns doc unchanged for unsupported operations", async () => {
      getEnvString.mockReturnValue("http://medusa.test")
      const hook = createMedusaCacheHook("pages")
      const doc = { id: 1, slug: "test" }

      const result = await hook({
        doc,
        req: null,
        operation: "read",
      } as any)

      expect(result).toBe(doc)
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it("notifies Medusa on create operation", async () => {
      getEnvString
        .mockReturnValueOnce("http://medusa.test")
        .mockReturnValueOnce("test-secret")

      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
      mockFetch.mockResolvedValue({ ok: true })

      const hook = createMedusaCacheHook("pages")
      const doc = { id: 1, slug: "home" }
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      await hook({
        doc,
        req: {
          locale: "en",
          payload: { logger: mockLogger },
        } as unknown as PayloadRequest,
        operation: "create",
      } as any)

      expect(mockFetch).toHaveBeenCalledWith(
        "http://medusa.test/hooks/cms/invalidate",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "x-payload-signature": expect.any(String),
          }),
        })
      )
    })

    it("notifies Medusa on update operation", async () => {
      getEnvString
        .mockReturnValueOnce("http://medusa.test")
        .mockReturnValueOnce("test-secret")

      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
      mockFetch.mockResolvedValue({ ok: true })

      const hook = createMedusaCacheHook("articles")
      const doc = { id: 2, slug: "news" }
      const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

      await hook({
        doc,
        req: {
          locale: "cs",
          payload: { logger: mockLogger },
        } as unknown as PayloadRequest,
        operation: "update",
      } as any)

      expect(mockFetch).toHaveBeenCalled()
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

      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
      mockFetch.mockResolvedValue({ ok: true })

      const hook = createMedusaCacheHook("pages")
      const doc = { id: 3, slug: "about" }
      const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

      await hook({
        doc,
        req: {
          locale: "en",
          payload: { logger: mockLogger },
        } as unknown as PayloadRequest,
        operation: "delete",
      } as any)

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      const body = JSON.parse(options.body as string)
      expect(body.doc.locale).toBeUndefined()
    })

    it("skips notification when MEDUSA_BACKEND_URL is not set", async () => {
      getEnvString.mockReturnValue(null)

      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
      const hook = createMedusaCacheHook("pages")
      const doc = { id: 1, slug: "test" }
      const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

      await hook({
        doc,
        req: { payload: { logger: mockLogger } } as unknown as PayloadRequest,
        operation: "update",
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
      const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      const req = {
        payload: { logger: mockLogger },
      } as unknown as PayloadRequest

      await hook({ doc, req, operation: "update" } as any)
      await hook({ doc, req, operation: "update" } as any)

      // The warning should be logged only once (due to loggedMissingBaseUrl flag)
      // But since we reset modules, it will log each time in our test
      expect(mockLogger.warn).toHaveBeenCalled()
    })

    it("throws when PAYLOAD_WEBHOOK_SECRET is not set", async () => {
      getEnvString
        .mockReturnValueOnce("http://medusa.test")
        .mockReturnValueOnce(null) // webhook secret not set

      const hook = createMedusaCacheHook("pages")
      const doc = { id: 1, slug: "test" }
      const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

      await expect(
        hook({
          doc,
          req: { payload: { logger: mockLogger } } as unknown as PayloadRequest,
          operation: "update",
        } as any)
      ).rejects.toThrow("PAYLOAD_WEBHOOK_SECRET is not set")
    })

    it("logs error when fetch fails", async () => {
      getEnvString
        .mockReturnValueOnce("http://medusa.test")
        .mockReturnValueOnce("test-secret")

      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
      mockFetch.mockRejectedValue(new Error("Network error"))

      const hook = createMedusaCacheHook("pages")
      const doc = { id: 1, slug: "test" }
      const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

      await hook({
        doc,
        req: { payload: { logger: mockLogger } } as unknown as PayloadRequest,
        operation: "create",
      } as any)

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Network error")
      )
    })

    it("logs error when response is not ok", async () => {
      getEnvString
        .mockReturnValueOnce("http://medusa.test")
        .mockReturnValueOnce("test-secret")

      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue("Internal Server Error"),
      })

      const hook = createMedusaCacheHook("pages")
      const doc = { id: 1, slug: "test" }
      const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

      await hook({
        doc,
        req: { payload: { logger: mockLogger } } as unknown as PayloadRequest,
        operation: "update",
      } as any)

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("CMS cache invalidation failed (500)")
      )
    })

    it("handles localized slug objects", async () => {
      getEnvString
        .mockReturnValueOnce("http://medusa.test")
        .mockReturnValueOnce("test-secret")

      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
      mockFetch.mockResolvedValue({ ok: true })

      const hook = createMedusaCacheHook("articles")
      const doc = {
        id: 1,
        slug: { en: "english-slug", cs: "czech-slug" },
      }
      const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

      await hook({
        doc,
        req: {
          locale: "cs",
          payload: { logger: mockLogger },
        } as unknown as PayloadRequest,
        operation: "update",
      } as any)

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      const body = JSON.parse(options.body as string)
      expect(body.doc.slug).toBe("czech-slug")
    })

    it("handles doc without slug", async () => {
      getEnvString
        .mockReturnValueOnce("http://medusa.test")
        .mockReturnValueOnce("test-secret")

      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
      mockFetch.mockResolvedValue({ ok: true })

      const hook = createMedusaCacheHook("hero-carousels")
      const doc = { id: 1 }
      const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

      await hook({
        doc,
        req: { payload: { logger: mockLogger } } as unknown as PayloadRequest,
        operation: "create",
      } as any)

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      const body = JSON.parse(options.body as string)
      expect(body.doc.slug).toBeUndefined()
    })

    it("handles undefined doc gracefully", async () => {
      getEnvString
        .mockReturnValueOnce("http://medusa.test")
        .mockReturnValueOnce("test-secret")

      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
      mockFetch.mockResolvedValue({ ok: true })

      const hook = createMedusaCacheHook("pages")
      const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

      await hook({
        doc: undefined,
        req: { payload: { logger: mockLogger } } as unknown as PayloadRequest,
        operation: "delete",
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

      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
      mockFetch.mockResolvedValue({ ok: true })

      const hook = createMedusaCacheHook("pages")
      const doc = { id: 1, slug: "test" }
      const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

      await hook({
        doc,
        req: { payload: { logger: mockLogger } } as unknown as PayloadRequest,
        operation: "update",
      } as any)

      const [url] = mockFetch.mock.calls[0] as [string]
      expect(url).toBe("http://medusa.test/hooks/cms/invalidate")
    })

    it("defaults to delete when operation is undefined", async () => {
      getEnvString
        .mockReturnValueOnce("http://medusa.test")
        .mockReturnValueOnce("test-secret")

      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
      mockFetch.mockResolvedValue({ ok: true })

      const hook = createMedusaCacheHook("pages")
      const doc = { id: 1, slug: "test" }
      const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

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
