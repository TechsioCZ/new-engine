import { describe, expect, it } from "vitest"

import {
  createAddressIndexDocument,
  createAddressLabels,
  createPrefixTokens,
  extractHouseNumberCandidates,
  extractPostalCodeCandidates,
  normalizeSearchText,
  rankAddressCandidates,
  scoreAddressCandidate,
  tokenizeAddressText,
} from "../src/index"

describe("address text normalization", () => {
  it("normalizes Czech and Slovak diacritics, casing, punctuation, and whitespace", () => {
    expect(normalizeSearchText("  Žižkova,  Čadca – Čierna   Ľubovňa! ")).toBe(
      "zizkova cadca cierna lubovna"
    )
  })

  it("generates stable unique tokens and prefix tokens", () => {
    const tokens = tokenizeAddressText("Hlavná Hlavna 12, 811 01 Bratislava")

    expect(tokens).toEqual(["hlavna", "12", "811", "01", "bratislava"])
    expect(createPrefixTokens(tokens, { minLength: 2, maxLength: 4 })).toEqual([
      "hl",
      "hla",
      "hlav",
      "12",
      "81",
      "811",
      "01",
      "br",
      "bra",
      "brat",
    ])
  })
})

describe("address candidate extraction", () => {
  it("extracts Czech and Slovak postal-code candidates from mixed input", () => {
    expect(
      extractPostalCodeCandidates("Vinohradská 12/34, 120 00 Praha 2")
    ).toMatchObject([{ value: "12000", displayValue: "120 00" }])

    expect(
      extractPostalCodeCandidates("Hlavná 7, SK-81101 Bratislava")
    ).toEqual([
      {
        value: "81101",
        displayValue: "811 01",
        sourceText: "81101",
        start: 13,
        end: 18,
      },
    ])
  })

  it("extracts slash, explicit, and street house-number candidates", () => {
    expect(
      extractHouseNumberCandidates("Václavské náměstí 832/19, 110 00 Praha")
    ).toMatchObject([
      {
        houseNumber: "832",
        orientationNumber: "19",
        displayValue: "832/19",
        reason: "slash",
      },
    ])

    expect(extractHouseNumberCandidates("č.p. 45, č.o. 7, Žilina")).toEqual([
      {
        houseNumber: "45",
        displayValue: "45",
        sourceText: "č.p. 45",
        start: 0,
        end: 7,
        reason: "explicit-house",
      },
      {
        houseNumber: "7",
        orientationNumber: "7",
        displayValue: "7",
        sourceText: "č.o. 7",
        start: 9,
        end: 15,
        reason: "explicit-orientation",
      },
    ])

    expect(extractHouseNumberCandidates("Masarykova 12, 602 00 Brno")).toEqual([
      {
        houseNumber: "12",
        displayValue: "12",
        sourceText: "12",
        start: 11,
        end: 13,
        reason: "street-number",
      },
    ])
  })
})

describe("address labels and index documents", () => {
  it("creates normalized display and search labels from address parts", () => {
    const labels = createAddressLabels({
      countryCode: "CZ",
      city: "Praha",
      district: "Praha 2",
      street: "Vinohradská",
      houseNumber: "12",
      orientationNumber: "34",
      postalCode: "120 00",
    })

    expect(labels).toEqual({
      displayLabel: "Vinohradská 12/34, 120 00 Praha, Praha 2, CZ",
      searchLabel: "vinohradska 12 34 120 00 praha praha 2 cz",
    })
  })

  it("creates a complete index document", () => {
    const document = createAddressIndexDocument({
      countryCode: "SK",
      city: "Bratislava",
      street: "Hlavná",
      houseNumber: "7",
      postalCode: "811 01",
    })

    expect(document.displayLabel).toBe("Hlavná 7, 811 01 Bratislava, SK")
    expect(document.tokens).toEqual([
      "hlavna",
      "7",
      "811",
      "01",
      "bratislava",
      "sk",
    ])
    expect(document.postalCodeCandidates).toMatchObject([{ value: "81101" }])
    expect(document.houseNumberCandidates).toMatchObject([
      { houseNumber: "7", reason: "street-number" },
    ])
  })
})

describe("address ranking", () => {
  const candidates = [
    {
      id: "bratislava",
      displayLabel: "Hlavná 7, 811 01 Bratislava, SK",
      address: {
        city: "Bratislava",
        street: "Hlavná",
        houseNumber: "7",
        postalCode: "811 01",
      },
      confidence: 0.6,
    },
    {
      id: "praha",
      displayLabel: "Vinohradská 12/34, 120 00 Praha, CZ",
      address: {
        city: "Praha",
        street: "Vinohradská",
        houseNumber: "12",
        orientationNumber: "34",
        postalCode: "120 00",
      },
      confidence: 0.6,
    },
  ] as const

  it("scores deterministically with diagnostics", () => {
    const scored = scoreAddressCandidate("vinohrad 12/34 12000", candidates[1])

    expect(scored.score).toBeGreaterThan(0)
    expect(scored.reasons).toContain("postal:match")
    expect(scored.reasons).toContain("house-number:match")
    expect(scored.reasons).toContain("tokens:prefix:1")
  })

  it("ranks matching address forms above unrelated candidates with stable tie breaks", () => {
    const ranked = rankAddressCandidates("Hlavna 7 Bratislava", candidates)

    expect(ranked.map(({ candidate }) => candidate.id)).toEqual([
      "bratislava",
      "praha",
    ])
    expect(ranked[0]?.reasons).toContain("house-number:match")
    expect(ranked[0]?.reasons).toContain("tokens:all-exact")
  })
})
