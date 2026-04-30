# MedusaSymmyPlugin

A Medusa v2 plugin that exposes a single authenticated API endpoint:

```
POST /api/symmy/v1/products/batch
```

It upserts a list of products in one request with **per-item identifier matching** (`sku` / `ean` / `erp_id`) and **partial-success** semantics — every product reports its own `created` / `updated` / `failed` status.

Built against `@medusajs/medusa@^2.13`.

---

## Monorepo usage

This repository includes the plugin as a pnpm workspace package at:

```
apps/medusa-symmy-plugin
```

The Medusa backend depends on it via:

```json
"medusa-symmy-plugin": "workspace:*"
```

Build or type-check it through Nx/pnpm:

```bash
pnpm --dir apps/medusa-symmy-plugin build
pnpm --dir apps/medusa-symmy-plugin typecheck
```

## Standalone install

The plugin lives as a standalone package. Two install paths:

### A) Local link from a sibling repo

Inside the plugin directory:

```bash
pnpm install
pnpm build
```

In your Medusa app:

```bash
pnpm add file:../MedusaSymmyPlugin
```

### B) Tarball

```bash
cd MedusaSymmyPlugin
pnpm build
pnpm pack            # produces medusa-symmy-plugin-0.1.0.tgz
# in your medusa app:
pnpm add /absolute/path/medusa-symmy-plugin-0.1.0.tgz
```

## Register

In `medusa-config.ts`:

```ts
import { defineConfig } from "@medusajs/framework/utils"

export default defineConfig({
  // ...
  plugins: [
    {
      resolve: "medusa-symmy-plugin",
      options: {},
    },
  ],
})
```

Then run migrations / dev as usual:

```bash
npx medusa develop
```

The plugin registers no DB models, so no migrations are needed.

---

## API contract

### Request

```http
POST /api/symmy/v1/products/batch
Authorization: Bearer <admin-jwt>     # or session / API key auth
Content-Type: application/json
```

```jsonc
{
  "products": [
    {
      "identifier_type": "sku",                // sku | ean | erp_id
      "sku": "TS-001",
      "title": "Tričko basic",
      "subtitle": "Bavlna 180g",
      "description": "...",
      "handle": "tricko-basic",
      "status": "published",                   // default published
      "discountable": true,
      "weight": 220,
      "hs_code": "6109",
      "categories": [
        { "handle": "tricka" },                // handle preferred
        { "name": "Trička" }                   // name fallback
      ],
      "images": [{ "url": "https://cdn/.../1.jpg" }],
      "base_prices": [                          // used only when no variants given
        { "currency_code": "czk", "amount": 599.00 }
      ],
      "variants": [
        {
          "identifier_type": "sku",            // sku | ean | variant_id
          "sku": "TS-001-M",
          "title": "M",
          "manage_inventory": true,
          "vat_rate": 21,                      // stored on variant.metadata.vat_rate
          "prices": [
            { "currency_code": "czk", "amount": 599.00 }
          ],
          "options": { "size": "M" }
        }
      ],
      "metadata": { "source": "erp-import-2026-04" }
    }
  ]
}
```

### Response (200, partial success allowed)

```jsonc
{
  "success": false,           // true only when every item succeeded
  "processed": 2,
  "failed": 1,
  "results": [
    {
      "identifier_type": "sku",
      "sku": "TS-001",
      "status": "created",
      "product_id": "prod_01...",
      "variant_ids": ["variant_01...", "variant_01..."]
    },
    {
      "identifier_type": "erp_id",
      "erp_id": "ERP-42",
      "status": "updated",
      "product_id": "prod_01...",
      "variant_ids": ["variant_01..."]
    },
    {
      "identifier_type": "ean",
      "ean": "8590000000017",
      "status": "failed",
      "error": "Currency 'usd' not supported by store"
    }
  ]
}
```

The endpoint always returns `200` when validation passed; per-item failures live in `results[].error` (not as HTTP errors). Validation errors return `400`.

