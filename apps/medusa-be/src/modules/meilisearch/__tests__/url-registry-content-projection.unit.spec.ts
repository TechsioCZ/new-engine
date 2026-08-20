import { afterEach, describe, expect, it, vi } from "vitest"
import {
  contentProjectionKey,
  marketFromContentLocale,
  readUrlRegistryContentProjectionConfig,
  resolveContentProjectionHrefs,
  UrlRegistryContentProjectionClient,
  UrlRegistryContentProjectionError,
} from "../url-registry-content-projection"

const TOKEN = "urlr-content-projection-token-at-least-32-characters"
const URL =
  "http://herbatika:3000/api/internal/url-registry/content-projections"
const UUID_PATTERN = /^[0-9a-f-]{36}$/

const config = () => {
  const value = readUrlRegistryContentProjectionConfig({
    URL_REGISTRY_CONTENT_PROJECTION_ENABLED: "1",
    URL_REGISTRY_CONTENT_PROJECTION_TOKEN: TOKEN,
    URL_REGISTRY_CONTENT_PROJECTION_URL: URL,
    URL_REGISTRY_HERBATIKA_INTERNAL_ORIGIN: "http://herbatika:3000",
  })
  if (!value) {
    throw new Error("Expected enabled projection config")
  }
  return value
}

const jsonResponse = (body: unknown, status = 200) =>
  Response.json(body, { status })

const validBody = (overrides: Record<string, unknown> = {}) => ({
  market: "cz",
  projections: [
    {
      href: "/poradna/bylinky",
      routeVersion: 3,
      sourceId: "42",
      sourceType: "article",
    },
  ],
  schemaVersion: 1,
  ...overrides,
})

const responseForRequest = (
  init: RequestInit | undefined,
  body: Record<string, unknown> = validBody()
) => {
  const requestBody = JSON.parse(String(init?.body)) as { requestId: string }
  return jsonResponse({ requestId: requestBody.requestId, ...body })
}

