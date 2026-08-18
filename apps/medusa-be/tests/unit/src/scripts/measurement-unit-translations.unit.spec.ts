import { describe, expect, it } from "vitest"
import {
  buildMissingMeasurementUnitTranslations,
  PIECE_UNIT_TRANSLATIONS,
} from "../../../../src/scripts/measurement-unit-translations"

describe("measurement unit translation defaults", () => {
  it("creates only missing translations for piece units", () => {
    const translations = buildMissingMeasurementUnitTranslations({
      availableLocaleCodes: ["cs-CZ", "hu-HU", "ro-RO", "sk-SK"],
      existingTranslations: [
        { locale_code: "sk-SK", reference_id: "unit_pcs_1" },
      ],
      units: [
        { id: "unit_pcs_1", symbol: "pcs" },
        { id: "unit_g_100", symbol: "g" },
      ],
    })

    expect(translations).toHaveLength(3)
    expect(translations).toEqual(
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

  it("skips translations for locales unavailable in Medusa", () => {
    expect(
      buildMissingMeasurementUnitTranslations({
        availableLocaleCodes: ["sk-SK"],
        existingTranslations: [],
        units: [{ id: "unit_pcs_100", symbol: "ks" }],
      })
    ).toEqual([
      expect.objectContaining({
        locale_code: "sk-SK",
        translations: { name: "kus", symbol: "ks" },
      }),
    ])
  })
})
