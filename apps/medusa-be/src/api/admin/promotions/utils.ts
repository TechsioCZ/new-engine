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

export const validateRuleType: (
  ruleType: string,
) => asserts ruleType is RuleType = (ruleType) => {
  medusaValidateRuleType(ruleType)
}

export const escapeLikePattern = (str: string) =>
  str.replaceAll(/[%_\\]/gu, (char) => `\\${char}`)

export const mapVariantToRuleValueOption = (
  variant: ProductVariantInput,
): RuleValueOption => {
  const parts: string[] = []

  if (
    variant.product?.title !== undefined &&
    variant.product.title.length > 0
  ) {
    parts.push(variant.product.title)
  }

  if (variant.title !== undefined && variant.title.length > 0) {
    parts.push(variant.title)
  }

  const joinedLabel = parts.join(" - ")
  let label = joinedLabel === "" ? variant.id : joinedLabel

  if (
    variant.sku !== undefined &&
    variant.sku !== null &&
    variant.sku.length > 0
  ) {
    label += ` (${variant.sku})`
  }

  return {
    label,
    value: variant.id,
  }
}

const appendMissingAttributes = <T extends { id: string }>(
  baseAttributes: T[],
  customAttributes: readonly T[],
) => {
  const existingIds = new Set(baseAttributes.map((attribute) => attribute.id))
  const additions = customAttributes.filter(
    (attribute) => !existingIds.has(attribute.id),
  )

  return [...baseAttributes, ...additions]
}

export const getExtendedRuleAttributesMap = (
  params: GetRuleAttributesMapParams,
) => {
  const map = getRuleAttributesMap(params)
  const itemRuleAttributes =
    params.applicationMethodTargetType === "shipping_methods"
      ? []
      : customRuleAttributes["target-rules"]

  return {
    "buy-rules": appendMissingAttributes(map["buy-rules"], itemRuleAttributes),
    rules: appendMissingAttributes(map.rules, customRuleAttributes.rules),
    "target-rules": appendMissingAttributes(
      map["target-rules"],
      itemRuleAttributes,
    ),
  } satisfies Record<RuleType, typeof map.rules>
}
