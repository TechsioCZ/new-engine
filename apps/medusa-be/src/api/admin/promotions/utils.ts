import { RuleOperator } from "@medusajs/framework/utils"

/**
 * Escape special characters in LIKE/ILIKE patterns.
 * Characters %, _, and \ have special meaning in SQL LIKE patterns
 * and should be escaped when using user input in searches.
 */
export const escapeLikePattern = (str: string) =>
  str.replace(/[%_\\]/g, (char) => `\\${char}`)

/** Operators available for multiselect fields */
export const multiselectOperators = [
  { id: RuleOperator.IN, value: RuleOperator.IN, label: "In" },
  { id: RuleOperator.EQ, value: RuleOperator.EQ, label: "Equals" },
  { id: RuleOperator.NE, value: RuleOperator.NE, label: "Not In" },
]

/** Operators available for numeric comparison fields (e.g., price, quantity) */
export const numericOperators = [
  { id: RuleOperator.EQ, value: RuleOperator.EQ, label: "Equals" },
  { id: RuleOperator.GT, value: RuleOperator.GT, label: "Greater than" },
  {
    id: RuleOperator.GTE,
    value: RuleOperator.GTE,
    label: "Greater than or equal",
  },
  { id: RuleOperator.LT, value: RuleOperator.LT, label: "Less than" },
  {
    id: RuleOperator.LTE,
    value: RuleOperator.LTE,
    label: "Less than or equal",
  },
]

/** Base rule attributes (eligibility conditions) */
const ruleAttributes = [
  {
    id: "customer_group",
    value: "customer.groups.id",
    label: "Customer Group",
    required: false,
    field_type: "multiselect",
    operators: multiselectOperators,
  },
  {
    id: "region",
    value: "region.id",
    label: "Region",
    required: false,
    field_type: "multiselect",
    operators: multiselectOperators,
  },
  {
    id: "country",
    value: "shipping_address.country_code",
    label: "Country",
    required: false,
    field_type: "multiselect",
    operators: multiselectOperators,
  },
  {
    id: "sales_channel",
    value: "sales_channel_id",
    label: "Sales Channel",
    required: false,
    field_type: "multiselect",
    operators: multiselectOperators,
  },
  // Cart value condition for "free item on cart value" standard promotions
  {
    id: "cart_item_total",
    value: "item_total",
    label: "Cart Item Total",
    required: false,
    field_type: "number",
    operators: numericOperators,
  },
]

/** Item attributes for target/buy rules - EXTENDED with variant */
const itemsAttributes = [
  {
    id: "product",
    value: "items.product.id",
    label: "Product",
    required: false,
    field_type: "multiselect",
    operators: multiselectOperators,
  },
  // NEW: Product Variant attribute
  {
    id: "product_variant",
    value: "items.variant_id",
    label: "Product Variant",
    required: false,
    field_type: "multiselect",
    operators: multiselectOperators,
  },
  {
    id: "product_category",
    value: "items.product.categories.id",
    label: "Product Category",
    required: false,
    field_type: "multiselect",
    operators: multiselectOperators,
  },
  {
    id: "product_collection",
    value: "items.product.collection_id",
    label: "Product Collection",
    required: false,
    field_type: "multiselect",
    operators: multiselectOperators,
  },
  {
    id: "product_type",
    value: "items.product.type_id",
    label: "Product Type",
    required: false,
    field_type: "multiselect",
    operators: multiselectOperators,
  },
  {
    id: "product_tag",
    value: "items.product.tags.id",
    label: "Product Tag",
    required: false,
    field_type: "multiselect",
    operators: multiselectOperators,
  },
  // NEW: Item price filter for price-based conditions
  {
    id: "item_price",
    value: "items.unit_price",
    label: "Item Price",
    required: false,
    field_type: "number",
    operators: numericOperators,
  },
  // NEW: Producer/Manufacturer filter
  {
    id: "producer",
    value: "items.product.producers.id",
    label: "Producer",
    required: false,
    field_type: "multiselect",
    operators: multiselectOperators,
  },
]

/** Shipping method attributes */
const shippingMethodsAttributes = [
  {
    id: "shipping_option_type",
    value: "shipping_methods.shipping_option.shipping_option_type_id",
    label: "Shipping Option Type",
    required: false,
    field_type: "multiselect",
    operators: multiselectOperators,
  },
]

/** Currency rule (disguised - shown as form field, not in rules list) */
const currencyRule = {
  id: "currency_code",
  value: "currency_code",
  label: "Currency Code",
  field_type: "select",
  required: true,
  disguised: true,
  hydrate: true,
  operators: [{ id: RuleOperator.EQ, value: RuleOperator.EQ, label: "Equals" }],
}

/** Buy rules for buyget promotions */
const buyGetBuyRules = [
  {
    id: "buy_rules_min_quantity",
    value: "buy_rules_min_quantity",
    label: "Minimum quantity of items",
    field_type: "number",
    required: true,
    disguised: true,
    operators: [
      { id: RuleOperator.EQ, value: RuleOperator.EQ, label: "Equals" },
    ],
  },
]

/** Target rules for buyget promotions */
const buyGetTargetRules = [
  {
    id: "apply_to_quantity",
    value: "apply_to_quantity",
    label: "Quantity of items promotion will apply to",
    field_type: "number",
    required: true,
    disguised: true,
    operators: [
      { id: RuleOperator.EQ, value: RuleOperator.EQ, label: "Equals" },
    ],
  },
]

export type RuleType = "rules" | "target-rules" | "buy-rules"

type GetRuleAttributesMapParams = {
  promotionType?: string
  applicationMethodType?: string
  applicationMethodTargetType?: string
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

/** Valid rule types */
export const validRuleTypes = ["rules", "target-rules", "buy-rules"] as const

/**
 * Validate rule type parameter
 */
export function validateRuleType(
  ruleType: string
): asserts ruleType is RuleType {
  if (!validRuleTypes.includes(ruleType as RuleType)) {
    throw new Error(
      `Invalid rule type: ${ruleType}. Must be one of: ${validRuleTypes.join(", ")}`
    )
  }
}
