import type { MockedFunction, MockInstance } from "vitest"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { getEnvString as GetEnvString } from "@/lib/utils/env"
import type { createRequestTimeout as CreateRequestTimeout } from "@/lib/utils/request"

vi.mock(import("@/lib/utils/env"), () => ({
  getEnvString: vi.fn<typeof GetEnvString>(),
}))

vi.mock(import("@/lib/utils/request"), () => ({
  createRequestTimeout: vi.fn<typeof CreateRequestTimeout>(() => ({
    clearTimeout: vi.fn<() => void>(),
    controller: new AbortController(),
  })),
}))

interface HookArguments {
  doc?: unknown
  operation?: string
  previousDoc?: unknown
  req?: {
    locale?: string | null
    payload: {
      logger: ReturnType<typeof createMockLogger>
    }
  } | null
}

interface InvalidationDocument {
  id?: unknown
  globalVisibilityChange?: unknown
  locale?: unknown
  previousSlug?: unknown
  slug?: unknown
}

interface InvalidationBody {
  collection: unknown
  doc: InvalidationDocument
}

const createMockLogger = () => ({
  error: vi.fn<(message: string) => void>(),
  info: vi.fn<(message: string) => void>(),
  warn: vi.fn<(message: string) => void>(),
})

const okResponse = () => new Response(null, { status: 204 })

const invokeHook = async (
  hook: CallableFunction,
  hookArguments: HookArguments,
): Promise<unknown> => {
  const result: unknown = Reflect.apply(hook, undefined, [hookArguments])
  return await Promise.resolve(result)
}

