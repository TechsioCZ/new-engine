import type { MedusaConfigEnv } from "../../config/env"
import type { MedusaPluginConfig } from "../../config/types"
import {
  buildBrandSearchDocument,
  buildCategorySearchDocument,
  buildProductSearchDocument,
} from "./documents"
import {
  BRAND_INDEX_SETTINGS,
  CATEGORY_INDEX_SETTINGS,
  PRODUCT_INDEX_SETTINGS,
} from "./settings"

export function buildMeilisearchPlugin(
  env: MedusaConfigEnv
): MedusaPluginConfig {
  return {
    resolve: "@rokmohar/medusa-plugin-meilisearch",
    options: {
      config: {
        host: env.meilisearchHost,
        apiKey: env.meilisearchApiKey,
      },
      settings: {
        products: {
          type: "products",
          enabled: true,
          fields: [
            "id",
            "status",
            "title",
            "description",
            "handle",
            "thumbnail",
            "created_at",
            "metadata",
            "categories.id",
            "categories.name",
            "categories.handle",
            "brand.id",
            "brand.title",
            "brand.handle",
            "sales_channels.id",
            "variants.id",
            "variants.sku",
            "variants.ean",
            "variants.upc",
            "variants.barcode",
            "variants.metadata",
            "variants.prices.amount",
            "variants.prices.currency_code",
          ],
          indexSettings: PRODUCT_INDEX_SETTINGS,
          transformer: async (
            document: Record<string, unknown>,
            defaultTransformer: (
              input: Record<string, unknown>
            ) => Record<string, unknown>
          ) => {
            const transformedDocument = defaultTransformer(document)

            return buildProductSearchDocument(transformedDocument)
          },
          primaryKey: "id",
        },
        categories: {
          type: "categories",
          enabled: true,
          fields: ["id", "name", "description", "handle", "parent_category_id"],
          indexSettings: CATEGORY_INDEX_SETTINGS,
          transformer: (
            document: Record<string, unknown>,
            defaultTransformer: (
              input: Record<string, unknown>
            ) => Record<string, unknown>
          ) => buildCategorySearchDocument(defaultTransformer(document)),
          primaryKey: "id",
        },
        brands: {
          type: "brands",
          enabled: true,
          fields: ["id", "title", "description", "handle"],
          indexSettings: BRAND_INDEX_SETTINGS,
          transformer: (document: Record<string, unknown>) =>
            buildBrandSearchDocument(document),
          primaryKey: "id",
        },
      },
    },
  }
}
