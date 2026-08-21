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
type TestLocale = "cs-CZ" | "hu-HU" | "ro-RO" | "sk-SK"

const messagesForLocale = (locale: TestLocale) =>
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
  ] as const)("localizes the exact duration %s by market", (label, romanian) => {
    const attribute = {
      ...warrantyAttribute,
      option: { ...warrantyAttribute.option, label },
    }

    expect(resolveProductWarranty([attribute], "sk-SK")).toBe(label)
    expect(resolveProductWarranty([attribute], "cs-CZ")).toBe(label)
    expect(resolveProductWarranty([attribute], "hu-HU")).toBe(label)
    expect(resolveProductWarranty([attribute], "ro-RO")).toBe(romanian)
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

  it.each([
    [
      "sk-SK",
      {
        forbiddenLabels: ["Garancia", "Garanție"],
        input: "2 roky",
        other: "Ostatné informácie",
        output: "2 roky",
        warranty: "Záruka",
      },
    ],
    [
      "cs-CZ",
      {
        forbiddenLabels: ["Garancia", "Garanție"],
        input: "2 roky",
        other: "Ostatní informace",
        output: "2 roky",
        warranty: "Záruka",
      },
    ],
    [
      "hu-HU",
      {
        forbiddenLabels: ["Záruka", "Garanție"],
        input: "2 év",
        other: "Egyéb információk",
        output: "2 év",
        warranty: "Garancia",
      },
    ],
    [
      "ro-RO",
      {
        forbiddenLabels: ["Záruka", "Garancia"],
        input: "2 roky",
        other: "Alte informații",
        output: "2 ani",
        warranty: "Garanție",
      },
    ],
  ] as const)("renders the exact %s warranty presentation without cross-market labels", (locale, {
    forbiddenLabels,
    input,
    other,
    output,
    warranty,
  }) => {
    const localizedWarranty = resolveProductWarranty(
      [
        {
          ...warrantyAttribute,
          option: { ...warrantyAttribute.option, label: input },
        },
      ],
      locale
    )
    const [section] = mergeWarrantyIntoProductContentSections(
      [],
      localizedWarranty,
      other,
      warranty
    )

    expect(section).toEqual({
      html: `<p><strong>${warranty}:</strong> ${output}</p>`,
      key: "other",
      title: other,
    })
    for (const forbiddenLabel of forbiddenLabels) {
      expect(JSON.stringify(section)).not.toContain(forbiddenLabel)
    }
    if (locale === "ro-RO") {
      expect(section?.html).not.toMatch(SLOVAK_WARRANTY_PATTERN)
    }
    expect(productAttributesSource).not.toContain(`${warranty}:`)
  })

  it.each([
    ["sk-SK", "Záruka", ["Garancia", "Garanție"]],
    ["cs-CZ", "Záruka", ["Garancia", "Garanție"]],
    ["hu-HU", "Garancia", ["Záruka", "Garanție"]],
    ["ro-RO", "Garanție", ["Záruka", "Garancia"]],
  ] as const)("publishes the exact %s warranty catalog label", (locale, expected, forbiddenLabels) => {
    const warranty =
      messagesForLocale(locale).catalog.product_detail.sections.warranty

    expect(warranty).toBe(expected)
    for (const forbiddenLabel of forbiddenLabels) {
      expect(warranty).not.toBe(forbiddenLabel)
    }
  })
})
