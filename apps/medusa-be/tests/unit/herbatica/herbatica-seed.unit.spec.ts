import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { ProductStatus } from "@medusajs/framework/utils"
import {
  type HerbaticaCategoryExport,
  parseHerbaticaCategoriesXmlFile,
} from "../../../src/scripts/herbatica-category-export"
import { buildSeedInputFromXml } from "../../../src/scripts/herbatica-seed"

const DIRTY_FEED_MARKUP_PATTERN =
  /data-turn-id|data-message-author-role|data-testid|ChatGPT|markdown prose|webpage-citation-pill|_ngcontent-ng|markdown-main-panel/i

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
    expect(
      result.categories.some((category) => category.handle?.endsWith("-2"))
    ).toBe(false)
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

describe("Herbatica seed product references", () => {
  it("keeps raw related product codes and adds resolved handles for published products", () => {
    const xml = `
      <SHOP>
        <SHOPITEM id="1">
          <NAME>Hlavný produkt</NAME>
          <DESCRIPTION>Popis produktu</DESCRIPTION>
          <PRICE_VAT>9.99</PRICE_VAT>
          <CURRENCY>EUR</CURRENCY>
          <VISIBLE>1</VISIBLE>
          <STOCK>
            <AMOUNT>3</AMOUNT>
          </STOCK>
          <CATEGORIES>
            <CATEGORY id="1701">Doplnky výživy</CATEGORY>
            <DEFAULT_CATEGORY id="1701">Doplnky výživy</DEFAULT_CATEGORY>
          </CATEGORIES>
          <RELATED_PRODUCTS>
            <CODE>1</CODE>
            <CODE>2</CODE>
            <CODE>4</CODE>
            <CODE>999</CODE>
            <CODE>2</CODE>
          </RELATED_PRODUCTS>
          <ALTERNATIVE_PRODUCTS>
            <CODE>3</CODE>
          </ALTERNATIVE_PRODUCTS>
        </SHOPITEM>
        <SHOPITEM id="2">
          <NAME>Súvisiaci produkt</NAME>
          <DESCRIPTION>Popis produktu</DESCRIPTION>
          <PRICE_VAT>5.99</PRICE_VAT>
          <CURRENCY>EUR</CURRENCY>
          <VISIBLE>1</VISIBLE>
          <STOCK>
            <AMOUNT>3</AMOUNT>
          </STOCK>
          <CATEGORIES>
            <CATEGORY id="1701">Doplnky výživy</CATEGORY>
          </CATEGORIES>
        </SHOPITEM>
        <SHOPITEM id="3">
          <NAME>Alternatívny produkt</NAME>
          <DESCRIPTION>Popis produktu</DESCRIPTION>
          <PRICE_VAT>6.99</PRICE_VAT>
          <CURRENCY>EUR</CURRENCY>
          <VISIBLE>1</VISIBLE>
          <STOCK>
            <AMOUNT>3</AMOUNT>
          </STOCK>
          <CATEGORIES>
            <CATEGORY id="1701">Doplnky výživy</CATEGORY>
          </CATEGORIES>
        </SHOPITEM>
        <SHOPITEM id="4">
          <NAME>Skrytý produkt</NAME>
          <DESCRIPTION>Popis produktu</DESCRIPTION>
          <PRICE_VAT>7.99</PRICE_VAT>
          <CURRENCY>EUR</CURRENCY>
          <VISIBLE>0</VISIBLE>
          <STOCK>
            <AMOUNT>3</AMOUNT>
          </STOCK>
          <CATEGORIES>
            <CATEGORY id="1701">Doplnky výživy</CATEGORY>
          </CATEGORIES>
        </SHOPITEM>
      </SHOP>
    `

    const result = buildSeedInputFromXml(xml)
    const product = result.products.find((item) => item.handle === "shopitem-1")

    expect(product?.metadata).toMatchObject({
      related_products: ["1", "2", "4", "999"],
      related_product_handles: ["shopitem-2"],
      related_product_refs: [
        {
          source_shopitem_id: "2",
          handle: "shopitem-2",
        },
      ],
      alternative_products: ["3"],
      alternative_product_handles: ["shopitem-3"],
      alternative_product_refs: [
        {
          source_shopitem_id: "3",
          handle: "shopitem-3",
        },
      ],
    })
  })
})

