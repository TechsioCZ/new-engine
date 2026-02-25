import {
  composeStreet,
  MAX_COMPANY_RESULTS,
  normalizeCompanyName,
  pickTopCompanyMatchesByName,
} from "../../../../../src/workflows/company-check/helpers/company-info"
import type { AresEconomicSubject } from "../../../../../src/modules/company-check/types"

function subject(
  ico: string,
  obchodniJmeno: string,
  address?: {
    nazevUlice?: string | null
    cisloDomovni?: string | null
    cisloOrientacni?: string | null
    cisloOrientacniPismeno?: string | null
  }
): AresEconomicSubject {
  return {
    ico,
    obchodniJmeno,
    sidlo: address
      ? {
          nazevUlice: address.nazevUlice ?? null,
          cisloDomovni: address.cisloDomovni ?? null,
          cisloOrientacni: address.cisloOrientacni ?? null,
          cisloOrientacniPismeno: address.cisloOrientacniPismeno ?? null,
          nazevObce: null,
          nazevStatu: null,
          psc: null,
        }
      : null,
  }
}

describe("company-info helpers", () => {
  it("normalizes company name by removing whitespace and lowercasing", () => {
    expect(normalizeCompanyName("  ACME   s.r.o.  ")).toBe("acmes.r.o.")
  })

  it("composes street with house number and orientation", () => {
    expect(
      composeStreet({
        nazevUlice: "Main Street",
        cisloDomovni: "10",
        cisloOrientacni: "5",
        cisloOrientacniPismeno: "A",
        nazevObce: null,
        nazevStatu: null,
        psc: null,
      })
    ).toBe("Main Street 10/5A")
  })

  it("returns empty street when address is missing", () => {
    expect(composeStreet(null)).toBe("")
  })

  it("prioritizes exact whitespace-insensitive matches and deduplicates by ICO", () => {
    const results = pickTopCompanyMatchesByName("Acme s.r.o.", [
      subject("00000002", "ACMEs.r.o."),
      subject("00000001", " ACME   s.r.o. "),
      subject("00000001", "ACME s.r.o."),
      subject("00000003", "Different company"),
    ])

    expect(results.map((item) => item.ico)).toEqual(["00000001", "00000002"])
  })

  it("falls back to all subjects when no exact name match exists and limits output", () => {
    const input = Array.from({ length: MAX_COMPANY_RESULTS + 2 }, (_, index) =>
      subject(String(index + 1).padStart(8, "0"), `Company ${index + 1}`)
    )

    const results = pickTopCompanyMatchesByName("No exact match", input)

    expect(results).toHaveLength(MAX_COMPANY_RESULTS)
    expect(results[0]?.ico).toBe("00000001")
  })
})
