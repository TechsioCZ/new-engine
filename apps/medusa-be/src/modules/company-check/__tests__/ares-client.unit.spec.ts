import { MedusaError } from "@medusajs/framework/utils"
import { AresClient } from "../clients/ares-client"

const TEST_ARES_BASE_URL = "https://ares.invalid/rest"
const TEST_ARES_BASE_URL_V3 = "https://ares.invalid/rest/v3"

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  })
}

describe("AresClient", () => {
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
    expect(() => new AresClient({ baseUrl: " " })).toThrow(MedusaError)
  })

  it("gets economic subject by ICO", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        ico: "12345678",
        obchodniJmeno: "ACME s.r.o.",
        dic: "CZ12345678",
        sidlo: {
          nazevUlice: "FictionalStreet",
          cisloDomovni: "10",
          nazevObce: "ExampleCity",
          nazevStatu: "Exampleland",
          psc: "99999",
        },
      })
    )

    const client = new AresClient({ baseUrl: `${TEST_ARES_BASE_URL}/` })
    const result = await client.getEconomicSubjectByIco("12345678")

    expect(result.ico).toBe("12345678")
    expect(result.obchodniJmeno).toBe("ACME s.r.o.")
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(`${TEST_ARES_BASE_URL}/ekonomicke-subjekty/12345678`)
    expect((init as RequestInit).method).toBe("GET")
  })

  it("accepts numeric cisloDomovni, cisloOrientacni and psc in economic-subject response", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        ico: "12345678",
        obchodniJmeno: "ACME s.r.o.",
        dic: "CZ12345678",
        sidlo: {
          nazevUlice: "FictionalStreet",
          cisloDomovni: 10,
          cisloOrientacni: 5,
          nazevObce: "ExampleCity",
          nazevStatu: "Exampleland",
          psc: 99999,
        },
      })
    )

    const client = new AresClient({ baseUrl: TEST_ARES_BASE_URL })
    const result = await client.getEconomicSubjectByIco("12345678")

    expect(result.sidlo?.cisloDomovni).toBe("10")
    expect(result.sidlo?.cisloOrientacni).toBe("5")
    expect(result.sidlo?.psc).toBe("99999")
  })

  it("rejects economic-subject response when non-allowed address fields are numeric", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        ico: "12345678",
        obchodniJmeno: "ACME s.r.o.",
        dic: "CZ12345678",
        sidlo: {
          nazevUlice: 123,
          cisloDomovni: 10,
          nazevObce: "ExampleCity",
          nazevStatu: "Exampleland",
          psc: 99999,
        },
      })
    )

    const client = new AresClient({ baseUrl: TEST_ARES_BASE_URL })

    await expect(client.getEconomicSubjectByIco("12345678")).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
    })
  })

  it("keeps v3 in base URL when provided", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        ico: "12345678",
        obchodniJmeno: "ACME s.r.o.",
        dic: "CZ12345678",
        sidlo: {
          nazevUlice: "FictionalStreet",
          cisloDomovni: "10",
          nazevObce: "ExampleCity",
          nazevStatu: "Exampleland",
          psc: "99999",
        },
      })
    )

    const client = new AresClient({ baseUrl: `${TEST_ARES_BASE_URL_V3}/` })
    await client.getEconomicSubjectByIco("12345678")

    const [url] = fetchMock.mock.calls[0]!
    expect(url).toBe(`${TEST_ARES_BASE_URL_V3}/ekonomicke-subjekty/12345678`)
  })

  it("searches economic subjects via POST", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        pocetCelkem: 1,
        ekonomickeSubjekty: [
          {
            ico: "12345678",
            obchodniJmeno: "ACME s.r.o.",
          },
        ],
      })
    )

    const client = new AresClient({ baseUrl: TEST_ARES_BASE_URL })
    const payload = {
      obchodniJmeno: "ACME s.r.o.",
    }

    const result = await client.searchEconomicSubjects(payload)

    expect(result.pocetCelkem).toBe(1)
    expect(result.ekonomickeSubjekty).toHaveLength(1)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(`${TEST_ARES_BASE_URL}/ekonomicke-subjekty/vyhledat`)
    expect((init as RequestInit).method).toBe("POST")
    expect((init as RequestInit).body).toBe(JSON.stringify(payload))
  })

  it("searches standardized addresses via POST", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        pocetCelkem: 1,
        standardizovaneAdresy: [
          {
            nazevUlice: "FictionalStreet",
            cisloDomovni: "10",
            nazevObce: "ExampleCity",
            nazevStatu: "Exampleland",
            psc: "99999",
          },
        ],
      })
    )

    const client = new AresClient({ baseUrl: TEST_ARES_BASE_URL })

    const result = await client.searchStandardizedAddresses({
      textovaAdresa: "FictionalStreet 10, ExampleCity",
      typStandardizaceAdresy: "VYHOVUJICI_ADRESY",
    })

    expect(result.pocetCelkem).toBe(1)
    expect(result.standardizovaneAdresy).toHaveLength(1)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(`${TEST_ARES_BASE_URL}/standardizovane-adresy/vyhledat`)
    expect((init as RequestInit).method).toBe("POST")
  })

  it("accepts numeric cisloDomovni, cisloOrientacni and psc in standardized addresses", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        pocetCelkem: 1,
        standardizovaneAdresy: [
          {
            kodObce: 554782,
            nazevUlice: "FictionalStreet",
            cisloDomovni: 10,
            cisloOrientacni: 5,
            cisloOrientacniPismeno: "A",
            nazevObce: "ExampleCity",
            nazevStatu: "Exampleland",
            psc: 99999,
          },
        ],
      })
    )

    const client = new AresClient({ baseUrl: TEST_ARES_BASE_URL })

    const result = await client.searchStandardizedAddresses({
      textovaAdresa: "FictionalStreet 10/5, ExampleCity",
      typStandardizaceAdresy: "VYHOVUJICI_ADRESY",
    })

    const address = result.standardizovaneAdresy[0]
    expect(address?.cisloDomovni).toBe("10")
    expect(address?.cisloOrientacni).toBe("5")
    expect(address?.psc).toBe("99999")
  })

  it("rejects standardized addresses when non-allowed fields are numeric", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        pocetCelkem: 1,
        standardizovaneAdresy: [
          {
            kodObce: 554782,
            nazevUlice: 123,
            cisloDomovni: 10,
            nazevObce: "ExampleCity",
            nazevStatu: "Exampleland",
            psc: 99999,
          },
        ],
      })
    )

    const client = new AresClient({ baseUrl: TEST_ARES_BASE_URL })

    await expect(
      client.searchStandardizedAddresses({
        textovaAdresa: "ExampleCity",
        typStandardizaceAdresy: "VYHOVUJICI_ADRESY",
      })
    ).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
    })
  })

  it("rejects invalid ICO format", async () => {
    const client = new AresClient({ baseUrl: TEST_ARES_BASE_URL })

    await expect(client.getEconomicSubjectByIco("123")).rejects.toMatchObject({
      type: MedusaError.Types.INVALID_DATA,
    })
  })

  it("rejects invalid ARES response shape", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        pocetCelkem: 1,
        ekonomickeSubjekty: [
          {
            ico: "12345678",
          },
        ],
      })
    )

    const client = new AresClient({ baseUrl: TEST_ARES_BASE_URL })

    await expect(
      client.searchEconomicSubjects({ obchodniJmeno: "ACME s.r.o." })
    ).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
    })
  })

  it("rejects empty response body", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }))
    const client = new AresClient({ baseUrl: TEST_ARES_BASE_URL })

    await expect(
      client.searchStandardizedAddresses({
        textovaAdresa: "ExampleCity",
        typStandardizaceAdresy: "VYHOVUJICI_ADRESY",
      })
    ).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
    })
  })
})
