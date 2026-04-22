import type { HerbaticaCategoryExport } from "../../../src/scripts/herbatica-category-export"
import { buildSeedInputFromXml } from "../../../src/scripts/herbatica-seed"

describe("Herbatica seed category mapping", () => {
  it("prefers canonical category export data over malformed product paths", () => {
    const xml = `
      <SHOP>
        <SHOPITEM id="1">
          <NAME>Kŕčové žily produkt</NAME>
          <DESCRIPTION>Popis produktu</DESCRIPTION>
          <PRICE_VAT>12.90</PRICE_VAT>
          <CURRENCY>EUR</CURRENCY>
          <VISIBLE>1</VISIBLE>
          <STOCK>
            <AMOUNT>3</AMOUNT>
          </STOCK>
          <CATEGORIES>
            <CATEGORY id="901">>> Trápi ma > Srdce a cievy >> Kŕčové žily</CATEGORY>
            <DEFAULT_CATEGORY id="901">>> Trápi ma > Srdce a cievy >> Kŕčové žily</DEFAULT_CATEGORY>
          </CATEGORIES>
        </SHOPITEM>
      </SHOP>
    `

    const categoryExports: HerbaticaCategoryExport[] = [
      {
        id: "758",
        title: "Trápi ma",
        url: "trapi-ma",
        isVisible: true,
        expandInMenu: false,
        isSystem: false,
      },
      {
        id: "900",
        parentId: "758",
        title: "Srdce a cievy",
        isVisible: true,
        expandInMenu: false,
        isSystem: false,
      },
      {
        id: "901",
        parentId: "900",
        title: "Kŕčové žily",
        isVisible: true,
        expandInMenu: false,
        isSystem: false,
      },
    ]

    const result = buildSeedInputFromXml(xml, categoryExports)

    expect(result.categories.map((category) => category.handle)).toEqual([
      "trapi-ma",
      "trapi-ma-srdce-a-cievy",
      "trapi-ma-srdce-a-cievy-krcove-zily",
    ])
    expect(result.categories.some((category) => category.handle?.endsWith("-2"))).toBe(
      false
    )
    expect(result.products[0]?.categories).toEqual([
      {
        handle: "trapi-ma-srdce-a-cievy-krcove-zily",
      },
    ])
    expect(result.products[0]?.metadata).toMatchObject({
      source_category_ids: ["901"],
      source_default_category_id: "901",
      category_paths: ["Trápi ma > Srdce a cievy > Kŕčové žily"],
    })
  })
})
