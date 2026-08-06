import type { HttpTypes } from "@medusajs/types"

import { FLAG_CONFIG } from "./product-card.constants"
import type { SupportedFlagCode } from "./product-card.constants"
import { asBoolean, asRecord } from "./product-card.parsers"
import type { ProductFlagState } from "./product-card.types"

export type ProductFlagLabels = Record<SupportedFlagCode, string>

const buildActionFlag = (labels: ProductFlagLabels): ProductFlagState => ({
  label: labels.action,
  variant: FLAG_CONFIG.action.variant,
})

const isSupportedFlagCode = (value: string): value is SupportedFlagCode =>
  Object.hasOwn(FLAG_CONFIG, value)

const resolveSupportedFlagCode = (value: unknown): SupportedFlagCode | null =>
  typeof value === "string" && isSupportedFlagCode(value) ? value : null

const isFlagActive = (
  code: SupportedFlagCode,
  active: boolean | null | undefined,
  hasDiscount: boolean,
) => (code === "action" ? active === true || hasDiscount : active === true)

export const resolveFlags = (
  product: HttpTypes.StoreProduct,
  hasDiscount: boolean,
  labels: ProductFlagLabels,
): ProductFlagState[] => {
  const metadata = asRecord(product.metadata)
  const { flags } = metadata ?? {}

  if (!Array.isArray(flags)) {
    return hasDiscount ? [buildActionFlag(labels)] : []
  }

  const resolvedFlags: ProductFlagState[] = []
  const usedCodes = new Set<SupportedFlagCode>()

  for (const flag of flags) {
    const flagRecord = asRecord(flag)
    const { active: activeValue, code: codeValue } = flagRecord ?? {}
    const code = resolveSupportedFlagCode(codeValue)
    const active = asBoolean(activeValue)

    if (
      code !== null &&
      isFlagActive(code, active, hasDiscount) &&
      !usedCodes.has(code)
    ) {
      usedCodes.add(code)
      const config = FLAG_CONFIG[code]

      resolvedFlags.push({
        label: labels[code],
        variant: config.variant,
      })
    }
  }

  if (hasDiscount && !usedCodes.has("action")) {
    resolvedFlags.push(buildActionFlag(labels))
  }

  return resolvedFlags
}
