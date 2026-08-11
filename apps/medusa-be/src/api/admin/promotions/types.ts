import type {
  ApplicationMethodTargetTypeValues,
  ApplicationMethodTypeValues,
  PromotionTypeValues,
} from "@medusajs/framework/types"

export type RuleType = "rules" | "target-rules" | "buy-rules"

export type PromotionRuleAttribute = {
  id: string
  value: string
  label: string
  required: boolean
  field_type: string
  operators: Array<{ id: string; value: string; label: string }>
  disguised?: boolean
  hydrate?: boolean
}

/**
 * Input type for product variant data from the database
 */
export type ProductVariantInput = {
  id: string
  title: string
  sku: string | null
  product?: { title: string } | null
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
