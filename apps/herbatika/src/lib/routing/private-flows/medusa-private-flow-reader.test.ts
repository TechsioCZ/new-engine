import { describe, expect, it, vi } from "vitest"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import { createMedusaPrivateFlowReader } from "./medusa-private-flow-reader"

const binding: MarketRuntimeBinding = {
  acceptedHosts: ["herbatika.sk"],
  canonicalOrigin: "https://herbatika.sk",
  countryCode: "SK",
  locale: "sk-SK",
  market: "sk",
  publishableApiKey: "pk_sk",
  publishableApiKeyId: "pkid_sk",
  regionId: "reg_sk",
  salesChannelId: "sc_sk",
}

const response = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  })

const createReader = (fetch = vi.fn()) => ({
  fetch,
  reader: createMedusaPrivateFlowReader({
    baseUrl: "http://medusa.internal:9000",
    fetch,
    resolveMarket: (market) => (market === "sk" ? binding : null),
  }),
})

describe("Medusa private-flow reader", () => {
  it("does not call Medusa when the session cookie has no token", async () => {
    const { fetch, reader } = createReader()

    await expect(reader.readSession("sk", null)).resolves.toEqual({
      kind: "unauthenticated",
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it("authenticates the exact customer bearer session", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(response(200, { customer: { id: "cus_1" } }))
    const { reader } = createReader(fetch)

    await expect(reader.readSession("sk", "JWT.Exact")).resolves.toEqual({
      kind: "authenticated",
      session: { customerId: "cus_1", token: "JWT.Exact" },
    })
    expect(fetch).toHaveBeenCalledWith(
      new URL("http://medusa.internal:9000/store/customers/me"),
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({
          authorization: "Bearer JWT.Exact",
          "x-publishable-api-key": "pk_sk",
        }),
      })
    )
  })

  it.each([
    401, 403,
  ])("treats a %s customer response as unauthenticated", async (status) => {
    const fetch = vi.fn().mockResolvedValue(response(status))
    const { reader } = createReader(fetch)

    await expect(reader.readSession("sk", "expired")).resolves.toEqual({
      kind: "unauthenticated",
    })
  })

  it("maps backend failures to retryable unavailability", async () => {
    const failingResponse = vi.fn().mockResolvedValue(response(503))

    await expect(
      createReader(failingResponse).reader.readSession("sk", "session")
    ).resolves.toEqual({ kind: "unavailable", retryAfterSeconds: 30 })
  })

  it("maps transport failures to retryable unavailability", async () => {
    const failingFetch = vi.fn().mockRejectedValue(new Error("offline"))

    await expect(
      createReader(failingFetch).reader.readSession("sk", "session")
    ).resolves.toEqual({ kind: "unavailable", retryAfterSeconds: 30 })
  })

  it("maps invalid market runtime configuration to unavailability", async () => {
    const reader = createMedusaPrivateFlowReader({
      baseUrl: "http://medusa.internal:9000",
      fetch: vi.fn(),
      resolveMarket: () => {
        throw new Error("invalid runtime")
      },
    })

    await expect(reader.readSession("sk", "session")).resolves.toEqual({
      kind: "unavailable",
      retryAfterSeconds: 30,
    })
  })
})
