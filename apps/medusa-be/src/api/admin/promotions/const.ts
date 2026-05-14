import { RuleOperator } from "@medusajs/framework/utils"

const operator = (id: RuleOperator, label: string) => ({
  id,
  value: id,
  label,
})

const multiselectOperators = [
  operator(RuleOperator.IN, "In"),
  operator(RuleOperator.EQ, "Equals"),
  operator(RuleOperator.NIN, "Not In"),
]

const numericOperators = [
  operator(RuleOperator.EQ, "Equals"),
  operator(RuleOperator.GT, "Greater than"),
  operator(RuleOperator.GTE, "Greater than or equal"),
  operator(RuleOperator.LT, "Less than"),
  operator(RuleOperator.LTE, "Less than or equal"),
]

export const producerRuleAttribute = {
  id: "producer",
  value: "items.producer_ids",
  label: "Producer",
  required: false,
  field_type: "multiselect",
  operators: multiselectOperators,
}

export const productVariantRuleAttribute = {
  id: "product_variant",
  value: "items.variant_id",
  label: "Product Variant",
  required: false,
  field_type: "multiselect",
  operators: multiselectOperators,
}

export const itemPriceRuleAttribute = {
  id: "item_price",
  value: "items.unit_price",
  label: "Item Price",
  required: false,
  field_type: "number",
  operators: numericOperators,
}

export const itemQuantityRuleAttribute = {
  id: "item_quantity",
  value: "items.quantity",
  label: "Item Quantity",
  required: false,
  field_type: "number",
  operators: itemPriceRuleAttribute.operators,
}

export const cartItemTotalRuleAttribute = {
  id: "cart_item_total",
  value: "item_total",
  label: "Cart Item Total",
  required: false,
  field_type: "number",
  operators: itemPriceRuleAttribute.operators,
}

export const customRuleAttributes = {
  rules: [cartItemTotalRuleAttribute],
  "target-rules": [
    productVariantRuleAttribute,
    itemPriceRuleAttribute,
    itemQuantityRuleAttribute,
    producerRuleAttribute,
  ],
  "buy-rules": [
    productVariantRuleAttribute,
    itemPriceRuleAttribute,
    itemQuantityRuleAttribute,
    producerRuleAttribute,
  ],
} as const
