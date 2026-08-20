import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import type { ProductAttribute } from "@techsio/storefront-data/product-attributes/types"
import { describe, expect, it } from "vitest"
import {
  mergeWarrantyIntoProductContentSections,
  resolveProductWarranty,
} from "./product-attributes"

const warrantyAttribute = {
  id: "pattr_1",
  definition: {
    id: "pattrdef_1",
    key: "warranty",
    label: "Záruka",
    input_type: "select",
  },
  option: {
    id: "pattropt_1",
    key: "24-mesiacov",
    label: "24 mesiacov",
  },
  text_value: null,
} satisfies ProductAttribute
const SLOVAK_WARRANTY_PATTERN = /Záruka|roky/

const productAttributesSource = readFileSync(
  resolve(process.cwd(), "src/lib/storefront/product-attributes.ts"),
  "utf8"
)
const messagesForLocale = (locale: "ro-RO" | "sk-SK") =>
  JSON.parse(
    readFileSync(
      resolve(
        process.cwd(),
        `../medusa-be/src/modules/storefront-text/messages/${locale}.json`
      ),
      "utf8"
    )
  )

describe("Product Attribute Warranty", () => {
  it("resolves Warranty only from a compatible structured assignment", () => {
    expect(resolveProductWarranty([warrantyAttribute], "sk-SK")).toBe(
      "24 mesiacov"
    )
    expect(
      resolveProductWarranty(
        [
          {
            ...warrantyAttribute,
            definition: {
              ...warrantyAttribute.definition,
              input_type: "text",
            },
          },
        ],
        "sk-SK"
      )
    ).toBeNull()
    expect(
      resolveProductWarranty(
        [
          {
            ...warrantyAttribute,
            option: null,
          },
        ],
        "sk-SK"
      )
    ).toBeNull()
    expect(resolveProductWarranty([], "sk-SK")).toBeNull()
  })

  it.each([
    ["1 rok", "1 an"],
    ["2 roky", "2 ani"],
    ["24 mesiacov", "24 de luni"],
    ["1 mesiac", "1 lună"],
  ] as const)("localizes the exact RO duration %s as %s", (label, expected) => {
    const attribute = {
      ...warrantyAttribute,
      option: { ...warrantyAttribute.option, label },
    }

    expect(resolveProductWarranty([attribute], "ro-RO")).toBe(expected)
    expect(resolveProductWarranty([attribute], "sk-SK")).toBe(label)
  })

  it("leaves an unrecognized warranty value unchanged", () => {
    const attribute = {
      ...warrantyAttribute,
      option: { ...warrantyAttribute.option, label: "Predĺžená záruka" },
    }

    expect(resolveProductWarranty([attribute], "ro-RO")).toBe(
      "Predĺžená záruka"
    )
  })

  it("keeps the existing Warranty presentation in the other section", () => {
    expect(
      mergeWarrantyIntoProductContentSections(
        [
          {
            key: "other",
            title: "Ostatné informácie",
            html: "<p>Existing content</p>",
          },
        ],
        "24 mesiacov",
        "Ostatné informácie",
        "Záruka"
      )
    ).toEqual([
      {
        key: "other",
        title: "Ostatné informácie",
        html: "<p>Existing content</p>\n<p><strong>Záruka:</strong> 24 mesiacov</p>",
      },
    ])
  })

  it("adds a missing other section and escapes option labels", () => {
    expect(
      mergeWarrantyIntoProductContentSections(
        [],
        `12 < 24 & "valid"`,
        "Ostatné informácie",
        "Záruka"
      )
    ).toEqual([
      {
        key: "other",
        title: "Ostatné informácie",
        html: "<p><strong>Záruka:</strong> 12 &lt; 24 &amp; &quot;valid&quot;</p>",
      },
    ])
  })

  it("does not change content when Warranty is unavailable", () => {
    const sections = [
      {
        key: "description",
        title: "Popis",
        html: "<p>Product</p>",
      },
    ]

    expect(
      mergeWarrantyIntoProductContentSections(
        sections,
        null,
        "Ostatné informácie",
        "Záruka"
      )
    ).toBe(sections)
  })

  it("renders the Romanian warranty label without a Slovak fallback", () => {
    const localizedWarranty = resolveProductWarranty(
      [
        {
          ...warrantyAttribute,
          option: { ...warrantyAttribute.option, label: "2 roky" },
        },
      ],
      "ro-RO"
    )
    const [section] = mergeWarrantyIntoProductContentSections(
      [],
      localizedWarranty,
      "Alte informații",
      "Garanție"
    )

    expect(section).toEqual({
      key: "other",
      title: "Alte informații",
      html: "<p><strong>Garanție:</strong> 2 ani</p>",
    })
    expect(section?.html).not.toMatch(SLOVAK_WARRANTY_PATTERN)
    expect(productAttributesSource).not.toContain("Záruka:")
  })

  it("publishes distinct SK and RO warranty labels", () => {
    const slovak = messagesForLocale("sk-SK")
    const romanian = messagesForLocale("ro-RO")

    expect(slovak.catalog.product_detail.sections.warranty).toBe("Záruka")
    expect(romanian.catalog.product_detail.sections.warranty).toBe("Garanție")
    expect(romanian.catalog.product_detail.sections.warranty).not.toBe(
      slovak.catalog.product_detail.sections.warranty
    )
  })
})
