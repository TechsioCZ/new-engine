import { describe, expect, it } from "vitest"
import type {
  Product,
  ProductDetailContentSection,
  ProductOfferState,
} from "@/components/product-detail/product-detail.types"
import {
  mergeProductBrandSection,
  mergeProductCodeIntoOtherSection,
  mergeProductParametersSection,
  type ProductFactLabels,
} from "@/components/product-detail/utils/product-fact-sections"

const labels: ProductFactLabels = {
  brandSectionTitle: "Značka",
  brandVisitLabel: "Zobraziť všetky produkty značky",
  categoryLabel: "Kategória",
  codeLabel: "Kód produktu",
  compositionLabel: "Zloženie",
  eanLabel: "EAN",
  inciLabel: "Zloženie (INCI)",
  otherSectionTitle: "Ostatné informácie",
  parametersSectionTitle: "Zloženie a Parametre",
  storageLabel: "Skladovanie",
  volumeLabel: "Objem",
}

const offerState = (
  overrides: Partial<ProductOfferState> = {}
): ProductOfferState => ({
  actionAmount: null,
  applyLoyaltyDiscount: false,
  applyQuantityDiscount: false,
  applyVolumeDiscount: false,
  availabilityLabel: "",
  code: null,
  currentAmount: null,
  ean: null,
  expectedDeliveryDate: null,
  hasActiveDiscount: false,
  isInStock: true,
  standardAmount: null,
  stockAmount: null,
  ...overrides,
})

const descriptionSection: ProductDetailContentSection = {
  html: "<p>Popis</p>",
  key: "description",
  title: "Popis",
}

const productWithTextProperties = (
  entries: readonly { name: string; value: string }[]
) => ({ metadata: { text_properties: entries } }) as unknown as Product

describe("mergeProductParametersSection", () => {
  it("builds a parameters section from category, EAN and text properties", () => {
    const sections = mergeProductParametersSection({
      categories: [{ id: "cat_1", name: "> Vitamíny a minerály" }] as never,
      labels,
      offerState: offerState({ ean: "8586021133573" }),
      product: productWithTextProperties([
        { name: "Zloženie:", value: "čistená voda" },
        { name: "objem", value: "200 ml" },
      ]),
      sections: [descriptionSection],
    })
    const parameters = sections.find((section) => section.key === "parameters")

    expect(parameters?.title).toBe("Zloženie a Parametre")
    expect(parameters?.html).toContain("Vitamíny a minerály")
    expect(parameters?.html).toContain("8586021133573")
    expect(parameters?.html).toContain("<th>Zloženie</th>")
    expect(parameters?.html).toContain("<th>Objem</th>")
    expect(parameters?.html).toContain("čistená voda")
  })

  it("keeps unmapped source property names as their own label", () => {
    const sections = mergeProductParametersSection({
      categories: [],
      labels,
      offerState: offerState(),
      product: productWithTextProperties([
        { name: "Krajina pôvodu", value: "Slovensko" },
      ]),
      sections: [],
    })

    expect(sections[0]?.html).toContain("<th>Krajina pôvodu</th>")
  })

  it("omits the parameters section when no product facts exist", () => {
    const sections = mergeProductParametersSection({
      categories: [],
      labels,
      offerState: offerState(),
      product: {} as Product,
      sections: [descriptionSection],
    })

    expect(sections).toEqual([descriptionSection])
  })

  it("escapes source values", () => {
    const sections = mergeProductParametersSection({
      categories: [],
      labels,
      offerState: offerState(),
      product: productWithTextProperties([
        { name: "Zloženie", value: "<script>alert(1)</script>" },
      ]),
      sections: [],
    })

    expect(sections[0]?.html).not.toContain("<script>")
    expect(sections[0]?.html).toContain("&lt;script&gt;")
  })
})

describe("mergeProductBrandSection", () => {
  it("renders the brand title and a registry-projected brand link", () => {
    const sections = mergeProductBrandSection({
      brandPublicSlugsById: { brand_1: "herbatica" },
      labels,
      market: "sk",
      product: {
        brand: { id: "brand_1", title: "Herbatica" },
      } as unknown as Product,
      sections: [descriptionSection],
    })
    const brand = sections.find((section) => section.key === "brand")

    expect(brand?.title).toBe("Značka")
    expect(brand?.html).toContain("Herbatica")
    expect(brand?.html).toContain("herbatica")
    expect(brand?.html).toContain("Zobraziť všetky produkty značky")
  })

  it("renders the brand title without a link when no projection exists", () => {
    const sections = mergeProductBrandSection({
      brandPublicSlugsById: {},
      labels,
      market: "cz",
      product: {
        brand: { id: "brand_1", title: "Herbatica" },
      } as unknown as Product,
      sections: [],
    })

    expect(sections[0]?.html).toContain("Herbatica")
    expect(sections[0]?.html).not.toContain("<a ")
  })

  it("omits the brand section when the product has no brand", () => {
    expect(
      mergeProductBrandSection({
        brandPublicSlugsById: {},
        labels,
        market: "hu",
        product: {} as Product,
        sections: [descriptionSection],
      })
    ).toEqual([descriptionSection])
  })
})

describe("mergeProductCodeIntoOtherSection", () => {
  it("creates the other section from the product code", () => {
    const sections = mergeProductCodeIntoOtherSection({
      labels,
      offerState: offerState({ code: "0474" }),
      sections: [descriptionSection],
    })
    const other = sections.find((section) => section.key === "other")

    expect(other?.title).toBe("Ostatné informácie")
    expect(other?.html).toContain("0474")
  })

  it("appends the product code to existing other content", () => {
    const sections = mergeProductCodeIntoOtherSection({
      labels,
      offerState: offerState({ code: "0474" }),
      sections: [
        descriptionSection,
        { html: "<p>GPSR</p>", key: "other", title: "Ostatné informácie" },
      ],
    })
    const other = sections.find((section) => section.key === "other")

    expect(other?.html).toContain("GPSR")
    expect(other?.html).toContain("0474")
  })
})

describe("information section order", () => {
  it("orders sections identically regardless of merge order", () => {
    const sections = mergeProductCodeIntoOtherSection({
      labels,
      offerState: offerState({ code: "0474" }),
      sections: mergeProductBrandSection({
        brandPublicSlugsById: {},
        labels,
        market: "ro",
        product: {
          brand: { id: "brand_1", title: "Herbatica" },
          metadata: { text_properties: [{ name: "objem", value: "75 ml" }] },
        } as unknown as Product,
        sections: mergeProductParametersSection({
          categories: [],
          labels,
          offerState: offerState({ ean: "123" }),
          product: {
            metadata: { text_properties: [{ name: "objem", value: "75 ml" }] },
          } as unknown as Product,
          sections: [
            {
              html: "<p>Upozornenie</p>",
              key: "warning",
              title: "Upozornenie",
            },
            descriptionSection,
          ],
        }),
      }),
    })

    expect(sections.map((section) => section.key)).toEqual([
      "description",
      "parameters",
      "warning",
      "brand",
      "other",
    ])
  })
})
