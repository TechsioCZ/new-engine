import type { ProductAttribute } from "@techsio/storefront-data/product-attributes/types"
import { describe, expect, it } from "vitest"

import {
  mergeWarrantyIntoProductContentSections,
  resolveProductWarranty,
} from "./product-attributes"

const warrantyAttribute = {
  definition: {
    id: "pattrdef_1",
    input_type: "select",
    key: "warranty",
    label: "Záruka",
  },
  id: "pattr_1",
  option: {
    id: "pattropt_1",
    key: "24-mesiacov",
    label: "24 mesiacov",
  },
  text_value: null,
} satisfies ProductAttribute

describe("Product Attribute Warranty", () => {
  it("resolves Warranty only from a compatible structured assignment", () => {
    expect(resolveProductWarranty([warrantyAttribute])).toBe("24 mesiacov")
    expect(
      resolveProductWarranty([
        {
          ...warrantyAttribute,
          definition: {
            ...warrantyAttribute.definition,
            input_type: "text",
          },
        },
      ])
    ).toBeNull()
    expect(
      resolveProductWarranty([
        {
          ...warrantyAttribute,
          option: null,
        },
      ])
    ).toBeNull()
    expect(resolveProductWarranty([])).toBeNull()
  })

  it("keeps the existing Warranty presentation in the other section", () => {
    expect(
      mergeWarrantyIntoProductContentSections(
        [
          {
            html: "<p>Existing content</p>",
            key: "other",
            title: "Ostatné informácie",
          },
        ],
        "24 mesiacov",
        "Ostatné informácie"
      )
    ).toStrictEqual([
      {
        html: "<p>Existing content</p>\n<p><strong>Záruka:</strong> 24 mesiacov</p>",
        key: "other",
        title: "Ostatné informácie",
      },
    ])
  })

  it("adds a missing other section and escapes option labels", () => {
    expect(
      mergeWarrantyIntoProductContentSections(
        [],
        `12 < 24 & "valid"`,
        "Ostatné informácie"
      )
    ).toStrictEqual([
      {
        html: "<p><strong>Záruka:</strong> 12 &lt; 24 &amp; &quot;valid&quot;</p>",
        key: "other",
        title: "Ostatné informácie",
      },
    ])
  })

  it("does not change content when Warranty is unavailable", () => {
    const sections = [
      {
        html: "<p>Product</p>",
        key: "description",
        title: "Popis",
      },
    ]

    expect(
      mergeWarrantyIntoProductContentSections(
        sections,
        null,
        "Ostatné informácie"
      )
    ).toBe(sections)
  })
})
