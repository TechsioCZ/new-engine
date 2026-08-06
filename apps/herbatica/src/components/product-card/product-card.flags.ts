import type { HttpTypes } from "@medusajs/types"
import { FLAG_CONFIG, type SupportedFlagCode } from "./product-card.constants"
import { asBoolean, asRecord } from "./product-card.parsers"
import type { ProductFlagState } from "./product-card.types"

export type ProductFlagLabels = Record<SupportedFlagCode, string>

const buildActionFlag = (labels: ProductFlagLabels): ProductFlagState => ({
  label: labels.action,
  variant: FLAG_CONFIG.action.variant,
})

const resolveSupportedFlagCode = (value: unknown): SupportedFlagCode | null => {
  if (typeof value !== "string") {
    return null
  }

  return value in FLAG_CONFIG ? (value as SupportedFlagCode) : null
}

const isFlagActive = (
  code: SupportedFlagCode,
  active: boolean | null | undefined,
  hasDiscount: boolean
) => (code === "action" ? active === true || hasDiscount : active === true)

export const resolveFlags = (
  product: HttpTypes.StoreProduct,
  hasDiscount: boolean,
  labels: ProductFlagLabels
): ProductFlagState[] => {
  const metadata = asRecord(product.metadata)
  const flags = metadata?.flags

  if (!Array.isArray(flags)) {
    return hasDiscount ? [buildActionFlag(labels)] : []
  }

  const resolvedFlags: ProductFlagState[] = []
  const usedCodes = new Set<SupportedFlagCode>()

  for (const flag of flags) {
    const flagRecord = asRecord(flag)
    if (!flagRecord) {
      continue
    }

    const code = resolveSupportedFlagCode(flagRecord.code)
    const active = asBoolean(flagRecord.active)

    if (!(code && isFlagActive(code, active, hasDiscount))) {
      continue
    }

    if (usedCodes.has(code)) {
      continue
    }

    usedCodes.add(code)
    const config = FLAG_CONFIG[code]

    resolvedFlags.push({
      label: labels[code],
      variant: config.variant,
    })
  }

  if (hasDiscount && !usedCodes.has("action")) {
    resolvedFlags.push(buildActionFlag(labels))
  }

  return resolvedFlags
}
