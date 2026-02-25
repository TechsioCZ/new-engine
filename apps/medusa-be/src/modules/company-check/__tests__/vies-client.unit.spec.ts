import { MedusaError } from "@medusajs/framework/utils"
import { ViesClient } from "../clients/vies-client"

const TEST_VIES_BASE_URL = "https://vies.invalid/rest"

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  })
}

describe("ViesClient", () => {
  const originalFetch = global.fetch
  let fetchMock: jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>
    global.fetch = fetchMock
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it("throws when base URL is missing", () => {
    expect(() => new ViesClient({ baseUrl: " " })).toThrow(MedusaError)
  })

  it("posts check-vat-number request and maps valid response", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        valid: true,
        name: "ACME s.r.o.",
        address: "Prague",
      })
    )

    const client = new ViesClient({ baseUrl: `${TEST_VIES_BASE_URL}/` })
    const result = await client.checkVatNumber({
      countryCode: "cz",
      vatNumber: "12345678",
    })

    expect(result).toMatchObject({
      valid: true,
      name: "ACME s.r.o.",
      address: "Prague",
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(`${TEST_VIES_BASE_URL}/check-vat-number`)
    expect((init as RequestInit).method).toBe("POST")
    expect((init as RequestInit).body).toBe(
      JSON.stringify({
        countryCode: "CZ",
        vatNumber: "12345678",
      })
    )
  })

  it("throws INVALID_DATA for non-OK responses", async () => {
    fetchMock.mockResolvedValue(new Response("Bad request", { status: 400 }))

    const client = new ViesClient({ baseUrl: TEST_VIES_BASE_URL })

    await expect(
      client.checkVatNumber({
        countryCode: "CZ",
        vatNumber: "12345678",
      })
    ).rejects.toMatchObject({
      type: MedusaError.Types.INVALID_DATA,
      statusCode: 400,
    })
  })

  it("throws UNEXPECTED_STATE when response body is empty", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }))

    const client = new ViesClient({ baseUrl: TEST_VIES_BASE_URL })

    await expect(
      client.checkVatNumber({
        countryCode: "CZ",
        vatNumber: "12345678",
      })
    ).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
    })
  })

  it("throws UNEXPECTED_STATE when response JSON is invalid", async () => {
    fetchMock.mockResolvedValue(
      new Response("not-json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    const client = new ViesClient({ baseUrl: TEST_VIES_BASE_URL })

    await expect(
      client.checkVatNumber({
        countryCode: "CZ",
        vatNumber: "12345678",
      })
    ).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
    })
  })

  it("throws UNEXPECTED_STATE when response shape is invalid", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        valid: true,
        name: 123,
      })
    )

    const client = new ViesClient({ baseUrl: TEST_VIES_BASE_URL })

    await expect(
      client.checkVatNumber({
        countryCode: "CZ",
        vatNumber: "12345678",
      })
    ).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
    })
  })
})
