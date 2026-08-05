import type { MedusaConfigEnv } from "../../config/env"
import type { MedusaPluginConfig } from "../../config/types"
import { buildProductFacetDocument } from "./facets/product-facets"

const MEILISEARCH_TYPO_TOLERANCE_SETTINGS = {
  disableOnAttributes: [],
  disableOnNumbers: false,
  disableOnWords: [],
  enabled: true,
  minWordSizeForTypos: {
    oneTypo: 4,
    twoTypos: 10,
  },
}

export function buildMeilisearchPlugin(
  env: MedusaConfigEnv,
): MedusaPluginConfig {
  return {
    options: {
      config: {
        apiKey: env.meilisearchApiKey,
        host: env.meilisearchHost,
      },
      settings: {
        brands: {
          enabled: true,
          fields: ["id", "title", "handle"],
          indexSettings: {
            displayedAttributes: ["id", "title", "handle"],
            filterableAttributes: ["id", "title", "handle"],
            searchableAttributes: ["title", "handle"],
            typoTolerance: MEILISEARCH_TYPO_TOLERANCE_SETTINGS,
          },
          primaryKey: "id",
          type: "brands",
        },
        categories: {
          enabled: true,
          fields: ["id", "description", "handle"],
          indexSettings: {
            displayedAttributes: ["id", "description", "handle"],
            filterableAttributes: ["id", "handle", "description"],
            searchableAttributes: ["description"],
            typoTolerance: MEILISEARCH_TYPO_TOLERANCE_SETTINGS,
          },
          primaryKey: "id",
          type: "categories",
        },
        products: {
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
            "variants.prices.amount",
            "variants.prices.currency_code",
          ],
          indexSettings: {
            displayedAttributes: [
              "id",
              "status",
              "title",
              "description",
              "thumbnail",
              "handle",
              "created_at",
              "metadata",
              "brand",
              "categories",
              "sales_channels",
              "facet_product_status",
              "facet_sales_channel_ids",
              "facet_status",
              "facet_form",
              "facet_brand",
              "facet_ingredient",
              "facet_category_ids",
              "facet_in_stock",
              "facet_price",
            ],
            filterableAttributes: [
              "id",
              "handle",
              "facet_product_status",
              "facet_sales_channel_ids",
              "facet_status",
              "facet_form",
              "facet_brand",
              "facet_ingredient",
              "facet_category_ids",
              "facet_in_stock",
              "facet_price",
            ],
            rankingRules: [
              "sort",
              "words",
              "typo",
              "proximity",
              "attribute",
              "exactness",
            ],
            searchableAttributes: [
              "title",
              "description",
              "handle",
              "brand.title",
              "categories.name",
              "variants.sku",
            ],
            sortableAttributes: ["created_at", "title", "facet_price"],
            typoTolerance: MEILISEARCH_TYPO_TOLERANCE_SETTINGS,
          },
          primaryKey: "id",
          transformer: async (
            document: Record<string, unknown>,
            defaultTransformer: (
              input: Record<string, unknown>,
            ) => Record<string, unknown>,
          ) => {
            const transformedDocument = defaultTransformer(document)

            return {
              ...transformedDocument,
              ...buildProductFacetDocument(transformedDocument),
            }
          },
          type: "products",
        },
      },
    },
    resolve: "@rokmohar/medusa-plugin-meilisearch",
  }
}