---

## Implementation decisions

The original spec leaves several semantics open. This plugin makes the following defaults — change them by forking, the surface area is small.

| Concern | Decision |
|---|---|
| `identifier_type: erp_id` storage | Persists to `product.external_id` **and** mirrors to `product.metadata.erp_id` |
| `identifier_type: sku` / `ean` (product-level) | Resolves the product via the **first variant** with a matching SKU/EAN |
| Variant `identifier_type: variant_id` | Direct lookup; only matches inside the resolved parent product |
| `vat_rate` on variants | Stored as `variant.metadata.vat_rate` (number). **Not** automatically wired to the Tax module — set up tax rates separately and reference this metadata if needed. |
| `base_prices` | Used as the prices for the auto-created default variant when no `variants` are supplied. Ignored once a variant defines its own `prices`; falls back to `base_prices` for variants that omit `prices` entirely. |
| Currencies | Lower-cased server-side. Must be enabled in your store, otherwise the item fails. |
| Sales channel on create | Attached to the store's `default_sales_channel_id`, with fallback to the first sales channel in the store. |
| Categories | `handle` is preferred. If the handle isn't found, falls back to `name`. Unknown categories are silently dropped (no creation). |
| Variant deletion | **Variants present in DB but absent from the payload are kept.** The endpoint is upsert-only, never destructive. |
| Authentication | Requires user auth via bearer token, session, or API key. |

### Identifier matching cheat-sheet

| `identifier_type` (product) | Lookup |
|---|---|
| `sku` | `product_variant.sku = <sku>` → `variant.product_id` |
| `ean` | `product_variant.ean = <ean>` → `variant.product_id` |
| `erp_id` | `product.external_id = <erp_id>` |

| `identifier_type` (variant) | Lookup (scoped to the matched product) |
|---|---|
| `sku` | first variant with matching `sku` on the product |
| `ean` | first variant with matching `ean` on the product |
| `variant_id` | direct id match on the product |

---

## Programmatic use

The workflow is exported and can be invoked from your own code (jobs, scripts, other workflows):

```ts
import { upsertProductsBatchWorkflow } from "medusa-symmy-plugin"

const { result } = await upsertProductsBatchWorkflow(container).run({
  input: { products: [...] },
})
```

---

## Example

```bash
curl -X POST http://localhost:9000/api/symmy/v1/products/batch \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "products": [
      {
        "identifier_type": "erp_id",
        "erp_id": "ERP-1001",
        "title": "Tričko basic",
        "categories": [{ "handle": "tricka" }],
        "base_prices": [{ "currency_code": "czk", "amount": 599 }],
        "variants": [
          {
            "identifier_type": "sku",
            "sku": "TS-1001-M",
            "title": "M",
            "vat_rate": 21,
            "prices": [{ "currency_code": "czk", "amount": 599 }]
          }
        ]
      }
    ]
  }'
```

---

## Layout

```
src/
├── api/
│   ├── middlewares.ts                       # registers POST validator
│   └── admin/products/batch/
│       ├── route.ts                         # POST handler
│       ├── middlewares.ts                   # MiddlewareRoute export
│       └── validators.ts                    # Zod schema (single source of truth)
└── workflows/upsert-products-batch/
    ├── index.ts
    ├── workflow.ts
    ├── types.ts
    └── steps/
        ├── index.ts
        └── process-batch.ts                 # the orchestrator (per-item try/catch)
```

## Roadmap / TODO

- Optional **auto-mapping of `vat_rate` to Medusa Tax module** (find/create tax rate per region).
- Optional **destructive sync mode** that removes variants missing from the payload.
- **Image upload from URL** instead of just storing remote URLs (use Medusa File module).
- **Bulk pricing rules** (region/customer-group prices) on variants.
- **Streaming response** (NDJSON) for very large batches.

PRs welcome.

## License

MIT
