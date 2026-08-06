import { describe, expect, it } from "vitest"

import { POST } from "./route"

const createRequest = (body: string) =>
  new Request("http://localhost/api/storefront-region", {
    body,
    headers: { "content-type": "application/json" },
    method: "POST",
  })

const getCookieHeaders = (response: Response) =>
  response.headers.getSetCookie().toSorted()

describe("storefront region preference route", () => {
  it("normalizes a valid preference and sets both durable cookies", async () => {
    const response = await POST(
      createRequest(
        JSON.stringify({ countryCode: " SK ", regionId: " reg_market1 " }),
      ),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toStrictEqual({ success: true })

    const cookieHeaders = getCookieHeaders(response)
    expect(cookieHeaders).toHaveLength(2)
    expect(cookieHeaders).toStrictEqual(
      expect.arrayContaining([
        expect.stringContaining("herbatika_region_country_code=sk"),
        expect.stringContaining("herbatika_region_id=reg_market1"),
      ]),
    )
    for (const cookieHeader of cookieHeaders) {
      expect(cookieHeader).toContain("Path=/")
      expect(cookieHeader).toContain("Max-Age=31536000")
      expect(cookieHeader).toContain("SameSite=lax")
      expect(cookieHeader).not.toContain("Secure")
    }
  })

  it.each([
    { countryCode: "SVK", regionId: "reg_market1" },
    { countryCode: "sk", regionId: "market1" },
    { countryCode: 42, regionId: "reg_market1" },
    ["not", "an", "object"],
  ])("rejects invalid or unknown payload %#", async (payload) => {
    const response = await POST(createRequest(JSON.stringify(payload)))

    expect(response.status).toBe(400)
    expect(getCookieHeaders(response)).toStrictEqual([])
    await expect(response.json()).resolves.toStrictEqual({
      code: "INVALID_REGION_PREFERENCE",
    })
  })

  it("rejects malformed JSON without setting cookies", async () => {
    const response = await POST(createRequest("{"))

    expect(response.status).toBe(400)
    expect(getCookieHeaders(response)).toStrictEqual([])
  })
})
