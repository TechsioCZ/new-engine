import type {
  ApplicationMethodTargetTypeValues,
  ApplicationMethodTypeValues,
  PromotionTypeValues,
} from "@medusajs/types"

export type RuleType = "rules" | "target-rules" | "buy-rules"

/**
 * Input type for product variant data from the database
 */
export type ProductVariantInput = {
  id: string
  title: string
  sku: string | null
  product?: { title: string }
}

/**
 * Output type for rule value options (label/value pairs for admin UI)
 */
export type RuleValueOption = {
  label: string
  value: string
}

export type GetRuleAttributesMapParams = {
  promotionType?: PromotionTypeValues
  applicationMethodType?: ApplicationMethodTypeValues
  applicationMethodTargetType?: ApplicationMethodTargetTypeValues
}
