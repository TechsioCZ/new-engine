# Promotions API Extension

This directory contains custom API extensions for Medusa v2's Promotion module, adding enhanced rule filtering capabilities.

## Why This Was Implemented

Medusa v2's default promotion system provides basic product-level filtering. This extension was built to support:

- **Product Variant Filtering** - Target specific variants (e.g., "Blue T-Shirt - Large") instead of entire products
- **Producer/Manufacturer Filtering** - Apply promotions based on product manufacturer
- **Cart Item Total Conditions** - Trigger promotions when cart reaches a certain value
- **Item Price Conditions** - Apply discounts based on individual item prices

These capabilities enable more granular promotional campaigns common in e-commerce scenarios.

## API Endpoints

### Rule Attribute Options

```
GET /admin/promotions/rule-attribute-options/:rule_type
```

Returns available rule attributes for promotion conditions.

**Parameters:**
- `rule_type`: `rules` | `target-rules` | `buy-rules`
- `promotion_type`: (optional) Filter attributes by promotion type
- `application_method_type`: (optional) `fixed` | `percentage`
- `application_method_target_type`: (optional) Target type filter

### Product Variant Options

```
GET /admin/promotions/rule-value-options/:rule_type/product_variant
```

Search and filter product variants for promotion rules.

**Query Parameters:**
- `q`: Search term
- `value`: Comma-separated variant IDs (for hydrating existing rules)
- `limit`: Results per page (1-100, default 10)
- `offset`: Pagination offset

**Response Format:**
```json
{
  "values": [
    { "value": "variant_123", "label": "Blue T-Shirt - Large (SKU-001)" }
  ]
}
```

### Producer Options

```
GET /admin/promotions/rule-value-options/:rule_type/producer
```

Search and filter producers/manufacturers for promotion rules.

**Query Parameters:** Same as product variant endpoint.

## Extended Rule Attributes

| Attribute | Type | Operators | Description |
|-----------|------|-----------|-------------|
| `product_variant` | multiselect | IN, EQ, NIN | Filter by specific variants |
| `producer` | multiselect | IN, EQ, NIN | Filter by manufacturer |
| `cart_item_total` | number | EQ, GT, GTE, LT, LTE | Cart value threshold |
| `item_price` | number | EQ, GT, GTE, LT, LTE | Individual item price |

## File Structure

```
promotions/
├── const.ts           # Rule attribute definitions
├── types.ts           # TypeScript types
├── schema.ts          # Zod validation schemas
├── utils.ts           # Helper functions
├── middlewares.ts     # Route registration
├── rule-attribute-options/
│   └── [rule_type]/route.ts
└── rule-value-options/
    └── [rule_type]/
        ├── product_variant/route.ts
        └── producer/route.ts
```

## Testing

Unit tests are located in `__tests__/utils.unit.spec.ts` covering utility functions, validation, and edge cases.
