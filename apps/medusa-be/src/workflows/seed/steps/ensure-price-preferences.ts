import type { IPricingModuleService, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

type PricePreferenceAttribute = "region_id" | "currency_code"

type EnsurePricePreferencesStepOutput = {
  createdCount: number
  updatedCount: number
  targetCount: number
}

type ExistingPreference = {
  id: string
  isTaxInclusive: boolean
}

type PricePreferencePayload = {
  attribute: PricePreferenceAttribute
  value: string
  is_tax_inclusive: boolean
}

type PricePreferencePlan = {
  createPayloads: PricePreferencePayload[]
  updateIds: string[]
}

export type EnsurePricePreferencesStepInput = {
  regionIds?: string[]
  currencyCodes?: string[]
  isTaxInclusive?: boolean
}

const EnsurePricePreferencesStepId = "ensure-price-preferences-seed-step"

function normalizeId(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return
  }

  const normalized = value.trim()
  return normalized || undefined
}

function normalizeCurrencyCode(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return
  }

  const normalized = value.trim().toLowerCase()
  if (!normalized) {
    return
  }

  return normalized
}

function isDefinedString(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0
}

function buildKey(attribute: PricePreferenceAttribute, value: string): string {
  return `${attribute}:${value}`
}

function uniqueDefinedStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter(isDefinedString))]
}

function normalizeRegionIds(regionIds: string[] | undefined): string[] {
  return uniqueDefinedStrings((regionIds ?? []).map(normalizeId))
}

function normalizeCurrencyCodes(currencyCodes: string[] | undefined): string[] {
  return uniqueDefinedStrings((currencyCodes ?? []).map(normalizeCurrencyCode))
}

function buildExistingPreferenceMap(
  preferences: Array<{
    attribute: unknown
    value: unknown
    id?: unknown
    is_tax_inclusive: boolean
  }>
): Map<string, ExistingPreference> {
  const existingByKey = new Map<string, ExistingPreference>()

  for (const preference of preferences) {
    const attribute = preference.attribute
    const value = preference.value

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

function addPreferencePlanEntry(params: {
  plan: PricePreferencePlan
  existingByKey: Map<string, ExistingPreference>
  attribute: PricePreferenceAttribute
  value: string
  isTaxInclusive: boolean
}): void {
  const { plan, existingByKey, attribute, value, isTaxInclusive } = params
  const existingPreference = existingByKey.get(buildKey(attribute, value))

  if (!existingPreference) {
    plan.createPayloads.push({
      attribute,
      value,
      is_tax_inclusive: isTaxInclusive,
    })
    return
  }

  if (existingPreference.isTaxInclusive !== isTaxInclusive) {
    plan.updateIds.push(existingPreference.id)
  }
}

function buildPricePreferencePlan(params: {
  regionIds: string[]
  currencyCodes: string[]
  existingByKey: Map<string, ExistingPreference>
  isTaxInclusive: boolean
}): PricePreferencePlan {
  const plan: PricePreferencePlan = {
    createPayloads: [],
    updateIds: [],
  }

  for (const regionId of params.regionIds) {
    addPreferencePlanEntry({
      plan,
      existingByKey: params.existingByKey,
      attribute: "region_id",
      value: regionId,
      isTaxInclusive: params.isTaxInclusive,
    })
  }

  for (const currencyCode of params.currencyCodes) {
    addPreferencePlanEntry({
      plan,
      existingByKey: params.existingByKey,
      attribute: "currency_code",
      value: currencyCode,
      isTaxInclusive: params.isTaxInclusive,
    })
  }

  return plan
}

export const ensurePricePreferencesStep = createStep(
  EnsurePricePreferencesStepId,
  async (input: EnsurePricePreferencesStepInput, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const pricingService = container.resolve<IPricingModuleService>(
      Modules.PRICING
    )

    const isTaxInclusive = input.isTaxInclusive ?? true
    const regionIds = normalizeRegionIds(input.regionIds)
    const currencyCodes = normalizeCurrencyCodes(input.currencyCodes)

    if (regionIds.length === 0 && currencyCodes.length === 0) {
      const output: EnsurePricePreferencesStepOutput = {
        createdCount: 0,
        updatedCount: 0,
        targetCount: 0,
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
      regionIds,
      currencyCodes,
      existingByKey,
      isTaxInclusive,
    })

    if (createPayloads.length > 0) {
      await pricingService.createPricePreferences(createPayloads)
    }

    const uniqueUpdateIds = [...new Set(updateIds)]
    if (uniqueUpdateIds.length > 0) {
      await pricingService.updatePricePreferences(
        { id: uniqueUpdateIds },
        { is_tax_inclusive: isTaxInclusive }
      )
    }

    logger.info(
      `Ensured price preferences: created ${createPayloads.length}, updated ${uniqueUpdateIds.length}`
    )

    const output: EnsurePricePreferencesStepOutput = {
      createdCount: createPayloads.length,
      updatedCount: uniqueUpdateIds.length,
      targetCount: regionIds.length + currencyCodes.length,
    }

    return new StepResponse({ result: output })
  }
)
