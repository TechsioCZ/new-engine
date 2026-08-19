import { describe, expect, it, vi } from "vitest"
import { createUrlRegistryInvalidationConsumer } from "./invalidation-consumer"
import { handleUrlRegistryInvalidationRequest } from "./invalidation-endpoint"

const TOKEN = "urlr-invalidation-token-with-at-least-32-characters"
const delivery = () => ({
  outboxEventId: "1001",
  schemaVersion: 1,
  tags: ["market:sk", "sitemap:sk"],
})
const request = (
  body: unknown = delivery(),
  options: Readonly<{
    authorization?: string
    contentType?: string
    host?: string
  }> = {}
) =>
  new Request("https://herbatica.sk/api/url-registry/invalidate", {
    body: JSON.stringify(body),
    headers: {
      authorization: options.authorization ?? `Bearer ${TOKEN}`,
      "content-type": options.contentType ?? "application/json",
      host: options.host ?? "herbatica.sk",
    },
    method: "POST",
  })

const dependencies = (
  consume = vi.fn().mockResolvedValue({
    invalidatedTagCount: 2,
    outboxEventId: "1001",
    replayed: false,
    schemaVersion: 1,
  })
) => ({
  consume,
  enabled: true,
  isExpectedHost: (host: string | null) => host === "herbatica.sk",
  token: TOKEN,
})

describe("URL registry invalidation endpoint", () => {
  it("stays hidden while disabled without reading the body", async () => {
    const incoming = request()
    const deps = { ...dependencies(), enabled: false }

    const response = await handleUrlRegistryInvalidationRequest(incoming, deps)

    expect(response.status).toBe(404)
    expect(incoming.bodyUsed).toBe(false)
    expect(deps.consume).not.toHaveBeenCalled()
  })

  it("validates the public Host before authorization or body parsing", async () => {
    const incoming = request(undefined, {
      authorization: "Bearer wrong",
      host: "attacker.example",
    })
    const deps = dependencies()

    const response = await handleUrlRegistryInvalidationRequest(incoming, deps)

    expect(response.status).toBe(421)
    expect(incoming.bodyUsed).toBe(false)
    expect(deps.consume).not.toHaveBeenCalled()
  })

  it("fails closed for a missing token configuration", async () => {
    const incoming = request()
    const deps = { ...dependencies(), token: undefined }

    const response = await handleUrlRegistryInvalidationRequest(incoming, deps)

    expect(response.status).toBe(503)
    expect(response.headers.get("retry-after")).toBe("5")
    expect(incoming.bodyUsed).toBe(false)
  })

  it("authenticates before parsing a body", async () => {
    const incoming = request(undefined, { authorization: "Bearer wrong" })
    const deps = dependencies()

    const response = await handleUrlRegistryInvalidationRequest(incoming, deps)

    expect(response.status).toBe(401)
    expect(response.headers.get("www-authenticate")).toBe("Bearer")
    expect(incoming.bodyUsed).toBe(false)
    expect(deps.consume).not.toHaveBeenCalled()
  })

  it.each([
    ["text/plain", delivery()],
    ["application/jsonp", delivery()],
    ["application/json", { ...delivery(), extra: true }],
    ["application/json", { ...delivery(), tags: ["sitemap:sk", "market:sk"] }],
  ])("rejects an invalid delivery boundary", async (contentType, body) => {
    const deps = dependencies()
    const response = await handleUrlRegistryInvalidationRequest(
      request(body, { contentType }),
      deps
    )

    expect(response.status).toBe(400)
    expect(deps.consume).not.toHaveBeenCalled()
  })

  it("acknowledges exact replays with 2xx and private response headers", async () => {
    const revalidateTag = vi.fn()
    const consumer = createUrlRegistryInvalidationConsumer({ revalidateTag })
    const deps = dependencies(vi.fn(consumer.consume))

    const first = await handleUrlRegistryInvalidationRequest(request(), deps)
    const replay = await handleUrlRegistryInvalidationRequest(request(), deps)

    expect(first.status).toBe(200)
    expect(await first.json()).toMatchObject({ replayed: false })
    expect(replay.status).toBe(200)
    expect(await replay.json()).toMatchObject({ replayed: true })
    expect(revalidateTag).toHaveBeenCalledTimes(2)
    expect(replay.headers.get("cache-control")).toContain("no-store")
    expect(replay.headers.get("x-robots-tag")).toContain("noindex")
  })

  it("returns a bounded retry response when invalidation fails", async () => {
    const deps = dependencies(vi.fn().mockRejectedValue(new Error("private")))

    const response = await handleUrlRegistryInvalidationRequest(request(), deps)

    expect(response.status).toBe(503)
    expect(response.headers.get("retry-after")).toBe("5")
    expect(await response.text()).not.toContain("private")
  })
})
