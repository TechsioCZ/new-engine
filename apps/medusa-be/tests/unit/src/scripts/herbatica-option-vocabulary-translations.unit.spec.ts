import { describe, expect, it } from "vitest"
import {
  planVocabularyTranslations,
  translateShippingOptionName,
  translateVariantTitle,
} from "../../../../src/scripts/herbatica-option-vocabulary-translations"

describe("translateVariantTitle", () => {
  it.each([
    ["20 tabliet", "cs-CZ", "20 tablet"],
    ["20 tabliet", "hu-HU", "20 tabletta"],
    ["20 tabliet", "ro-RO", "20 de comprimate"],
    ["60 tabliet", "ro-RO", "60 de comprimate"],
    ["100 tabliet", "ro-RO", "100 de comprimate"],
    ["200 tabliet", "cs-CZ", "200 tablet"],
    ["30 kapsúl", "cs-CZ", "30 kapslí"],
    ["30 kapsúl", "hu-HU", "30 kapszula"],
    ["30 kapsúl", "ro-RO", "30 de capsule"],
  ] as const)("localizes the unit count %s for %s", (source, locale, expected) => {
    expect(translateVariantTitle(source, locale)).toBe(expected)
  })

  it("keeps Romanian numerals under 20 without the linking word", () => {
    expect(translateVariantTitle("10 tabliet", "ro-RO")).toBe("10 comprimate")
  })

  it("uses the Czech paucal form for two to four", () => {
    expect(translateVariantTitle("3 tabliet", "cs-CZ")).toBe("3 tablety")
  })

  it.each([
    ["Čierna", "cs-CZ", "Černá"],
    ["Čierna", "ro-RO", "Negru"],
    ["Škorica", "hu-HU", "Fahéj"],
    ["Bez príchute", "ro-RO", "Fără aromă"],
    ["Zlatá blond 7.3", "ro-RO", "Blond auriu 7.3"],
  ] as const)("localizes the option value %s for %s", (source, locale, expected) => {
    expect(translateVariantTitle(source, locale)).toBe(expected)
  })

  it("localizes every segment of a composite title", () => {
    expect(translateVariantTitle("S / Black", "ro-RO")).toBe("S / Negru")
    expect(translateVariantTitle("XL / White", "cs-CZ")).toBe("XL / Bílá")
  })

  it.each([
    "100 ml",
    "250 g",
    "27-28",
    "XL",
    "L (35-38)",
    "Default",
    "Default option value",
    "Default variant",
    "",
  ])("leaves the locale-neutral title %s untouched", (source) => {
    expect(translateVariantTitle(source, "ro-RO")).toBeNull()
  })
})

describe("translateShippingOptionName", () => {
  it.each([
    ["Herbatika Standard Shipping", "cs-CZ", "Kurýr na adresu"],
    ["Herbatika Standard Shipping", "hu-HU", "Futárszolgálat címre"],
    ["Herbatika Standard Shipping", "ro-RO", "Curier la adresă"],
    ["Herbatika Express Shipping", "ro-RO", "Livrare expres"],
    ["Kuriér na adresu", "hu-HU", "Futár a címre (európai raktár)"],
  ] as const)("localizes %s for %s", (source, locale, expected) => {
    expect(translateShippingOptionName(source, locale)).toBe(expected)
  })

  it("returns null for an unmapped shipping option", () => {
    expect(translateShippingOptionName("Drone delivery", "ro-RO")).toBeNull()
  })
})

describe("planVocabularyTranslations", () => {
  it("creates one row per derived market and skips rows already in sync", () => {
    const plan = planVocabularyTranslations({
      availableLocaleCodes: ["cs-CZ", "hu-HU", "ro-RO"],
      existingRows: [
        {
          id: "trans_1",
          locale_code: "cs-CZ",
          reference_id: "variant_1",
          value: "20 tablet",
        },
      ],
      field: "title",
      reference: "product_variant",
      rows: [{ id: "variant_1", title: "20 tabliet" }],
      translate: translateVariantTitle,
    })

    expect(plan.toUpdate).toEqual([])
    expect(plan.toCreate).toHaveLength(2)
    expect(plan.toCreate).toEqual(
      expect.arrayContaining([
        {
          locale_code: "ro-RO",
          reference: "product_variant",
          reference_id: "variant_1",
          translations: { title: "20 de comprimate" },
        },
        {
          locale_code: "hu-HU",
          reference: "product_variant",
          reference_id: "variant_1",
          translations: { title: "20 tabletta" },
        },
      ])
    )
  })

  it("reports a stored row that drifted from the vocabulary", () => {
    const plan = planVocabularyTranslations({
      availableLocaleCodes: ["ro-RO"],
      existingRows: [
        {
          id: "trans_9",
          locale_code: "ro-RO",
          reference_id: "so_1",
          value: "Livrare rapida",
        },
      ],
      field: "name",
      reference: "shipping_option",
      rows: [{ id: "so_1", title: "Herbatika Express Shipping" }],
      translate: translateShippingOptionName,
    })

    expect(plan.toCreate).toEqual([])
    expect(plan.toUpdate).toEqual([
      { id: "trans_9", translations: { name: "Livrare expres" } },
    ])
  })

  it("never writes a Slovak source row", () => {
    const plan = planVocabularyTranslations({
      availableLocaleCodes: ["cs-CZ", "hu-HU", "ro-RO", "sk-SK"],
      existingRows: [],
      field: "title",
      reference: "product_variant",
      rows: [{ id: "variant_1", title: "Čierna" }],
      translate: translateVariantTitle,
    })

    expect(plan.toCreate.map((row) => row.locale_code).sort()).toEqual([
      "cs-CZ",
      "hu-HU",
      "ro-RO",
    ])
  })

  it("skips locales the translation module does not know", () => {
    const plan = planVocabularyTranslations({
      availableLocaleCodes: ["ro-RO"],
      existingRows: [],
      field: "name",
      reference: "shipping_option",
      rows: [{ id: "so_1", title: "Herbatika Express Shipping" }],
      translate: translateShippingOptionName,
    })

    expect(plan.toCreate).toEqual([
      {
        locale_code: "ro-RO",
        reference: "shipping_option",
        reference_id: "so_1",
        translations: { name: "Livrare expres" },
      },
    ])
  })

  it("skips titles with no translatable vocabulary", () => {
    expect(
      planVocabularyTranslations({
        availableLocaleCodes: ["cs-CZ", "hu-HU", "ro-RO"],
        existingRows: [],
        field: "title",
        reference: "product_variant",
        rows: [{ id: "variant_2", title: "100 ml" }],
        translate: translateVariantTitle,
      })
    ).toEqual({ toCreate: [], toUpdate: [] })
  })
})

describe("shipping option labels stay distinguishable per market", () => {
  it.each([
    "cs-CZ",
    "hu-HU",
    "ro-RO",
  ] as const)("renders no duplicate label across the CZ/SK shipping options in %s", (locale) => {
    const labels = [
      "Standard Shipping",
      "Express Shipping",
      "Kuriér na adresu",
      "Herbatika Standard Shipping",
      "Herbatika Express Shipping",
    ].map((name) => translateShippingOptionName(name, locale))

    expect(labels.every((label) => label !== null)).toBe(true)
    expect(new Set(labels).size).toBe(labels.length)
  })
})
