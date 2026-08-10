import { RuleOperator } from "@medusajs/framework/utils"

const operator = (id: RuleOperator, label: string) => ({
  id,
  label,
  value: id,
})

const multiselectOperators = [
  operator(RuleOperator.IN, "In"),
  operator(RuleOperator.EQ, "Equals"),
  operator(RuleOperator.NE, "Not In"),
]

const numericOperators = [
  operator(RuleOperator.EQ, "Equals"),
  operator(RuleOperator.GT, "Greater than"),
  operator(RuleOperator.GTE, "Greater than or equal"),
  operator(RuleOperator.LT, "Less than"),
  operator(RuleOperator.LTE, "Less than or equal"),
]

export const brandRuleAttribute = {
  field_type: "multiselect",
  id: "brand",
  label: "Brand",
  operators: multiselectOperators,
  required: false,
  value: "items.brand_ids",
}

export const productVariantRuleAttribute = {
  field_type: "multiselect",
  id: "product_variant",
  label: "Product Variant",
  operators: multiselectOperators,
  required: false,
  value: "items.variant_id",
}

export const itemPriceRuleAttribute = {
  field_type: "number",
  id: "item_price",
  label: "Item Price",
  operators: numericOperators,
  required: false,
  value: "items.unit_price",
}

export const itemQuantityRuleAttribute = {
  field_type: "number",
  id: "item_quantity",
  label: "Item Quantity",
  operators: itemPriceRuleAttribute.operators,
  required: false,
  value: "items.quantity",
}

export const cartItemTotalRuleAttribute = {
  field_type: "number",
  id: "cart_item_total",
  label: "Cart Item Total",
  operators: itemPriceRuleAttribute.operators,
  required: false,
  value: "item_total",
}

export const customRuleAttributes = {
  "buy-rules": [
    productVariantRuleAttribute,
    itemPriceRuleAttribute,
    itemQuantityRuleAttribute,
    brandRuleAttribute,
  ],
  rules: [cartItemTotalRuleAttribute],
  "target-rules": [
    productVariantRuleAttribute,
    itemPriceRuleAttribute,
    itemQuantityRuleAttribute,
    brandRuleAttribute,
  ],
} as const
