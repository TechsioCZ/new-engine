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

describe("Herbatica seed promo rebase", () => {
  const xml = `
    <SHOP>
      <SHOPITEM id="42">
        <NAME>Akcny produkt</NAME>
        <DESCRIPTION>Popis produktu</DESCRIPTION>
        <PRICE_VAT>9.99</PRICE_VAT>
        <STANDARD_PRICE>9.99</STANDARD_PRICE>
        <ACTION_PRICE>7.99</ACTION_PRICE>
        <ACTION_PRICE_FROM>2025-06-03</ACTION_PRICE_FROM>
        <ACTION_PRICE_UNTIL>2025-06-03</ACTION_PRICE_UNTIL>
        <CURRENCY>EUR</CURRENCY>
        <VISIBLE>1</VISIBLE>
        <STOCK>
          <AMOUNT>3</AMOUNT>
        </STOCK>
        <CATEGORIES>
          <CATEGORY id="promo">Akcie</CATEGORY>
          <DEFAULT_CATEGORY id="promo">Akcie</DEFAULT_CATEGORY>
        </CATEGORIES>
      </SHOPITEM>
    </SHOP>
  `

  it("keeps expired discounts inactive by default", () => {
    const result = buildSeedInputFromXml(xml)
    const product = result.products[0]
    const variant = product?.variants?.[0]

    expect(variant?.prices).toEqual([
      {
        amount: 9.99,
        currency_code: "eur",
      },
    ])
    expect(product?.metadata).toMatchObject({
      top_offer: {
        current_price: 9.99,
        has_active_discount: false,
      },
    })
    expect(variant?.metadata).toMatchObject({
      current_price: 9.99,
      has_active_discount: false,
    })
  })

  it("rebases expired discounts into an active promo window when enabled", () => {
    const result = buildSeedInputFromXml(xml, undefined, {
      promoRebaseDays: 30,
      referenceDate: new Date("2026-04-23T12:00:00.000Z"),
    })
    const product = result.products[0]
    const variant = product?.variants?.[0]

    expect(variant?.prices).toEqual([
      {
        amount: 7.99,
        currency_code: "eur",
      },
    ])
    expect(product?.metadata).toMatchObject({
      top_offer: {
        action_price_from: "2026-04-23",
        action_price_until: "2026-05-23",
        compare_at_price: 9.99,
        current_price: 7.99,
        has_active_discount: true,
      },
    })
    expect(variant?.metadata).toMatchObject({
      action_price_from: "2026-04-23",
      action_price_until: "2026-05-23",
      compare_at_price: 9.99,
      current_price: 7.99,
      has_active_discount: true,
    })
  })
})
