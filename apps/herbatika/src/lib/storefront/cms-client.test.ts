import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("./runtime-env", () => ({
  resolveMedusaBackendUrl: () => "https://medusa.test",
}))
vi.mock("@/lib/market/market-runtime.server", () => ({
  requireConfiguredMarketRuntimeBinding: vi.fn((market: string) => ({
    market,
    publishableApiKey: `pk_server_${market}`,
  })),
}))
describe("CMS source reader", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn() as unknown as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.clearAllMocks()
  })

  it("sends the exact requested market locale", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      Response.json({ page: { id: 1 } })
    )
    const { readCmsJson } = await import("./cms-client")

    await readCmsJson("pages/by-id/1", { locale: "hu-HU" })

    const requestUrl = vi.mocked(globalThis.fetch).mock.calls[0]?.[0]
    expect(String(requestUrl)).toBe(
      "https://medusa.test/store/cms/pages/by-id/1?locale=hu"
    )
    expect(
      vi.mocked(globalThis.fetch).mock.calls[0]?.[1]?.headers
    ).toMatchObject({ "x-publishable-api-key": "pk_server_hu" })
  })

  it("fails closed before I/O when the market locale is missing", async () => {
    const { readCmsJson } = await import("./cms-client")

    await expect(readCmsJson("pages/by-id/1")).resolves.toEqual({
      kind: "invalid-response",
      causeCode: "MISSING_CMS_LOCALE",
    })
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it("keeps definitive absence distinct from source failure", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      Response.json({ message: "missing" }, { status: 404 })
    )
    const { readCmsJson } = await import("./cms-client")

    await expect(
      readCmsJson("pages/by-id/404", { locale: "cs-CZ" })
    ).resolves.toEqual({ kind: "missing" })
  })

  it("retries one transient response and preserves Retry-After", async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(
        new Response("busy", {
          headers: { "retry-after": "17" },
          status: 503,
        })
      )
      .mockResolvedValueOnce(
        new Response("busy", {
          headers: { "retry-after": "17" },
          status: 503,
        })
      )
    const { readCmsJson } = await import("./cms-client")

    await expect(
      readCmsJson("articles/by-id/1", { locale: "ro-RO" })
    ).resolves.toEqual({ kind: "unavailable", retryAfterSeconds: 17 })
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })

  it("classifies invalid JSON and oversized responses", async () => {
    const { readCmsJson } = await import("./cms-client")
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response("not-json", { status: 200 })
    )

    await expect(
      readCmsJson("pages/by-id/1", { locale: "sk-SK" })
    ).resolves.toEqual({ kind: "invalid-response", causeCode: "INVALID_JSON" })

    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response("{}", {
        headers: { "content-length": String(2 * 1024 * 1024 + 1) },
        status: 200,
      })
    )
    await expect(
      readCmsJson("pages/by-id/1", { locale: "sk-SK" })
    ).resolves.toEqual({
      kind: "invalid-response",
      causeCode: "RESPONSE_TOO_LARGE",
    })
  })

  it("maps transport failures to unavailable after a bounded retry", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new TypeError("fetch failed"))
    const { readCmsJson } = await import("./cms-client")

    await expect(
      readCmsJson("pages/by-id/1", { locale: "sk-SK" })
    ).resolves.toEqual({ kind: "unavailable" })
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })
})
