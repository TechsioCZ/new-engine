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
            key: "other",
            title: "Ostatné informácie",
            html: "<p>Existing content</p>",
          },
        ],
        "24 mesiacov"
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
      mergeWarrantyIntoProductContentSections([], `12 < 24 & "valid"`)
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

    expect(mergeWarrantyIntoProductContentSections(sections, null)).toBe(
      sections
    )
  })
})
