import { createTranslationsWorkflow } from "@medusajs/core-flows"
import type {
  CreateTranslationDTO,
  ITranslationModuleService,
  MedusaContainer,
  TranslationDTO,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { isPieceMeasurementSourceUnit } from "../utils/measurement-unit-source"
import { getMeasurementUnitService } from "../utils/measurement-units"

const MEASUREMENT_UNIT_REFERENCE = "measurement_unit"

export const PIECE_UNIT_TRANSLATIONS = {
  "cs-CZ": { name: "kus", symbol: "ks" },
  "hu-HU": { name: "darab", symbol: "db" },
  "ro-RO": { name: "bucată", symbol: "buc." },
  "sk-SK": { name: "kus", symbol: "ks" },
} as const

type MeasurementUnitTranslationSource = {
  id: string
  symbol: string
}

type BuildMeasurementUnitTranslationsInput = {
  availableLocaleCodes: string[]
  existingTranslations: Pick<TranslationDTO, "locale_code" | "reference_id">[]
  units: MeasurementUnitTranslationSource[]
}

const isPieceUnit = (unit: MeasurementUnitTranslationSource) =>
  isPieceMeasurementSourceUnit(unit.symbol)

export function buildMissingMeasurementUnitTranslations({
  availableLocaleCodes,
  existingTranslations,
  units,
}: BuildMeasurementUnitTranslationsInput): CreateTranslationDTO[] {
  const availableLocales = new Set(availableLocaleCodes)
  const existingKeys = new Set(
    existingTranslations.map(
      (translation) => `${translation.reference_id}:${translation.locale_code}`
    )
  )

  return units.filter(isPieceUnit).flatMap((unit) =>
    Object.entries(PIECE_UNIT_TRANSLATIONS).flatMap(
      ([localeCode, translations]) => {
        const key = `${unit.id}:${localeCode}`
        if (!availableLocales.has(localeCode) || existingKeys.has(key)) {
          return []
        }

        return [
          {
            locale_code: localeCode,
            reference: MEASUREMENT_UNIT_REFERENCE,
            reference_id: unit.id,
            translations,
          },
        ]
      }
    )
  )
}

export async function seedDefaultMeasurementUnitTranslations(
  container: MedusaContainer
) {
  const localeCodes = Object.keys(PIECE_UNIT_TRANSLATIONS)
  const units = await getMeasurementUnitService(container).listMeasurementUnits(
    {},
    {
      select: ["id", "symbol"],
      take: 10_000,
    }
  )
  const pieceUnits = units.filter(isPieceUnit)

  if (!pieceUnits.length) {
    return { created: 0, unavailableLocaleCodes: [] }
  }

  const translationService = container.resolve<ITranslationModuleService>(
    Modules.TRANSLATION
  )
  const locales = await translationService.listLocales(
    { code: localeCodes },
    { select: ["code"], take: localeCodes.length }
  )
  const availableLocaleCodes = locales.map((locale) => locale.code)
  const existingTranslations = availableLocaleCodes.length
    ? await translationService.listTranslations(
        {
          locale_code: availableLocaleCodes,
          reference: MEASUREMENT_UNIT_REFERENCE,
          reference_id: pieceUnits.map((unit) => unit.id),
        },
        {
          select: ["locale_code", "reference_id"],
          take: pieceUnits.length * availableLocaleCodes.length,
        }
      )
    : []
  const translations = buildMissingMeasurementUnitTranslations({
    availableLocaleCodes,
    existingTranslations,
    units: pieceUnits,
  })

  if (translations.length) {
    await createTranslationsWorkflow(container).run({
      input: { translations },
    })
  }

  const availableLocaleSet = new Set(availableLocaleCodes)
  return {
    created: translations.length,
    unavailableLocaleCodes: localeCodes.filter(
      (localeCode) => !availableLocaleSet.has(localeCode)
    ),
  }
}
