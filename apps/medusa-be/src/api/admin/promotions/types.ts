import type {
  ApplicationMethodTargetTypeValues,
  ApplicationMethodTypeValues,
  PromotionTypeValues,
} from "@medusajs/framework/types"

export type RuleType = "rules" | "target-rules" | "buy-rules"

/**
 * Input type for product variant data from the database
 */
export interface ProductVariantInput {
  id: string
  title: string
  sku: string | null
  product?: { title: string } | null | undefined
}

/**
 * Output type for rule value options (label/value pairs for admin UI)
 */
export interface RuleValueOption {
  label: string
  value: string
}

export interface GetRuleAttributesMapParams {
  promotionType?: PromotionTypeValues
  applicationMethodType?: ApplicationMethodTypeValues
  applicationMethodTargetType?: ApplicationMethodTargetTypeValues
}
