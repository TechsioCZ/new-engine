import { describe, expect, it } from "vitest"
import { parseCzechCatalogSourceOptions } from "./cli"
import { parseCzechOfficialFeed } from "./generator"
import { buildTemporaryCzechTranslation } from "./temporary-czech"

describe("CZ official catalog source", () => {
  it("groups feed variants by canonical public herbatica.cz URL", () => {
    const groups = parseCzechOfficialFeed(`<?xml version="1.0"?>
      <SHOP>
        <SHOPITEM><PRODUCT>Produkt 250 ml</PRODUCT><DESCRIPTION>&lt;p&gt;Popis&lt;/p&gt;</DESCRIPTION><URL>https://herbatica.cz/p/produkt/?x=1</URL><MANUFACTURER>Značka</MANUFACTURER><EAN>111</EAN></SHOPITEM>
        <SHOPITEM><PRODUCT>Produkt 500 ml</PRODUCT><DESCRIPTION>&lt;p&gt;Popis&lt;/p&gt;</DESCRIPTION><URL>https://www.herbatica.cz/p/produkt/</URL><MANUFACTURER>Značka</MANUFACTURER><EAN>222</EAN></SHOPITEM>
      </SHOP>`)
    expect(groups).toEqual([
      {
        descriptions: ["<p>Popis</p>"],
        eans: ["111", "222"],
        manufacturers: ["Značka"],
        titles: ["Produkt 250 ml", "Produkt 500 ml"],
        url: "https://www.herbatica.cz/p/produkt/",
      },
    ])
  })

  it("rejects feed URLs outside the official CZ host", () => {
    expect(() =>
      parseCzechOfficialFeed(
        "<SHOP><SHOPITEM><PRODUCT>X</PRODUCT><URL>https://example.com/x</URL></SHOPITEM></SHOP>"
      )
    ).toThrow("outside herbatica.cz")
  })

  it("keeps HTML attributes unchanged in temporary Czech fallback", () => {
    expect(
      buildTemporaryCzechTranslation(
        '<p data-label="použitie">Odporúčané použitie pre zdravie.</p>'
      )
    ).toBe('<p data-label="použitie">Doporučené použití pro zdraví.</p>')
    expect(buildTemporaryCzechTranslation("  ")).toBeNull()
  })

  it("requires absolute source and output paths", () => {
    expect(() =>
      parseCzechCatalogSourceOptions(["--brands-jsonl", "brands.jsonl"])
    ).toThrow("missing")
  })
})
