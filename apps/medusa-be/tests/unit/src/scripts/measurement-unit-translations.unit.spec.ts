import { describe, expect, it } from "vitest"
import {
  buildMeasurementUnitTranslationPlan,
  PIECE_UNIT_TRANSLATIONS,
} from "../../../../src/scripts/measurement-unit-translations"

describe("measurement unit translation defaults", () => {
  it("creates only missing translations for piece units", () => {
    const plan = buildMeasurementUnitTranslationPlan({
      availableLocaleCodes: ["cs-CZ", "hu-HU", "ro-RO", "sk-SK"],
      existingTranslations: [
        {
          id: "translation_sk",
          locale_code: "sk-SK",
          reference_id: "unit_pcs_1",
          translations: { name: "kus", symbol: "ks" },
        },
      ],
      units: [
        { id: "unit_pcs_1", symbol: "pcs" },
        { id: "unit_g_100", symbol: "g" },
      ],
    })

    expect(plan.update).toEqual([])
    expect(plan.create).toHaveLength(3)
    expect(plan.create).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          locale_code: "cs-CZ",
          reference: "measurement_unit",
          reference_id: "unit_pcs_1",
          translations: PIECE_UNIT_TRANSLATIONS["cs-CZ"],
        }),
        expect.objectContaining({
          locale_code: "hu-HU",
          translations: { name: "darab", symbol: "db" },
        }),
        expect.objectContaining({
          locale_code: "ro-RO",
          translations: { name: "bucată", symbol: "buc." },
        }),
      ])
    )
  })

  it("fills missing fields without overwriting existing translation values", () => {
    const plan = buildMeasurementUnitTranslationPlan({
      availableLocaleCodes: ["cs-CZ", "ro-RO", "sk-SK"],
      existingTranslations: [
        {
          id: "translation_cs",
          locale_code: "cs-CZ",
          reference_id: "unit_pcs_1",
          translations: { description: "ponechat", name: "vlastní název" },
        },
        {
          id: "translation_ro",
          locale_code: "ro-RO",
          reference_id: "unit_pcs_1",
          translations: { symbol: "vlastní-zkratka" },
        },
        {
          id: "translation_sk",
          locale_code: "sk-SK",
          reference_id: "unit_pcs_1",
          translations: { name: "vlastný názov", symbol: "vlastná-skratka" },
        },
      ],
      units: [{ id: "unit_pcs_1", symbol: "pcs" }],
    })

    expect(plan.create).toEqual([])
    expect(plan.update).toEqual([
      {
        id: "translation_cs",
        translations: {
          description: "ponechat",
          name: "vlastní název",
          symbol: "ks",
        },
      },
      {
        id: "translation_ro",
        translations: {
          name: "bucată",
          symbol: "vlastní-zkratka",
        },
      },
    ])
  })

  it("skips translations for locales unavailable in Medusa", () => {
    const plan = buildMeasurementUnitTranslationPlan({
      availableLocaleCodes: ["sk-SK"],
      existingTranslations: [],
      units: [{ id: "unit_pcs_100", symbol: "ks" }],
    })

    expect(plan.update).toEqual([])
    expect(plan.create).toEqual([
      expect.objectContaining({
        locale_code: "sk-SK",
        translations: { name: "kus", symbol: "ks" },
      }),
    ])
  })
})
