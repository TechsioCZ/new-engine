import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchStorefrontBrands } from "./brands.server"

const mockSuccessfulResponse = (payload: unknown) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: 200,
      })
    )
  )
}

describe("fetchStorefrontBrands", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it.each([
    ["a missing brands field", {}],
    ["a non-array brands field", { brands: {} }],
    ["a malformed brand entry", { brands: [null] }],
    ["an incomplete brand entry", { brands: [{}] }],
    [
      "an invalid brand field",
      { brands: [{ id: "brand_1", title: "Pukka", handle: 42 }] },
    ],
  ])("throws for a successful response with %s", async (_case, payload) => {
    mockSuccessfulResponse(payload)

    await expect(fetchStorefrontBrands()).rejects.toThrow(
      "Invalid Medusa brands response"
    )
  })

  it("throws when a successful response contains malformed JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("{not-json", {
          headers: { "content-type": "application/json" },
          status: 200,
        })
      )
    )

    await expect(fetchStorefrontBrands()).rejects.toThrow()
  })

  it("returns an empty list only for a valid empty brands array", async () => {
    mockSuccessfulResponse({ brands: [] })

    await expect(fetchStorefrontBrands()).resolves.toEqual([])
  })
})