const createHook = async (collection: string) => {
  const { createMedusaCacheHook } = await import("@/lib/hooks/medusa-cache")
  return createMedusaCacheHook(collection)
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const parseInvalidationBody = (
  fetchSpy: MockInstance<typeof fetch>,
): InvalidationBody => {
  const call = fetchSpy.mock.lastCall
  if (!call) {
    throw new Error("Expected fetch to have been called")
  }

  const [, options] = call
  if (!options || typeof options.body !== "string") {
    throw new Error("Expected fetch to receive a string body")
  }

  const parsed: unknown = JSON.parse(options.body)
  if (!isRecord(parsed)) {
    throw new Error("Expected a valid cache invalidation body")
  }

  const { collection, doc } = parsed
  if (!isRecord(doc)) {
    throw new Error("Expected invalidation body to contain a document")
  }

  return { collection, doc }
}

const getLastFetchUrl = (fetchSpy: MockInstance<typeof fetch>): unknown => {
  const call = fetchSpy.mock.lastCall
  if (!call) {
    throw new Error("Expected fetch to have been called")
  }
  return call[0]
}

describe("medusaCache hooks", () => {
  let fetchSpy: MockInstance<typeof fetch>
  let getEnvString: MockedFunction<typeof GetEnvString>

  beforeEach(async () => {
    vi.resetModules()
    fetchSpy = vi.spyOn(globalThis, "fetch")
    const envModule = await import("@/lib/utils/env")
    ;({ getEnvString } = vi.mocked(envModule))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns a hook function", async () => {
    const hook = await createHook("pages")
    expect(hook).toBeTypeOf("function")
  })

  it("returns doc unchanged for unsupported operations", async () => {
    getEnvString.mockReturnValue("http://medusa.test")
    const hook = await createHook("pages")
    const doc = { id: 1, slug: "test" }

    const result = await invokeHook(hook, {
      doc,
      operation: "read",
      req: null,
    })

    expect(result).toBe(doc)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("notifies Medusa on create operation", async () => {
    getEnvString
      .mockReturnValueOnce("http://medusa.test")
      .mockReturnValueOnce("test-secret")
    fetchSpy.mockResolvedValue(okResponse())

    const hook = await createHook("pages")
    const mockLogger = createMockLogger()

    await invokeHook(hook, {
      doc: { contentHTML: "<p>private draft</p>", id: 1, slug: "home" },
      operation: "create",
      req: { locale: "en", payload: { logger: mockLogger } },
    })

    const call = fetchSpy.mock.lastCall
    expect(call?.[0]).toBe("http://medusa.test/hooks/cms/invalidate")
    const options = call?.[1]
    expect(options?.method).toBe("POST")
    expect(options?.headers).toBeDefined()
    const headers = new Headers(options?.headers)
    expect(headers.get("Content-Type")).toBe("application/json")
    expect(headers.get("x-payload-signature")).toMatch(/^[\da-f]{64}$/u)
  })

  it("does not log CMS document content", async () => {
    getEnvString
      .mockReturnValueOnce("http://medusa.test")
      .mockReturnValueOnce("test-secret")
    fetchSpy.mockResolvedValue(okResponse())
    const mockLogger = createMockLogger()
    const hook = await createHook("pages")

    await invokeHook(hook, {
      doc: { contentHTML: "<p>private draft</p>", id: 1, slug: "home" },
      operation: "create",
      req: { locale: "en", payload: { logger: mockLogger } },
    })

    expect(mockLogger.info.mock.calls[0]?.[0]).not.toContain("private draft")
  })

  it("notifies Medusa on update operation", async () => {
    getEnvString
      .mockReturnValueOnce("http://medusa.test")
      .mockReturnValueOnce("test-secret")
    fetchSpy.mockResolvedValue(okResponse())

    const hook = await createHook("articles")
    await invokeHook(hook, {
      doc: { id: 2, slug: "news" },
      operation: "update",
      req: { locale: "cs", payload: { logger: createMockLogger() } },
    })

    const body = parseInvalidationBody(fetchSpy)
    expect(body.collection).toBe("articles")
    expect(body.doc.slug).toBe("news")
    expect(body.doc.locale).toBe("cs")
  })

  it("notifies Medusa on delete operation without locale", async () => {
    getEnvString
      .mockReturnValueOnce("http://medusa.test")
      .mockReturnValueOnce("test-secret")
    fetchSpy.mockResolvedValue(okResponse())

    const hook = await createHook("pages")
    await invokeHook(hook, {
      doc: { id: 3, slug: "about" },
      operation: "delete",
      req: { locale: "en", payload: { logger: createMockLogger() } },
    })

    const body = parseInvalidationBody(fetchSpy)
    expect(body.doc.locale).toBeUndefined()
  })

  it("skips notification when MEDUSA_BACKEND_URL is not set", async () => {
    getEnvString.mockReturnValue(null)
    const hook = await createHook("pages")
    const mockLogger = createMockLogger()

    await invokeHook(hook, {
      doc: { id: 1, slug: "test" },
      operation: "update",
      req: { payload: { logger: mockLogger } },
    })

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("MEDUSA_BACKEND_URL is not set"),
    )
  })

  it("logs warning only once for missing MEDUSA_BACKEND_URL", async () => {
    getEnvString.mockReturnValue(null)
    const hook = await createHook("pages")
    const mockLogger = createMockLogger()
    const hookArguments: HookArguments = {
      doc: { id: 1, slug: "test" },
      operation: "update",
      req: { payload: { logger: mockLogger } },
    }

    await invokeHook(hook, hookArguments)
    await invokeHook(hook, hookArguments)

    expect(mockLogger.warn).toHaveBeenCalledOnce()
  })

  it("throws when PAYLOAD_WEBHOOK_SECRET is not set", async () => {
    getEnvString
      .mockReturnValueOnce("http://medusa.test")
      .mockReturnValueOnce(null)

    const hook = await createHook("pages")
    await expect(
      invokeHook(hook, {
        doc: { id: 1, slug: "test" },
        operation: "update",
        req: { payload: { logger: createMockLogger() } },
      }),
    ).rejects.toThrow("PAYLOAD_WEBHOOK_SECRET is not set")
  })

  it("logs error when fetch fails", async () => {
    getEnvString
      .mockReturnValueOnce("http://medusa.test")
      .mockReturnValueOnce("test-secret")
    fetchSpy.mockRejectedValue(new Error("Network error"))

    const hook = await createHook("pages")
    const mockLogger = createMockLogger()
    await expect(
      invokeHook(hook, {
        doc: { id: 1, slug: "test" },
        operation: "create",
        req: { payload: { logger: mockLogger } },
      }),
    ).rejects.toThrow("failed after 3 attempts")

    expect(fetchSpy).toHaveBeenCalledTimes(3)
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("Network error"),
    )
  })

  it("logs error when response is not ok", async () => {
    getEnvString
      .mockReturnValueOnce("http://medusa.test")
      .mockReturnValueOnce("test-secret")
    fetchSpy.mockResolvedValue(
      new Response("Internal Server Error", { status: 500 }),
    )

    const hook = await createHook("pages")
    const mockLogger = createMockLogger()
    await expect(
      invokeHook(hook, {
        doc: { id: 1, slug: "test" },
        operation: "update",
        req: { payload: { logger: mockLogger } },
      }),
    ).rejects.toThrow("failed after 3 attempts")

    expect(fetchSpy).toHaveBeenCalledTimes(3)
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("Medusa rejected CMS cache invalidation (500)"),
    )
  })

  it("marks status changes as global and carries the previous slug", async () => {
    getEnvString
      .mockReturnValueOnce("http://medusa.test")
      .mockReturnValueOnce("test-secret")
    fetchSpy.mockResolvedValue(okResponse())

    const hook = await createHook("pages")
    await invokeHook(hook, {
      doc: { id: 1, slug: "new-slug", status: "published" },
      operation: "update",
      previousDoc: { id: 1, slug: "old-slug", status: "draft" },
      req: { locale: "en", payload: { logger: createMockLogger() } },
    })

    const body = parseInvalidationBody(fetchSpy)
    expect(body.doc).toMatchObject({
      globalVisibilityChange: true,
      previousSlug: "old-slug",
      slug: "new-slug",
    })
    expect(body.doc.locale).toBeUndefined()
  })

  it("handles localized slug objects", async () => {
    getEnvString
      .mockReturnValueOnce("http://medusa.test")
      .mockReturnValueOnce("test-secret")
    fetchSpy.mockResolvedValue(okResponse())

    const hook = await createHook("articles")
    await invokeHook(hook, {
      doc: { id: 1, slug: { cs: "czech-slug", en: "english-slug" } },
      operation: "update",
      req: { locale: "cs", payload: { logger: createMockLogger() } },
    })

    const body = parseInvalidationBody(fetchSpy)
    expect(body.doc.slug).toBe("czech-slug")
  })

  it("handles doc without slug", async () => {
    getEnvString
      .mockReturnValueOnce("http://medusa.test")
      .mockReturnValueOnce("test-secret")
    fetchSpy.mockResolvedValue(okResponse())

    const hook = await createHook("hero-carousels")
    await invokeHook(hook, {
      doc: { id: 1 },
      operation: "create",
      req: { payload: { logger: createMockLogger() } },
    })

    const body = parseInvalidationBody(fetchSpy)
    expect(body.doc.slug).toBeUndefined()
  })

  it("notifies Medusa for media changes without slug", async () => {
    getEnvString
      .mockReturnValueOnce("http://medusa.test")
      .mockReturnValueOnce("test-secret")
    fetchSpy.mockResolvedValue(okResponse())

    const hook = await createHook("media")
    await invokeHook(hook, {
      doc: { filename: "image.png", id: 1 },
      operation: "update",
      req: { locale: "cs", payload: { logger: createMockLogger() } },
    })

    const body = parseInvalidationBody(fetchSpy)
    expect(body.collection).toBe("media")
    expect(body.doc.id).toBe("1")
    expect(body.doc.slug).toBeUndefined()
    expect(body.doc.locale).toBe("cs")
  })

  it("omits locale when Payload provides null locale", async () => {
    getEnvString
      .mockReturnValueOnce("http://medusa.test")
      .mockReturnValueOnce("test-secret")
    fetchSpy.mockResolvedValue(okResponse())

    const hook = await createHook("pages")
    await invokeHook(hook, {
      doc: { id: 1, slug: { en: "home" } },
      operation: "update",
      req: { locale: null, payload: { logger: createMockLogger() } },
    })

    const body = parseInvalidationBody(fetchSpy)
    expect(body.doc.locale).toBeUndefined()
    expect(body.doc.slug).toBeUndefined()
  })

  it("handles undefined doc gracefully", async () => {
    getEnvString
      .mockReturnValueOnce("http://medusa.test")
      .mockReturnValueOnce("test-secret")
    fetchSpy.mockResolvedValue(okResponse())

    const hook = await createHook("pages")
    await invokeHook(hook, {
      operation: "delete",
      req: { payload: { logger: createMockLogger() } },
    })

    const body = parseInvalidationBody(fetchSpy)
    expect(body.doc.id).toBeUndefined()
    expect(body.doc.slug).toBeUndefined()
  })

  it("removes trailing slash from MEDUSA_BACKEND_URL", async () => {
    getEnvString
      .mockReturnValueOnce("http://medusa.test/")
      .mockReturnValueOnce("test-secret")
    fetchSpy.mockResolvedValue(okResponse())

    const hook = await createHook("pages")
    await invokeHook(hook, {
      doc: { id: 1, slug: "test" },
      operation: "update",
      req: { payload: { logger: createMockLogger() } },
    })

    expect(getLastFetchUrl(fetchSpy)).toBe(
      "http://medusa.test/hooks/cms/invalidate",
    )
  })

  it("defaults to delete when operation is undefined", async () => {
    getEnvString
      .mockReturnValueOnce("http://medusa.test")
      .mockReturnValueOnce("test-secret")
    fetchSpy.mockResolvedValue(okResponse())

    const hook = await createHook("pages")
    await invokeHook(hook, {
      doc: { id: 1, slug: "test" },
      req: { locale: "en", payload: { logger: createMockLogger() } },
    })

    const body = parseInvalidationBody(fetchSpy)
    expect(body.doc.locale).toBeUndefined()
  })
})
