import { MedusaError } from "@medusajs/framework/utils"
import {
  buyGetBuyRules,
  buyGetTargetRules,
  currencyRule,
  itemsAttributes,
  ruleAttributes,
  shippingMethodsAttributes,
  validRuleTypes,
} from "./const"
import type {
  GetRuleAttributesMapParams,
  ProductVariantInput,
  RuleType,
  RuleValueOption,
} from "./types"

/**
 * Escape special characters in LIKE/ILIKE patterns.
 * Characters %, _, and \ have special meaning in SQL LIKE patterns
 * and should be escaped when using user input in searches.
 */
export const escapeLikePattern = (str: string) =>
  str.replace(/[%_\\]/g, (char) => `\\${char}`)

/**
 * Maps a product variant to a label/value pair for the admin UI.
 *
 * Label format: "Product Title - Variant Title (SKU)"
 * - Omits parts that are missing
 * - Falls back to variant ID if no title/product available
 */
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

  let label = parts.join(" - ") || variant.id

  if (variant.sku) {
    label += ` (${variant.sku})`
  }

  return {
    label,
    value: variant.id,
  }
}

/**
 * Get rule attributes map with extended attributes (including variants)
 * This extends the default Medusa rule attributes
 */
export function getExtendedRuleAttributesMap({
  promotionType,
  applicationMethodType,
  applicationMethodTargetType,
}: GetRuleAttributesMapParams): Record<RuleType, typeof ruleAttributes> {
  const map: Record<RuleType, typeof ruleAttributes> = {
    rules: [...ruleAttributes],
    "target-rules":
      applicationMethodTargetType === "shipping_methods"
        ? [...shippingMethodsAttributes]
        : [...itemsAttributes],
    "buy-rules":
      applicationMethodTargetType === "shipping_methods"
        ? [...shippingMethodsAttributes]
        : [...itemsAttributes],
  }

  // Add currency rule based on application method type
  if (applicationMethodType === "fixed") {
    map.rules.push({ ...currencyRule })
  } else {
    map.rules.push({ ...currencyRule, required: false })
  }

  // Add buyget-specific rules
  if (promotionType === "buyget") {
    map["buy-rules"].push(...buyGetBuyRules)
    map["target-rules"].push(...buyGetTargetRules)
  }

  return map
}

/**
 * Type guard to check if a string is a valid RuleType
 */
export function isRuleType(ruleType: string): ruleType is RuleType {
  return (validRuleTypes as readonly string[]).includes(ruleType)
}

/**
 * Validate rule type parameter
 */
export function validateRuleType(
  ruleType: string
): asserts ruleType is RuleType {
  if (!isRuleType(ruleType)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid rule type: ${ruleType}. Must be one of: ${validRuleTypes.join(", ")}`
    )
  }
}
