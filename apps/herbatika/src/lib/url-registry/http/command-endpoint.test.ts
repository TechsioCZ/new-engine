import { describe, expect, it, vi } from "vitest"
import type {
  EntityRouteMutationResult,
  UrlRegistry,
  UrlRegistryCommand,
} from "../contracts"
import { UrlRegistryError } from "../errors"
import { assertCommandRequest } from "../postgres/request-validation"
import { handleUrlRegistryCommandRequest } from "./command-endpoint"

const TOKEN = "urlr-command-token-with-at-least-32-characters"
const FINGERPRINT = `sha256:${"a".repeat(64)}`

const createCommand = () => ({
  commandVersion: 1,
  idempotencyKey: "medusa:product:created:event-1:cz",
  requestFingerprint: FINGERPRINT,
  request: {
    commandType: "create-entity-route",
    expectedVersion: 0,
    route: {
      equivalenceKey: "product:prod_1",
      identity: {
        sourceId: "prod_1",
        sourceSystem: "medusa",
        sourceType: "product",
        staticRouteKey: null,
        targetType: "entity",
      },
      indexPolicy: "indexable",
      kind: "product",
      market: "cz",
    },
    slug: { normalizationVersion: 1, normalizedSlug: "zeleny-caj" },
    source: {
      producer: "medusa-product-url",
      sourceEventId: "event-1:cz",
      sourceId: "prod_1",
      sourceSystem: "medusa",
      sourceType: "product",
      sourceVersion: "2026-08-18T10:00:00.000Z",
    },
  },
})

const RESULT = {
  affectedRouteIds: ["route_1"],
  commit: {
    audit: { id: "audit_1" },
    invalidation: { id: "outbox_1" },
    outcome: "applied",
    replayed: false,
  },
  snapshot: { route: { id: "route_1", version: 1 } },
} as unknown as EntityRouteMutationResult

const createRegistry = (overrides: Partial<UrlRegistry> = {}): UrlRegistry =>
  overrides as UrlRegistry

const request = (
  body: unknown,
  options: Readonly<{
    authorization?: string
    contentType?: string
  }> = {}
) =>
  new Request("https://internal.test/api/internal/url-registry/commands", {
    body: JSON.stringify(body),
    headers: {
      authorization: options.authorization ?? `Bearer ${TOKEN}`,
      "content-type": options.contentType ?? "application/json",
    },
    method: "POST",
  })

describe("handleUrlRegistryCommandRequest", () => {
  it("stays hidden while the command boundary is disabled", async () => {
    const readRegistry = vi.fn()
    const response = await handleUrlRegistryCommandRequest(
      request(createCommand()),
      {
        commandToken: TOKEN,
        enabled: false,
        readRegistry,
      }
    )

    expect(response.status).toBe(404)
    expect(readRegistry).not.toHaveBeenCalled()
  })

  it("authenticates before parsing a body or opening the registry", async () => {
    const readRegistry = vi.fn()
    const response = await handleUrlRegistryCommandRequest(
      request(createCommand(), { authorization: "Bearer invalid" }),
      {
        commandToken: TOKEN,
        enabled: true,
        readRegistry,
      }
    )

    expect(response.status).toBe(401)
    expect(response.headers.get("www-authenticate")).toBe("Bearer")
    expect(readRegistry).not.toHaveBeenCalled()
  })

  it("dispatches a valid command and returns a bounded acknowledgement", async () => {
    const createEntityRoute = vi.fn().mockResolvedValue(RESULT)
    const response = await handleUrlRegistryCommandRequest(
      request(createCommand()),
      {
        commandToken: TOKEN,
        enabled: true,
        readRegistry: async () => createRegistry({ createEntityRoute }),
      }
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toContain("no-store")
    expect(await response.json()).toEqual({
      auditId: "audit_1",
      outcome: "applied",
      replayed: false,
      resultVersion: 1,
      routeId: "route_1",
    })
    expect(createEntityRoute).toHaveBeenCalledWith(createCommand())
  })

  it.each([
    ["text/plain", createCommand()],
    ["application/jsonp", createCommand()],
    ["application/json", null],
    ["application/json", { ...createCommand(), commandVersion: 2 }],
    [
      "application/json",
      {
        ...createCommand(),
        request: { ...createCommand().request, commandType: "unknown" },
      },
    ],
  ])("rejects a malformed command request", async (contentType, body) => {
    const readRegistry = vi.fn()
    const response = await handleUrlRegistryCommandRequest(
      request(body, { contentType }),
      {
        commandToken: TOKEN,
        enabled: true,
        readRegistry,
      }
    )

    expect(response.status).toBe(400)
    expect(readRegistry).not.toHaveBeenCalled()
  })

  it("rejects an oversized body before opening the registry", async () => {
    const readRegistry = vi.fn()
    const response = await handleUrlRegistryCommandRequest(
      request({ payload: "x".repeat(70_000) }),
      {
        commandToken: TOKEN,
        enabled: true,
        readRegistry,
      }
    )

    expect(response.status).toBe(413)
    expect(readRegistry).not.toHaveBeenCalled()
  })

  it("lets the registry classify a malformed route mutation", async () => {
    const malformedCommand = {
      ...createCommand(),
      request: {
        commandType: "update-route",
        expectedVersion: 1,
        metadata: {
          equivalenceKey: "product:prod_1",
          indexPolicy: "indexable",
        },
        source: createCommand().request.source,
      },
    }
    const updateRoute = vi.fn((command: UrlRegistryCommand) => {
      assertCommandRequest(command, "update-route")
      throw new Error("unreachable")
    })
    const response = await handleUrlRegistryCommandRequest(
      request(malformedCommand),
      {
        commandToken: TOKEN,
        enabled: true,
        readRegistry: async () =>
          createRegistry({
            updateRoute: updateRoute as UrlRegistry["updateRoute"],
          }),
      }
    )

    expect(response.status).toBe(400)
    expect(updateRoute).toHaveBeenCalledOnce()
  })

  it.each([
    ["INVALID_COMMAND", 400],
    ["INVALID_REQUEST_FINGERPRINT", 400],
    ["NOT_FOUND", 404],
    ["VERSION_CONFLICT", 409],
    ["SLUG_CONFLICT", 409],
    ["INVARIANT_VIOLATION", 503],
  ] as const)("maps URLR error %s to %s", async (code, status) => {
    const createEntityRoute = vi
      .fn()
      .mockRejectedValue(new UrlRegistryError(code, "private details"))
    const response = await handleUrlRegistryCommandRequest(
      request(createCommand()),
      {
        commandToken: TOKEN,
        enabled: true,
        readRegistry: async () => createRegistry({ createEntityRoute }),
      }
    )

    expect(response.status).toBe(status)
    expect(await response.text()).not.toContain("private details")
  })

  it("hides configuration and transport failures", async () => {
    const response = await handleUrlRegistryCommandRequest(
      request(createCommand()),
      {
        commandToken: TOKEN,
        enabled: true,
        readRegistry: () => Promise.reject(new Error("private database URL")),
      }
    )

    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain("private database URL")
  })
})
