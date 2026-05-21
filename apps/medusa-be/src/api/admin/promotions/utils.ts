import {
  getRuleAttributesMap,
  validateRuleType as medusaValidateRuleType,
} from "@medusajs/medusa/api/admin/promotions/utils/index"
import { customRuleAttributes } from "./const"
import type {
  GetRuleAttributesMapParams,
  ProductVariantInput,
  RuleType,
  RuleValueOption,
} from "./types"

export const validateRuleType = medusaValidateRuleType

export const escapeLikePattern = (str: string) =>
  str.replace(/[%_\\]/g, (char) => `\\${char}`)

export function mapVariantToRuleValueOption(
  variant: ProductVariantInput
): RuleValueOption {
  const parts: string[] = []

  if (variant.product?.title) {
    parts.push(variant.product.title)
  }

  if (variant.title) {
    parts.push(variant.title)
  }

  const joinedLabel = parts.join(" - ")
  let label = joinedLabel === "" ? variant.id : joinedLabel

  if (variant.sku) {
    label += ` (${variant.sku})`
  }

  return {
    label,
    value: variant.id,
  }
}

export function getExtendedRuleAttributesMap(
  params: GetRuleAttributesMapParams
) {
  const map = getRuleAttributesMap(params)
  const itemRuleAttributes =
    params.applicationMethodTargetType === "shipping_methods"
      ? []
      : customRuleAttributes["target-rules"]

  return {
    rules: appendMissingAttributes(map.rules, customRuleAttributes.rules),
    "target-rules": appendMissingAttributes(
      map["target-rules"],
      itemRuleAttributes
    ),
    "buy-rules": appendMissingAttributes(map["buy-rules"], itemRuleAttributes),
  } satisfies Record<RuleType, typeof map.rules>
}

function appendMissingAttributes<T extends { id: string }>(
  baseAttributes: T[],
  customAttributes: readonly T[]
) {
  const existingIds = new Set(baseAttributes.map((attribute) => attribute.id))
  const additions = customAttributes.filter(
    (attribute) => !existingIds.has(attribute.id)
  )

  return [...baseAttributes, ...additions]
}
