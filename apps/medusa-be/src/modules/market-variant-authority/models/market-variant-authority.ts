import type { InferTypeOf } from "@medusajs/framework/types"
import { model } from "@medusajs/framework/utils"

const MarketVariantAuthority = model
  .define("market_variant_authority", {
    id: model.id({ prefix: "mvau" }).primaryKey(),
    market_code: model.text().searchable(),
    product_id: model.text().searchable(),
    variant_id: model.text().searchable(),
    availability: model.text().searchable(),
    authority_sha256: model.text().searchable(),
    source_version: model.text(),
    approval_provenance: model.json(),
    source_provenance: model.json(),
  })
  .indexes([
    {
      name: "IDX_market_variant_authority_current_unique",
      on: ["market_code", "product_id", "variant_id"],
      unique: true,
      where: { deleted_at: null },
    },
    {
      name: "IDX_market_variant_authority_hash",
      on: ["market_code", "authority_sha256"],
      where: { deleted_at: null },
    },
  ])
  .checks([
    {
      name: "CHK_market_variant_authority_market_code",
      expression: (columns) => `${columns.market_code} ~ '^[a-z]{2}$'`,
    },
    {
      name: "CHK_market_variant_authority_availability",
      expression: (columns) =>
        `${columns.availability} IN ('sellable', 'unavailable')`,
    },
    {
      name: "CHK_market_variant_authority_product_id",
      expression: (columns) =>
        `${columns.product_id} = btrim(${columns.product_id}) AND ${columns.product_id} <> ''`,
    },
    {
      name: "CHK_market_variant_authority_variant_id",
      expression: (columns) =>
        `${columns.variant_id} = btrim(${columns.variant_id}) AND ${columns.variant_id} <> ''`,
    },
    {
      name: "CHK_market_variant_authority_sha256",
      expression: (columns) => `${columns.authority_sha256} ~ '^[0-9a-f]{64}$'`,
    },
    {
      name: "CHK_market_variant_authority_source_version",
      expression: (columns) =>
        `${columns.source_version} = btrim(${columns.source_version}) AND ${columns.source_version} <> ''`,
    },
    {
      name: "CHK_market_variant_authority_approval_provenance",
      expression: (columns) =>
        `jsonb_typeof(${columns.approval_provenance}) = 'object' AND ${columns.approval_provenance} <> '{}'::jsonb`,
    },
    {
      name: "CHK_market_variant_authority_source_provenance",
      expression: (columns) =>
        `jsonb_typeof(${columns.source_provenance}) = 'object' AND ${columns.source_provenance} <> '{}'::jsonb`,
    },
  ])

export type MarketVariantAuthorityEntity = InferTypeOf<
  typeof MarketVariantAuthority
>

export default MarketVariantAuthority
