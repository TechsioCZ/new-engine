import { describe, expect, it, vi } from "vitest"
import type { UrlRegistry } from "../contracts"
import type { ActiveEntityRouteTarget } from "../model"
import { handleContentProjectionRequest } from "./content-projection-endpoint"

const TOKEN = "urlr-content-projection-token-at-least-32-characters"
const REQUEST_ID = "985d1c16-3582-4b51-8e5a-b365d74d6b07"

const projection = (
  sourceType: "article" | "page",
  sourceId: string,
  overrides: Partial<ActiveEntityRouteTarget["route"]> = {}
): ActiveEntityRouteTarget => ({
  currentSlug: {
    createdAt: "2026-08-19T10:00:00.000Z",
    disposition: "current",
    id: `slug-${sourceType}-${sourceId}`,
    kind: sourceType,
    market: "cz",
    normalizationVersion: 1,
    normalizedSlug: `${sourceType}-${sourceId}`,
    routeId: `route-${sourceType}-${sourceId}`,
  },
  projectionType: "entity",
  route: {
    createdAt: "2026-08-19T10:00:00.000Z",
    equivalenceKey: null,
    id: `route-${sourceType}-${sourceId}`,
    indexPolicy: "indexable",
    kind: sourceType,
    market: "cz",
    sourceId,
    sourceSystem: "payload",
    sourceType,
    staticRouteKey: null,
    status: "active",
    successorRouteId: null,
    targetType: "entity",
    updatedAt: "2026-08-19T10:00:00.000Z",
    version: 3,
    ...overrides,
  },
})

const request = (entries: unknown, token = TOKEN) =>
  new Request(
    "http://herbatika:3000/api/internal/url-registry/content-projections",
    {
      body: JSON.stringify({
        entries,
        market: "cz",
        requestId: REQUEST_ID,
        schemaVersion: 1,
      }),
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      method: "POST",
    }
  )

const registry = (find: UrlRegistry["findActiveEntityRoute"]): UrlRegistry =>
  ({ findActiveEntityRoute: find }) as unknown as UrlRegistry

describe("URL registry content projection endpoint", () => {
  it("returns only exact active indexable CMS projections", async () => {
    const find = vi
      .fn<UrlRegistry["findActiveEntityRoute"]>()
      .mockResolvedValueOnce({
        kind: "found",
        value: projection("article", "42"),
      })
      .mockResolvedValueOnce({
        kind: "found",
        value: projection("page", "7", { indexPolicy: "noindex" }),
      })
      .mockResolvedValueOnce({ kind: "missing" })

    const response = await handleContentProjectionRequest(
      request([
        { sourceId: "42", sourceType: "article" },
        { sourceId: "7", sourceType: "page" },
        { sourceId: "8", sourceType: "page" },
      ]),
      {
        enabled: true,
        projectionToken: TOKEN,
        readRegistry: async () => registry(find),
      }
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toContain("no-store")
    await expect(response.json()).resolves.toEqual({
      market: "cz",
      projections: [
        {
          href: "/poradna/article-42",
          routeVersion: 3,
          sourceId: "42",
          sourceType: "article",
        },
      ],
      requestId: REQUEST_ID,
      schemaVersion: 1,
    })
    expect(find).toHaveBeenNthCalledWith(1, {
      market: "cz",
      sourceId: "42",
      sourceSystem: "payload",
      sourceType: "article",
    })
  })

  it.each([
    {
      entries: [
        { sourceId: "42", sourceType: "article" },
        { sourceId: "42", sourceType: "article" },
      ],
      label: "duplicate",
    },
    {
      entries: [{ sourceId: "42", sourceType: "article" }],
      label: "unknown market",
      market: "xx",
    },
    {
      entries: [{ sourceId: "42", sourceType: "product" }],
      label: "unsupported source type",
    },
    {
      entries: [{ sourceId: " 42", sourceType: "article" }],
      label: "trimmed source id",
    },
  ])("rejects $label input", async ({ entries, market }) => {
    const input = request(entries)
    const body = await input.json()
    const response = await handleContentProjectionRequest(
      new Request(input.url, {
        body: JSON.stringify({ ...body, ...(market ? { market } : {}) }),
        headers: input.headers,
        method: "POST",
      }),
      {
        enabled: true,
        projectionToken: TOKEN,
        readRegistry: async () => registry(vi.fn()),
      }
    )

    expect(response.status).toBe(400)
  })

  it("rejects a cross-market or stale-shaped registry projection", async () => {
    const value = projection("article", "42", { market: "sk" })
    const response = await handleContentProjectionRequest(
      request([{ sourceId: "42", sourceType: "article" }]),
      {
        enabled: true,
        projectionToken: TOKEN,
        readRegistry: async () =>
          registry(vi.fn().mockResolvedValue({ kind: "found", value })),
      }
    )

    expect(response.status).toBe(503)
    expect(response.headers.get("retry-after")).toBe("5")
  })

  it("is hidden when disabled and rejects the wrong bearer token", async () => {
    const input = request([{ sourceId: "42", sourceType: "article" }])
    const readRegistry = vi.fn()
    const disabled = await handleContentProjectionRequest(input.clone(), {
      enabled: false,
      projectionToken: TOKEN,
      readRegistry,
    })
    const unauthorized = await handleContentProjectionRequest(
      request([{ sourceId: "42", sourceType: "article" }], `${TOKEN}-wrong`),
      { enabled: true, projectionToken: TOKEN, readRegistry }
    )

    expect(disabled.status).toBe(404)
    expect(unauthorized.status).toBe(401)
    expect(readRegistry).not.toHaveBeenCalled()
  })
})
