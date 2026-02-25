import {
  buildAresStandardizationPayload,
  buildSidloFilterFromStandardizedAddress,
  buildTextAddress,
} from "../../../../../src/workflows/company-check/helpers/address-count"

describe("address-count helpers", () => {
  it("builds text address from trimmed street and city", () => {
    expect(
      buildTextAddress({
        street: " Main 10 ",
        city: " Prague ",
      })
    ).toBe("Main 10, Prague")
  })

  it("builds structured standardization payload from parsed street parts", () => {
    expect(
      buildAresStandardizationPayload({
        street: "Main 10/5A",
        city: "Prague",
      })
    ).toEqual({
      typStandardizaceAdresy: "VYHOVUJICI_ADRESY",
      nazevObce: "Prague",
      nazevUlice: "Main",
      cisloDomovni: 10,
      cisloOrientacni: 5,
      cisloOrientacniPismeno: "A",
    })
  })

  it("keeps only street/city fields when street number is not present", () => {
    expect(
      buildAresStandardizationPayload({
        street: "Main Street",
        city: "Prague",
      })
    ).toEqual({
      typStandardizaceAdresy: "VYHOVUJICI_ADRESY",
      nazevObce: "Prague",
      nazevUlice: "Main Street",
    })
  })

  it("builds sidlo filter from standardized address and preserves zero codes", () => {
    const sidlo = buildSidloFilterFromStandardizedAddress({
      kodAdresnihoMista: 0,
      kodObce: 554782,
      kodUlice: null,
      kodCastiObce: undefined,
      kodMestskeCastiObvodu: null,
      kodKraje: null,
      kodOkresu: null,
      kodSpravnihoObvodu: null,
      kodStatu: null,
      cisloDomovni: "10",
      cisloOrientacni: null,
      cisloOrientacniPismeno: null,
      nazevUlice: "Main",
      nazevObce: "Prague",
      nazevStatu: "CZ",
      psc: "11000",
    })

    expect(sidlo).toEqual({
      kodAdresnihoMista: 0,
      kodObce: 554782,
      cisloDomovni: "10",
    })
  })

  it("returns null sidlo filter when no usable fields are present", () => {
    expect(
      buildSidloFilterFromStandardizedAddress({
        kodAdresnihoMista: null,
        kodObce: null,
        kodUlice: null,
        kodCastiObce: null,
        kodMestskeCastiObvodu: null,
        kodKraje: null,
        kodOkresu: null,
        kodSpravnihoObvodu: null,
        kodStatu: null,
        cisloDomovni: " ",
        cisloOrientacni: null,
        cisloOrientacniPismeno: null,
        nazevUlice: null,
        nazevObce: null,
        nazevStatu: null,
        psc: null,
      })
    ).toBeNull()
  })
})
