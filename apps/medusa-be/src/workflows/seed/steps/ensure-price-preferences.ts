import type { IPricingModuleService, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

type PricePreferenceAttribute = "region_id" | "currency_code"

export interface EnsurePricePreferencesStepOutput {
  createdCount: number
  updatedCount: number
  targetCount: number
}

interface ExistingPreference {
  id: string
  isTaxInclusive: boolean
}

interface PricePreferencePayload {
  attribute: PricePreferenceAttribute
  value: string
  is_tax_inclusive: boolean
}

interface PricePreferencePlan {
  createPayloads: PricePreferencePayload[]
  updateIds: string[]
}

export interface EnsurePricePreferencesStepInput {
  regionIds?: string[]
  currencyCodes?: string[]
  isTaxInclusive?: boolean
}

const EnsurePricePreferencesStepId = "ensure-price-preferences-seed-step"

const normalizeId = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

const normalizeCurrencyCode = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim().toLowerCase()
  if (normalized.length === 0) {
    return undefined
  }

  return normalized
}

const isDefinedString = (value: string | undefined): value is string =>
  typeof value === "string" && value.length > 0

const buildKey = (attribute: PricePreferenceAttribute, value: string): string =>
  `${attribute}:${value}`

const uniqueDefinedStrings = (values: (string | undefined)[]): string[] => [
  ...new Set(values.filter(isDefinedString)),
]

const normalizeRegionIds = (regionIds: string[] | undefined): string[] =>
  uniqueDefinedStrings((regionIds ?? []).map(normalizeId))

const normalizeCurrencyCodes = (
  currencyCodes: string[] | undefined,
): string[] =>
  uniqueDefinedStrings((currencyCodes ?? []).map(normalizeCurrencyCode))

const buildExistingPreferenceMap = (
  preferences: {
    attribute: unknown
    value: unknown
    id?: unknown
    is_tax_inclusive: boolean
  }[],
): Map<string, ExistingPreference> => {
  const existingByKey = new Map<string, ExistingPreference>()

  for (const preference of preferences) {
    const { attribute } = preference
    const { value } = preference

    if (
      (attribute !== "region_id" && attribute !== "currency_code") ||
      typeof value !== "string" ||
      typeof preference.id !== "string"
    ) {
      continue
    }

    const normalizedValue =
      attribute === "currency_code" ? value.toLowerCase() : value
    existingByKey.set(buildKey(attribute, normalizedValue), {
      id: preference.id,
      isTaxInclusive: preference.is_tax_inclusive,
    })
  }

  return existingByKey
}

const addPreferencePlanEntry = (params: {
  plan: PricePreferencePlan
  existingByKey: Map<string, ExistingPreference>
  attribute: PricePreferenceAttribute
  value: string
  isTaxInclusive: boolean
}): void => {
  const { plan, existingByKey, attribute, value, isTaxInclusive } = params
  const existingPreference = existingByKey.get(buildKey(attribute, value))

  if (!existingPreference) {
    plan.createPayloads.push({
      attribute,
      is_tax_inclusive: isTaxInclusive,
      value,
    })
    return undefined
  }

  if (existingPreference.isTaxInclusive !== isTaxInclusive) {
    plan.updateIds.push(existingPreference.id)
  }
}

const buildPricePreferencePlan = (params: {
  regionIds: string[]
  currencyCodes: string[]
  existingByKey: Map<string, ExistingPreference>
  isTaxInclusive: boolean
}): PricePreferencePlan => {
  const plan: PricePreferencePlan = {
    createPayloads: [],
    updateIds: [],
  }

  for (const regionId of params.regionIds) {
    addPreferencePlanEntry({
      attribute: "region_id",
      existingByKey: params.existingByKey,
      isTaxInclusive: params.isTaxInclusive,
      plan,
      value: regionId,
    })
  }

  for (const currencyCode of params.currencyCodes) {
    addPreferencePlanEntry({
      attribute: "currency_code",
      existingByKey: params.existingByKey,
      isTaxInclusive: params.isTaxInclusive,
      plan,
      value: currencyCode,
    })
  }

  return plan
}

export const ensurePricePreferencesStep = createStep(
  EnsurePricePreferencesStepId,
  async (input: EnsurePricePreferencesStepInput, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const pricingService = container.resolve<IPricingModuleService>(
      Modules.PRICING,
    )

    const isTaxInclusive = input.isTaxInclusive ?? true
    const regionIds = normalizeRegionIds(input.regionIds)
    const currencyCodes = normalizeCurrencyCodes(input.currencyCodes)

    if (regionIds.length === 0 && currencyCodes.length === 0) {
      const output: EnsurePricePreferencesStepOutput = {
        createdCount: 0,
        targetCount: 0,
        updatedCount: 0,
      }

      return new StepResponse({ result: output })
    }

    const [existingRegionPreferences, existingCurrencyPreferences] =
      await Promise.all([
        regionIds.length > 0
          ? pricingService.listPricePreferences({
              attribute: "region_id",
              value: regionIds,
            })
          : Promise.resolve([]),
        currencyCodes.length > 0
          ? pricingService.listPricePreferences({
              attribute: "currency_code",
              value: currencyCodes,
            })
          : Promise.resolve([]),
      ])

    const existingByKey = buildExistingPreferenceMap([
      ...existingRegionPreferences,
      ...existingCurrencyPreferences,
    ])
    const { createPayloads, updateIds } = buildPricePreferencePlan({
      currencyCodes,
      existingByKey,
      isTaxInclusive,
      regionIds,
    })

    if (createPayloads.length > 0) {
      await pricingService.createPricePreferences(createPayloads)
    }

    const uniqueUpdateIds = [...new Set(updateIds)]
    if (uniqueUpdateIds.length > 0) {
      await pricingService.updatePricePreferences(
        { id: uniqueUpdateIds },
        { is_tax_inclusive: isTaxInclusive },
      )
    }

    logger.info(
      `Ensured price preferences: created ${createPayloads.length}, updated ${uniqueUpdateIds.length}`,
    )

    const output: EnsurePricePreferencesStepOutput = {
      createdCount: createPayloads.length,
      targetCount: regionIds.length + currencyCodes.length,
      updatedCount: uniqueUpdateIds.length,
    }

    return new StepResponse({ result: output })
  },
)