describe("Herbatica seed product content sections", () => {
  it("splits labeled product description fragments into tab sections", () => {
    const xml = `
      <SHOP>
        <SHOPITEM id="16182">
          <NAME>Olej zo semien ostropestreca</NAME>
          <SHORT_DESCRIPTION><![CDATA[
            <p>Krátky popis produktu.</p>
          ]]></SHORT_DESCRIPTION>
          <DESCRIPTION><![CDATA[
            <p>Hlavný popis produktu so <strong>silným marketingovým tvrdením</strong>.</p>
            <p>
              <span><strong>Spôsob užívania a o</strong></span>
              <span>
                <strong>dporúčané dávkovanie:</strong> Dospelí užívajú 4 kapsuly denne.
                <br /><br />
                <strong>Zdravotné upozornenia:</strong> Neprekračujte odporúčanú dennú dávku.
              </span>
            </p>
            <p><strong>Výživové údaje na 100 g:</strong> Energia 3692 kJ.</p>
            <p><strong>Skladovanie:</strong> Skladujte na tmavom mieste.</p>
            <p><strong>Obsah balenia/Objem:</strong> 100 kapsúl.</p>
            <p><strong>Krajina pôvodu:</strong> Estónsko.</p>
          ]]></DESCRIPTION>
          <PRICE_VAT>12.90</PRICE_VAT>
          <CURRENCY>EUR</CURRENCY>
          <VISIBLE>1</VISIBLE>
          <STOCK>
            <AMOUNT>3</AMOUNT>
          </STOCK>
          <CATEGORIES>
            <CATEGORY id="1701">Doplnky výživy</CATEGORY>
            <DEFAULT_CATEGORY id="1701">Doplnky výživy</DEFAULT_CATEGORY>
          </CATEGORIES>
          <TEXT_PROPERTIES>
            <TEXT_PROPERTY>
              <NAME>Zloženie</NAME>
              <VALUE>Olej zo semien ostropestreca.</VALUE>
            </TEXT_PROPERTY>
          </TEXT_PROPERTIES>
        </SHOPITEM>
      </SHOP>
    `

    const result = buildSeedInputFromXml(xml)
    const product = result.products[0]
    const contentSections = product?.metadata?.content_sections_map as Record<
      string,
      string
    >

    expect(contentSections.description).toContain("Hlavný popis produktu")
    expect(contentSections.description).toContain("Krátky popis produktu")
    expect(contentSections.description).not.toContain("Neprekračujte")
    expect(contentSections.description).not.toContain("Skladovanie")
    expect(contentSections.usage).toContain("Dospelí užívajú 4 kapsuly denne")
    expect(contentSections.warning).toContain("Neprekračujte")
    expect(contentSections.composition).toContain(
      "Olej zo semien ostropestreca"
    )
    expect(contentSections.other).toContain("Výživové údaje")
    expect(contentSections.other).toContain("Skladovanie")
    expect(contentSections.other).toContain("Obsah balenia/Objem")
    expect(contentSections.other).toContain("Krajina pôvodu")
  })

  it("uses explicit section headings without classifying marketing headings", () => {
    const xml = `
      <SHOP>
        <SHOPITEM id="200">
          <NAME>Produkt s heading sekciami</NAME>
          <DESCRIPTION><![CDATA[
            <h2>Prečo je produkt výnimočný</h2>
            <p><strong>regenerácia pečene</strong> a podpora vitality.</p>
            <h2>Použitie</h2>
            <p>Užívajte jednu kapsulu denne.</p>
            <h2>Upozornenie</h2>
            <p>Nevhodné pre deti.</p>
            <h2>Jednoduché použitie v praxi</h2>
            <p>Tento marketingový odsek má zostať v popise.</p>
          ]]></DESCRIPTION>
          <PRICE_VAT>8.90</PRICE_VAT>
          <CURRENCY>EUR</CURRENCY>
          <VISIBLE>1</VISIBLE>
          <STOCK>
            <AMOUNT>3</AMOUNT>
          </STOCK>
          <CATEGORIES>
            <CATEGORY id="1701">Doplnky výživy</CATEGORY>
            <DEFAULT_CATEGORY id="1701">Doplnky výživy</DEFAULT_CATEGORY>
          </CATEGORIES>
        </SHOPITEM>
      </SHOP>
    `

    const result = buildSeedInputFromXml(xml)
    const product = result.products[0]
    const contentSections = product?.metadata?.content_sections_map as Record<
      string,
      string
    >

    expect(contentSections.description).toContain("regenerácia pečene")
    expect(contentSections.description).toContain("Jednoduché použitie v praxi")
    expect(contentSections.description).toContain("marketingový odsek")
    expect(contentSections.usage).toContain("Užívajte jednu kapsulu denne")
    expect(contentSections.warning).toContain("Nevhodné pre deti")
    expect(contentSections.usage).not.toContain("marketingový odsek")
  })

  it("splits multiple labels from the same paragraph without duplicating them in description", () => {
    const xml = `
      <SHOP>
        <SHOPITEM id="300">
          <NAME>Produkt s inline parametrami</NAME>
          <DESCRIPTION><![CDATA[
            <p>Úvodný popis.</p>
            <p>
              <strong>Zloženie:</strong> 100 % amarantový olej.
              <br />
              <strong>Objem:</strong> 100 ml.
              <br />
              <strong>Krajina pôvodu:</strong> Ruská federácia.
            </p>
          ]]></DESCRIPTION>
          <PRICE_VAT>6.90</PRICE_VAT>
          <CURRENCY>EUR</CURRENCY>
          <VISIBLE>1</VISIBLE>
          <STOCK>
            <AMOUNT>3</AMOUNT>
          </STOCK>
          <CATEGORIES>
            <CATEGORY id="1701">Doplnky výživy</CATEGORY>
            <DEFAULT_CATEGORY id="1701">Doplnky výživy</DEFAULT_CATEGORY>
          </CATEGORIES>
        </SHOPITEM>
      </SHOP>
    `

    const result = buildSeedInputFromXml(xml)
    const product = result.products[0]
    const contentSections = product?.metadata?.content_sections_map as Record<
      string,
      string
    >

    expect(contentSections.description).toContain("Úvodný popis")
    expect(contentSections.description).not.toContain("amarantový olej")
    expect(contentSections.composition).toContain("amarantový olej")
    expect(contentSections.other).toContain("Objem")
    expect(contentSections.other).toContain("Krajina pôvodu")
  })
})

