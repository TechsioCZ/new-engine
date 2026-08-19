import type { InferTypeOf } from "@medusajs/framework/types"
import { model } from "@medusajs/framework/utils"

const StorefrontUrlAssignment = model
  .define("storefront_url_assignment", {
    id: model.id({ prefix: "sfuasn" }).primaryKey(),
    schema_version: model.number().default(1),
    entity_kind: model.text().searchable(),
    entity_id: model.text().searchable(),
    market_code: model.text().searchable(),
    sales_channel_id: model.text().searchable(),
    public_slug: model.text().searchable(),
    publication_status: model.text().default("draft"),
    source_version: model.number().default(1),
  })
  .indexes([
    {
      name: "IDX_storefront_url_assignment_identity_unique",
      on: ["entity_kind", "entity_id", "market_code"],
      unique: true,
      where: { deleted_at: null },
    },
    {
      name: "IDX_storefront_url_assignment_channel_status",
      on: [
        "entity_kind",
        "sales_channel_id",
        "publication_status",
        "entity_id",
      ],
      where: { deleted_at: null },
    },
    {
      name: "IDX_storefront_url_assignment_kind_market_slug_unique",
      on: ["entity_kind", "market_code", "public_slug"],
      unique: true,
      where: { deleted_at: null },
    },
  ])
  .checks([
    {
      name: "CHK_storefront_url_assignment_schema_version",
      expression: (columns) => `${columns.schema_version} = 1`,
    },
    {
      name: "CHK_storefront_url_assignment_entity_kind",
      expression: (columns) =>
        `${columns.entity_kind} IN ('category', 'brand', 'collection')`,
    },
    {
      name: "CHK_storefront_url_assignment_market_code",
      expression: (columns) =>
        `${columns.market_code} IN ('sk', 'cz', 'hu', 'ro')`,
    },
    {
      name: "CHK_storefront_url_assignment_publication_status",
      expression: (columns) =>
        `${columns.publication_status} IN ('draft', 'published')`,
    },
    {
      name: "CHK_storefront_url_assignment_source_version",
      expression: (columns) => `${columns.source_version} >= 1`,
    },
  ])

export type StorefrontUrlAssignmentRecord = InferTypeOf<
  typeof StorefrontUrlAssignment
>

export default StorefrontUrlAssignment
