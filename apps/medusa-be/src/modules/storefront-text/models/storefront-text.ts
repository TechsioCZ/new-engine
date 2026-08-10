import type { InferTypeOf } from "@medusajs/framework/types"
import { model } from "@medusajs/framework/utils"

const StorefrontText = model
  .define("storefront_text", {
    country: model.text(),
    default_value: model.text(),
    description: model.text().nullable(),
    domain: model.text(),
    id: model.id({ prefix: "sftxt" }).primaryKey(),
    key: model.text().searchable(),
    locale: model.text().searchable(),
    market: model.text().searchable(),
    namespace: model.text().searchable(),
    override_value: model.text().nullable(),
    status: model.text().default("active"),
  })
  .indexes([
    {
      name: "IDX_storefront_text_key_market_locale_unique",
      on: ["key", "market", "locale"],
      unique: true,
      where: { deleted_at: null },
    },
    {
      name: "IDX_storefront_text_market_locale_namespace",
      on: ["market", "locale", "namespace"],
      where: { deleted_at: null },
    },
    {
      name: "IDX_storefront_text_status_market_locale",
      on: ["status", "market", "locale"],
      where: { deleted_at: null },
    },
  ])
  .checks([
    {
      expression: (columns) => `${columns.status} IN ('active', 'draft')`,
      name: "CHK_storefront_text_status",
    },
  ])

export type StorefrontTextRecord = InferTypeOf<typeof StorefrontText>

export default StorefrontText