describe("URL registry CMS content projection client", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("is disabled by default and validates its dedicated endpoint", () => {
    expect(readUrlRegistryContentProjectionConfig({})).toBeNull()
    expect(() =>
      readUrlRegistryContentProjectionConfig({
        URL_REGISTRY_CONTENT_PROJECTION_ENABLED: "1",
        URL_REGISTRY_CONTENT_PROJECTION_TOKEN: TOKEN,
        URL_REGISTRY_CONTENT_PROJECTION_URL: "http://attacker.invalid/steal",
        URL_REGISTRY_HERBATIKA_INTERNAL_ORIGIN: "http://herbatika:3000",
      })
    ).toThrow(UrlRegistryContentProjectionError)
    expect(() =>
      readUrlRegistryContentProjectionConfig({
        URL_REGISTRY_CONTENT_PROJECTION_ENABLED: "1",
        URL_REGISTRY_CONTENT_PROJECTION_TOKEN: "short",
        URL_REGISTRY_CONTENT_PROJECTION_URL: URL,
        URL_REGISTRY_HERBATIKA_INTERNAL_ORIGIN: "http://herbatika:3000",
      })
    ).toThrow(UrlRegistryContentProjectionError)
  })

  it("accepts a dynamic internal service alias only when both URLs share its origin", () => {
    expect(
      readUrlRegistryContentProjectionConfig({
        URL_REGISTRY_CONTENT_PROJECTION_ENABLED: "1",
        URL_REGISTRY_CONTENT_PROJECTION_TOKEN: TOKEN,
        URL_REGISTRY_CONTENT_PROJECTION_URL:
          "http://herbatika-production-a1b2:3000/api/internal/url-registry/content-projections",
        URL_REGISTRY_HERBATIKA_INTERNAL_ORIGIN:
          "http://herbatika-production-a1b2:3000",
      })?.url.origin
    ).toBe("http://herbatika-production-a1b2:3000")

    expect(() =>
      readUrlRegistryContentProjectionConfig({
        URL_REGISTRY_CONTENT_PROJECTION_ENABLED: "1",
        URL_REGISTRY_CONTENT_PROJECTION_TOKEN: TOKEN,
        URL_REGISTRY_CONTENT_PROJECTION_URL:
          "http://different-service:3000/api/internal/url-registry/content-projections",
        URL_REGISTRY_HERBATIKA_INTERNAL_ORIGIN:
          "http://herbatika-production-a1b2:3000",
      })
    ).toThrow(UrlRegistryContentProjectionError)
  })

  it.each([
    ["sk-SK", "sk"],
    ["cs_CZ", "cz"],
    ["hu-HU", "hu"],
    ["ro", "ro"],
    ["en-US", null],
  ])("maps %s to its exact market", (locale, market) => {
    expect(marketFromContentLocale(locale)).toBe(market)
  })

  it("sends the exact authenticated batch and accepts only its projection", async () => {
    const fetchMock = vi.fn(async (_input, requestInit) =>
      responseForRequest(requestInit)
    )
    const client = new UrlRegistryContentProjectionClient(
      config(),
      fetchMock as unknown as typeof fetch
    )

    const result = await client.resolve("cz", [
      { sourceId: "42", sourceType: "article" },
      { sourceId: "7", sourceType: "page" },
    ])

    expect(result).toEqual(
      new Map([[contentProjectionKey("article", "42"), "/poradna/bylinky"]])
    )
    const [requestedUrl, actualInit] = fetchMock.mock.calls[0] ?? []
    expect(String(requestedUrl)).toBe(URL)
    expect(actualInit).toMatchObject({
      headers: {
        authorization: `Bearer ${TOKEN}`,
        "content-type": "application/json",
      },
      method: "POST",
      redirect: "error",
    })
    expect(JSON.parse(String(actualInit?.body))).toMatchObject({
      entries: [
        { sourceId: "42", sourceType: "article" },
        { sourceId: "7", sourceType: "page" },
      ],
      market: "cz",
      schemaVersion: 1,
    })
    expect(JSON.parse(String(actualInit?.body)).requestId).toMatch(UUID_PATTERN)
  })

  it("retries a transient failure once", async () => {
    const fetchMock = vi.fn(async (_input, init) =>
      fetchMock.mock.calls.length === 1
        ? jsonResponse({ error: "unavailable" }, 503)
        : responseForRequest(init)
    )
    const client = new UrlRegistryContentProjectionClient(
      config(),
      fetchMock as unknown as typeof fetch
    )

    await expect(
      client.resolve("cz", [{ sourceId: "42", sourceType: "article" }])
    ).resolves.toEqual(
      new Map([[contentProjectionKey("article", "42"), "/poradna/bylinky"]])
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it.each([
    ["wrong market", validBody({ market: "sk" })],
    [
      "stale request",
      validBody({ requestId: "985d1c16-3582-4b51-8e5a-b365d74d6b07" }),
    ],
    [
      "stale route version",
      validBody({
        projections: [
          {
            href: "/poradna/bylinky",
            routeVersion: 0,
            sourceId: "42",
            sourceType: "article",
          },
        ],
      }),
    ],
    [
      "unexpected source",
      validBody({
        projections: [
          {
            href: "/poradna/bylinky",
            routeVersion: 3,
            sourceId: "99",
            sourceType: "article",
          },
        ],
      }),
    ],
    [
      "duplicate projection",
      validBody({
        projections: [
          {
            href: "/poradna/bylinky",
            routeVersion: 3,
            sourceId: "42",
            sourceType: "article",
          },
          {
            href: "/poradna/bylinky",
            routeVersion: 3,
            sourceId: "42",
            sourceType: "article",
          },
        ],
      }),
    ],
    [
      "internal href",
      validBody({
        projections: [
          {
            href: "/~sf/cz/poradna/bylinky",
            routeVersion: 3,
            sourceId: "42",
            sourceType: "article",
          },
        ],
      }),
    ],
  ])("rejects a %s response", async (_label, body) => {
    const client = new UrlRegistryContentProjectionClient(
      config(),
      vi.fn(async (_input, init) =>
        responseForRequest(init, body)
      ) as unknown as typeof fetch
    )

    await expect(
      client.resolve("cz", [{ sourceId: "42", sourceType: "article" }])
    ).rejects.toBeInstanceOf(UrlRegistryContentProjectionError)
  })

  it("rejects duplicate request identities before making a request", async () => {
    const fetchMock = vi.fn()
    const client = new UrlRegistryContentProjectionClient(
      config(),
      fetchMock as unknown as typeof fetch
    )

    await expect(
      client.resolve("cz", [
        { sourceId: "42", sourceType: "article" },
        { sourceId: "42", sourceType: "article" },
      ])
    ).rejects.toBeInstanceOf(UrlRegistryContentProjectionError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("resolves a bounded synchronization page in exact 100-entry requests", async () => {
    const fetchMock = vi.fn(async (_input, init) => {
      const request = JSON.parse(String(init?.body)) as {
        entries: Array<{ sourceId: string; sourceType: "article" }>
        market: string
        requestId: string
      }
      return jsonResponse({
        market: request.market,
        projections: request.entries.map((entry) => ({
          href: `/poradna/article-${entry.sourceId}`,
          routeVersion: 1,
          ...entry,
        })),
        requestId: request.requestId,
        schemaVersion: 1,
      })
    })
    vi.stubGlobal("fetch", fetchMock)
    const entries = Array.from({ length: 500 }, (_, index) => ({
      sourceId: String(index + 1),
      sourceType: "article" as const,
    }))

    const result = await resolveContentProjectionHrefs(
      entries,
      "cs-CZ",
      { warn: vi.fn() },
      {
        URL_REGISTRY_CONTENT_PROJECTION_ENABLED: "1",
        URL_REGISTRY_CONTENT_PROJECTION_TOKEN: TOKEN,
        URL_REGISTRY_CONTENT_PROJECTION_URL: URL,
        URL_REGISTRY_HERBATIKA_INTERNAL_ORIGIN: "http://herbatika:3000",
      }
    )

    expect(fetchMock).toHaveBeenCalledTimes(5)
    expect(result).toHaveLength(500)
    for (const [, init] of fetchMock.mock.calls) {
      expect(JSON.parse(String(init?.body)).entries).toHaveLength(100)
    }
  })

  it("fails closed on duplicate identities across synchronization requests", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const entries = Array.from({ length: 101 }, (_, index) => ({
      sourceId: String(index % 100),
      sourceType: "article" as const,
    }))
    const warn = vi.fn()

    await expect(
      resolveContentProjectionHrefs(
        entries,
        "cs-CZ",
        { warn },
        {
          URL_REGISTRY_CONTENT_PROJECTION_ENABLED: "1",
          URL_REGISTRY_CONTENT_PROJECTION_TOKEN: TOKEN,
          URL_REGISTRY_CONTENT_PROJECTION_URL: URL,
          URL_REGISTRY_HERBATIKA_INTERNAL_ORIGIN: "http://herbatika:3000",
        }
      )
    ).resolves.toEqual(new Map())
    expect(fetchMock).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledOnce()
  })
})
