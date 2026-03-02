import type { IPricingModuleService, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

type PricePreferenceAttribute = "region_id" | "currency_code"

type EnsurePricePreferencesStepOutput = {
  createdCount: number
  updatedCount: number
  targetCount: number
}

export type EnsurePricePreferencesStepInput = {
  regionIds?: string[]
  currencyCodes?: string[]
  isTaxInclusive?: boolean
}

const EnsurePricePreferencesStepId = "ensure-price-preferences-seed-step"

function normalizeId(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim()
  return normalized || undefined
}

function normalizeCurrencyCode(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim().toLowerCase()
  if (!normalized) {
    return undefined
  }

  return normalized
}

function isDefinedString(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0
}

function buildKey(attribute: PricePreferenceAttribute, value: string): string {
  return `${attribute}:${value}`
}

export const ensurePricePreferencesStep = createStep(
  EnsurePricePreferencesStepId,
  async (input: EnsurePricePreferencesStepInput, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const pricingService = container.resolve<IPricingModuleService>(
      Modules.PRICING
    )

    const isTaxInclusive = input.isTaxInclusive ?? true
    const regionIds = [
      ...new Set((input.regionIds ?? []).map(normalizeId).filter(isDefinedString)),
    ]
    const currencyCodes = [
      ...new Set(
        (input.currencyCodes ?? [])
          .map(normalizeCurrencyCode)
          .filter(isDefinedString)
      ),
    ]

    if (regionIds.length === 0 && currencyCodes.length === 0) {
      return new StepResponse<EnsurePricePreferencesStepOutput>({
        result: {
          createdCount: 0,
          updatedCount: 0,
          targetCount: 0,
        },
      })
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

    const existingByKey = new Map<string, { id: string; isTaxInclusive: boolean }>()

    for (const preference of [
      ...existingRegionPreferences,
      ...existingCurrencyPreferences,
    ]) {
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

    const createPayloads: Array<{
      attribute: PricePreferenceAttribute
      value: string
      is_tax_inclusive: boolean
    }> = []
    const updateIds: string[] = []

    for (const regionId of regionIds) {
      const key = buildKey("region_id", regionId)
      const existingPreference = existingByKey.get(key)

      if (!existingPreference) {
        createPayloads.push({
          attribute: "region_id",
          value: regionId,
          is_tax_inclusive: isTaxInclusive,
        })
        continue
      }

      if (existingPreference.isTaxInclusive !== isTaxInclusive) {
        updateIds.push(existingPreference.id)
      }
    }

    for (const currencyCode of currencyCodes) {
      const key = buildKey("currency_code", currencyCode)
      const existingPreference = existingByKey.get(key)

      if (!existingPreference) {
        createPayloads.push({
          attribute: "currency_code",
          value: currencyCode,
          is_tax_inclusive: isTaxInclusive,
        })
        continue
      }

      if (existingPreference.isTaxInclusive !== isTaxInclusive) {
        updateIds.push(existingPreference.id)
      }
    }

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

    return new StepResponse<EnsurePricePreferencesStepOutput>({
      result: {
        createdCount: createPayloads.length,
        updatedCount: uniqueUpdateIds.length,
        targetCount: regionIds.length + currencyCodes.length,
      },
    })
  }
)