describe("Herbatica committed feed fixtures", () => {
  const productsXmlPath = resolve(
    process.cwd(),
    "src/scripts/seed-files/productsComplete.xml"
  )
  const categoriesXmlPath = resolve(
    process.cwd(),
    "src/scripts/seed-files/categories.xml"
  )

  it("keeps committed feed fixtures small and free of assistant markup", () => {
    const productsXml = readFileSync(productsXmlPath, "utf8")
    const categoriesXml = readFileSync(categoriesXmlPath, "utf8")

    expect(Buffer.byteLength(productsXml, "utf8")).toBeLessThan(50_000)
    expect(Buffer.byteLength(categoriesXml, "utf8")).toBeLessThan(20_000)
    expect(productsXml).not.toMatch(DIRTY_FEED_MARKUP_PATTERN)
    expect(categoriesXml).not.toMatch(DIRTY_FEED_MARKUP_PATTERN)
  })

  it("preserves parser coverage for metadata, references, hidden products, and duplicate variants", () => {
    const productsXml = readFileSync(productsXmlPath, "utf8")
    const categoryExports = parseHerbaticaCategoriesXmlFile(categoriesXmlPath)
    const result = buildSeedInputFromXml(productsXml, categoryExports, {
      referenceDate: new Date("2026-04-23T12:00:00.000Z"),
    })

    expect(result.stats).toEqual({
      shopItems: 4,
      categories: 5,
      products: 4,
      variants: 5,
      hiddenProducts: 1,
    })
    expect(result.categories.map((category) => category.handle)).toEqual(
      expect.arrayContaining([
        "trapi-ma",
        "trapi-ma-srdce-a-cievy",
        "trapi-ma-srdce-a-cievy-krcove-zily",
      ])
    )

    const mainProduct = result.products.find(
      (product) => product.handle === "shopitem-fixture-main"
    )
    const hiddenProduct = result.products.find(
      (product) => product.handle === "shopitem-fixture-hidden"
    )

    expect(mainProduct?.categories).toEqual([
      {
        handle: "trapi-ma-srdce-a-cievy-krcove-zily",
      },
    ])
    expect(mainProduct?.metadata).toMatchObject({
      related_products: [
        "fixture-main",
        "fixture-related",
        "fixture-hidden",
        "missing-product",
      ],
      related_product_handles: ["shopitem-fixture-related"],
      related_product_refs: [
        {
          source_shopitem_id: "fixture-related",
          handle: "shopitem-fixture-related",
        },
      ],
      alternative_products: ["fixture-alt"],
      alternative_product_handles: ["shopitem-fixture-alt"],
      source_category_ids: ["901"],
      source_default_category_id: "901",
    })
    expect(mainProduct?.variants?.map((variant) => variant.sku)).toEqual([
      "SHOPITEM-FIXTURE-MAIN-VARIANT-VARIANT-DUP",
      "SHOPITEM-FIXTURE-MAIN-VARIANT-VARIANT-DUP-2",
    ])
    expect(mainProduct?.variants?.map((variant) => variant.ean)).toEqual([
      "1234567890123",
      undefined,
    ])
    expect(hiddenProduct?.status).toBe(ProductStatus.DRAFT)
  })
})
