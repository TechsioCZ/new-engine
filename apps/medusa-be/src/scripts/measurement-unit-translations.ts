import { batchTranslationsWorkflow } from "@medusajs/core-flows"
import type {
  CreateTranslationDTO,
  ITranslationModuleService,
  MedusaContainer,
  TranslationDTO,
  UpdateTranslationDTO,
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
  existingTranslations: Pick<
    TranslationDTO,
    "id" | "locale_code" | "reference_id" | "translations"
  >[]
  units: MeasurementUnitTranslationSource[]
}

type MeasurementUnitTranslationPlan = {
  create: CreateTranslationDTO[]
  update: UpdateTranslationDTO[]
}

const isPieceUnit = (unit: MeasurementUnitTranslationSource) =>
  isPieceMeasurementSourceUnit(unit.symbol)

const hasTranslationValue = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0

const fillMissingTranslationValues = (
  current: Record<string, unknown>,
  defaults: { name: string; symbol: string }
) => {
  const translations = { ...current }
  let changed = false

  for (const field of ["name", "symbol"] as const) {
    if (!hasTranslationValue(translations[field])) {
      translations[field] = defaults[field]
      changed = true
    }
  }

  return changed ? translations : undefined
}

export function buildMeasurementUnitTranslationPlan({
  availableLocaleCodes,
  existingTranslations,
  units,
}: BuildMeasurementUnitTranslationsInput): MeasurementUnitTranslationPlan {
  const availableLocales = new Set(availableLocaleCodes)
  const existingByKey = new Map(
    existingTranslations.map((translation) => [
      `${translation.reference_id}:${translation.locale_code}`,
      translation,
    ])
  )
  const create: CreateTranslationDTO[] = []
  const update: UpdateTranslationDTO[] = []

  for (const unit of units.filter(isPieceUnit)) {
    for (const [localeCode, defaults] of Object.entries(
      PIECE_UNIT_TRANSLATIONS
    )) {
      if (!availableLocales.has(localeCode)) {
        continue
      }

      const existing = existingByKey.get(`${unit.id}:${localeCode}`)
      if (!existing) {
        create.push({
          locale_code: localeCode,
          reference: MEASUREMENT_UNIT_REFERENCE,
          reference_id: unit.id,
          translations: defaults,
        })
        continue
      }

      const translations = fillMissingTranslationValues(
        existing.translations,
        defaults
      )
      if (translations) {
        update.push({ id: existing.id, translations })
      }
    }
  }

  return { create, update }
}

export async function ensureDefaultMeasurementUnitTranslations(
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
    return { created: 0, unavailableLocaleCodes: [], updated: 0 }
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
          select: ["id", "locale_code", "reference_id", "translations"],
          take: pieceUnits.length * availableLocaleCodes.length,
        }
      )
    : []
  const plan = buildMeasurementUnitTranslationPlan({
    availableLocaleCodes,
    existingTranslations,
    units: pieceUnits,
  })

  if (plan.create.length || plan.update.length) {
    await batchTranslationsWorkflow(container).run({
      input: { ...plan, delete: [] },
    })
  }

  const availableLocaleSet = new Set(availableLocaleCodes)
  return {
    created: plan.create.length,
    unavailableLocaleCodes: localeCodes.filter(
      (localeCode) => !availableLocaleSet.has(localeCode)
    ),
    updated: plan.update.length,
  }
}
