import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => ({ health: vi.fn() }))

vi.mock(
  "@/lib/url-registry/runtime/invalidation-dispatcher-worker.server",
  () => ({
    getInvalidationDispatcherHealth: mocks.health,
  })
)

import { GET } from "./route"

describe("URL registry invalidation dispatcher health route", () => {
  beforeEach(() => {
    mocks.health.mockReset()
  })

  it.each([
    ["healthy", 200],
    ["starting", 200],
    ["disabled", 200],
    ["degraded", 503],
  ] as const)("returns %s without cacheable or secret state", async (status, code) => {
    mocks.health.mockReturnValue({
      backlog: { delivered: 4, failed: 1, pending: 2, processing: 0 },
      consecutiveFailures: status === "degraded" ? 1 : 0,
      enabled: status !== "disabled",
      lastResult: null,
      lastSuccessAt: null,
      startedAt: null,
      status,
    })
    const response = GET()
    expect(response.status).toBe(code)
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0")
    expect(response.headers.get("x-robots-tag")).toContain("noindex")
    const body = await response.text()
    expect(JSON.parse(body)).toMatchObject({ status })
    expect(body).not.toContain("token")
  })
})
