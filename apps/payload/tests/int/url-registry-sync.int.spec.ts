import type { PayloadRequest } from "payload"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createUrlRegistrySyncHook } from "@/lib/hooks/url-registry-sync"

type TestEnvironment = Record<string, string | undefined>

const createEnvironment = (): TestEnvironment => ({
  HERBATICA_ORIGIN_SK: "https://sk.herbatika.test/",
  HERBATICA_ORIGIN_CZ: "https://cz.herbatika.test/",
  HERBATICA_ORIGIN_HU: "https://hu.herbatika.test/",
  HERBATICA_ORIGIN_RO: "https://ro.herbatika.test/",
  URL_REGISTRY_ADMIN_TOKEN: "registry-secret",
})

const createLogger = () => ({
  error: vi.fn(),
  warn: vi.fn(),
})

const createReq = (locale: string, logger = createLogger()) =>
  ({ locale, payload: { logger } }) as unknown as PayloadRequest

const requestBody = (call: unknown[]) => {
  const options = call[1] as RequestInit
  return JSON.parse(options.body as string)
}

describe("createUrlRegistrySyncHook", () => {
  let environment: TestEnvironment
  let originalFetch: typeof globalThis.fetch
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    environment = createEnvironment()
    originalFetch = globalThis.fetch
    fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it("supports an explicit isolated-seed opt-out", async () => {
    environment.URL_REGISTRY_SYNC_ENABLED = "0"
    const hook = createUrlRegistrySyncHook("page", environment)
    const doc = {
      id: 1,
      slug: "seed-only",
      status: "published",
      visibility: "public",
    }

    await expect(
      hook({ doc, operation: "create", req: createReq("sk") } as any)
    ).resolves.toBe(doc)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("removes every public URL for a customers-only page", async () => {
    const hook = createUrlRegistrySyncHook("page", environment)
    const doc = {
      id: 42,
      slug: "sukromna-stranka",
      status: "published",
      visibility: "customers-only",
    }

    const result = await hook({
      doc,
      operation: "update",
      req: createReq("cs"),
    } as any)

    expect(result).toBe(doc)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://sk.herbatika.test/api/url-registry/tombstone-all"
    )
    expect(requestBody(fetchMock.mock.calls[0])).toEqual({
      kind: "page",
      entityId: "42",
    })
  })

  it("makes published articles indexable", async () => {
    const hook = createUrlRegistrySyncHook("article", environment)

    await hook({
      doc: {
        id: "article-7",
        slug: "novinky",
        status: "published",
      },
      operation: "create",
      req: createReq("sk"),
    } as any)

    expect(requestBody(fetchMock.mock.calls[0])).toMatchObject({
      kind: "article",
      entityId: "article-7",
      equivalenceKey: "article:article-7",
      indexable: true,
    })
  })

  it("tombstones every market when a global status becomes draft", async () => {
    const hook = createUrlRegistrySyncHook("page", environment)
    const doc = { id: 9, slug: "draft", status: "draft" }

    const result = await hook({
      doc,
      operation: "update",
      req: createReq("hu"),
    } as any)

    expect(result).toBe(doc)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(requestBody(fetchMock.mock.calls[0])).toEqual({
      kind: "page",
      entityId: "9",
    })
  })

  it("tombstones all four markets after document deletion", async () => {
    const hook = createUrlRegistrySyncHook("article", environment)
    const doc = { id: "deleted-1" }

    const result = await hook({ doc, req: createReq("en") } as any)

    expect(result).toBe(doc)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://sk.herbatika.test/api/url-registry/tombstone-all"
    )
    expect(requestBody(fetchMock.mock.calls[0])).toEqual({
      kind: "article",
      entityId: "deleted-1",
    })
  })

  it("treats a locale tombstone 404 as an idempotent success", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }))
    const logger = createLogger()
    const hook = createUrlRegistrySyncHook("page", environment)
    const doc = { id: 10, status: "published", visibility: "public" }

    await expect(
      hook({
        doc,
        operation: "update",
        req: createReq("ro", logger),
      } as any)
    ).resolves.toBe(doc)
    expect(logger.error).not.toHaveBeenCalled()
  })

  it("warns once and skips unsupported locales", async () => {
    const logger = createLogger()
    const hook = createUrlRegistrySyncHook("page", environment)
    const doc = {
      id: 11,
      slug: "english",
      status: "published",
      visibility: "public",
    }

    await expect(
      hook({
        doc,
        operation: "update",
        req: createReq("en", logger),
      } as any)
    ).resolves.toBe(doc)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledWith(
      'Unsupported Payload locale "en" for URL registry sync; skipping.'
    )
  })

  it("throws visibly for missing or invalid supported-market config", async () => {
    const args = {
      doc: {
        id: 12,
        slug: "stranka",
        status: "published",
        visibility: "public",
      },
      operation: "update",
      req: createReq("cs"),
    }

    const missingEnvironment = {
      ...createEnvironment(),
      HERBATICA_ORIGIN_CZ: undefined,
    }
    const missingHook = createUrlRegistrySyncHook("page", missingEnvironment)
    let error: unknown
    try {
      await missingHook(args as any)
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain("HERBATICA_ORIGIN_CZ")
    expect(fetchMock).not.toHaveBeenCalled()

    const invalidEnvironment = {
      ...createEnvironment(),
      HERBATICA_ORIGIN_CZ: "file:///tmp/registry",
    }
    const invalidHook = createUrlRegistrySyncHook("page", invalidEnvironment)
    error = undefined
    try {
      await invalidHook(args as any)
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain("HERBATICA_ORIGIN_CZ")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("throws visibly when the admin token is missing", async () => {
    environment.URL_REGISTRY_ADMIN_TOKEN = undefined
    const hook = createUrlRegistrySyncHook("article", environment)

    await expect(
      hook({
        doc: { id: 13, slug: "clanok", status: "published" },
        operation: "create",
        req: createReq("sk"),
      } as any)
    ).rejects.toMatchObject({
      message: expect.stringContaining("URL_REGISTRY_ADMIN_TOKEN"),
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("reports network failures without exposing secrets or request data", async () => {
    fetchMock.mockRejectedValue(
      new Error("registry-secret failed while sending secret-slug")
    )
    const logger = createLogger()
    const hook = createUrlRegistrySyncHook("article", environment)

    await expect(
      hook({
        doc: { id: 14, slug: "secret-slug", status: "published" },
        operation: "update",
        req: createReq("sk", logger),
      } as any)
    ).rejects.toMatchObject({ message: "URL registry request failed." })

    expect(logger.error).toHaveBeenCalledWith(
      "URL registry request failed: status=network market=sk kind=article entity=14"
    )
    const logOutput = JSON.stringify(logger.error.mock.calls)
    expect(logOutput).not.toContain("registry-secret")
    expect(logOutput).not.toContain("secret-slug")
  })

  it("throws a safe generic error for non-OK sync responses", async () => {
    fetchMock.mockResolvedValue(
      new Response("sensitive upstream response", { status: 500 })
    )
    const logger = createLogger()
    const hook = createUrlRegistrySyncHook("page", environment)

    await expect(
      hook({
        doc: {
          id: 15,
          slug: "page-slug",
          status: "published",
          visibility: "public",
        },
        operation: "update",
        req: createReq("ro", logger),
      } as any)
    ).rejects.toMatchObject({ message: "URL registry request failed." })

    expect(logger.error).toHaveBeenCalledWith(
      "URL registry request failed: status=500 market=ro kind=page entity=15"
    )
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(
      "sensitive upstream response"
    )
  })
})
