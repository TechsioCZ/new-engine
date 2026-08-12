import { describe, expect, it } from "vitest"
import type {
  Product,
  ProductDetailContentSection,
} from "@/components/product-detail/product-detail.types"
import { mergeBrandGpsrIntoProductContentSections } from "./brand-gpsr"

const createProduct = (brand: Record<string, unknown>): Product =>
  ({
    id: "prod_1",
    brand,
  }) as unknown as Product

const existingSections: ProductDetailContentSection[] = [
  {
    key: "other",
    title: "Ostatní informace",
    html: "<p><strong>Obsah:</strong> 75 ml</p>",
  },
]

describe("brand GPSR product content", () => {
  it("appends complete manufacturer and EU representative details after existing information", () => {
    const sections = mergeBrandGpsrIntoProductContentSections(
      existingSections,
      createProduct({
        gpsr_contact_email: "manufacturer@example.test",
        gpsr_european_reseller_contact_email: "representative@example.test",
        gpsr_european_reseller_manufacturing_company_name:
          "EU Representative <Partners> & Co.",
        gpsr_european_reseller_postal_address: "EU address",
        gpsr_manufactured_outside_eu: true,
        gpsr_manufacturing_company_name: "Manufacturer Ltd.",
        gpsr_postal_address: "Manufacturer address",
      }),
      "Ostatní informace",
      "cs-CZ"
    )

    expect(sections).toHaveLength(1)
    expect(sections[0]?.html).toBe(
      [
        "<p><strong>Obsah:</strong> 75 ml</p>",
        "<p><strong>Výrobní společnost:</strong> Manufacturer Ltd.</p>",
        "<p><strong>Adresa výrobce:</strong> Manufacturer address</p>",
        "<p><strong>E-mail výrobce:</strong> manufacturer@example.test</p>",
        "<p><strong>Vyrobeno mimo EU:</strong> Ano</p>",
        "<p><strong>Odpovědná osoba v EU:</strong> EU Representative &lt;Partners&gt; &amp; Co.</p>",
        "<p><strong>Adresa odpovědné osoby v EU:</strong> EU address</p>",
        "<p><strong>E-mail odpovědné osoby v EU:</strong> representative@example.test</p>",
      ].join("\n")
    )
  })

  it("creates the other section and omits unavailable optional rows", () => {
    expect(
      mergeBrandGpsrIntoProductContentSections(
        [],
        createProduct({
          gpsr_contact_email: "manufacturer@example.test",
          gpsr_manufactured_outside_eu: false,
          gpsr_manufacturing_company_name: "Manufacturer Ltd.",
        }),
        "Ostatné informácie",
        "sk-SK"
      )
    ).toEqual([
      {
        key: "other",
        title: "Ostatné informácie",
        html: [
          "<p><strong>Výrobná spoločnosť:</strong> Manufacturer Ltd.</p>",
          "<p><strong>E-mail výrobcu:</strong> manufacturer@example.test</p>",
          "<p><strong>Vyrobené mimo EÚ:</strong> Nie</p>",
        ].join("\n"),
      },
    ])
  })

  it("keeps existing sections unchanged when the brand has no GPSR contact details", () => {
    const sections = mergeBrandGpsrIntoProductContentSections(
      existingSections,
      createProduct({
        gpsr_manufactured_outside_eu: false,
      }),
      "Ostatní informace",
      "cs-CZ"
    )

    expect(sections).toBe(existingSections)
  })
})
