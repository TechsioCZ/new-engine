import { defineConfig, loadEnv, Modules } from "@medusajs/framework/utils"
import { buildProductFacetDocument } from "./src/modules/meilisearch/facets/product-facets"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"
const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || ""
const MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY || ""
const FEATURE_PPL_ENABLED = process.env.FEATURE_PPL_ENABLED === "1"

module.exports = defineConfig({
  featureFlags: {
    index_engine: true,
    translation: true,
    caching: true,
    backend_hmr: true,
  },
  admin: {
    // backendUrl: BACKEND_URL,
    vite: () => ({
      server: {
        allowedHosts: process.env.MEDUSA_BACKEND_URL,
        hmr: false,
      },
    }),
  },
  projectConfig: {
    // databaseLogging: [
    //     'query'
    // ],
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS ?? "",
      adminCors: process.env.ADMIN_CORS ?? "",
      authCors: process.env.AUTH_CORS ?? "",
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
    redisUrl: REDIS_URL,
  },
  plugins: [
    {
      resolve: "@medusajs/draft-order",
      options: {},
    },
    {
      resolve: "@rokmohar/medusa-plugin-meilisearch",
      options: {
        config: {
          host: MEILISEARCH_HOST,
          apiKey: MEILISEARCH_API_KEY,
        },
        settings: {
          products: {
            type: "products",
            enabled: true,
            fields: [
              "id",
              "title",
              "description",
              "handle",
              "thumbnail",
              "created_at",
              "metadata",
              "categories.id",
              "categories.name",
              "categories.handle",
              "producer.id",
              "producer.title",
              "producer.handle",
              "variants.id",
              "variants.sku",
              "variants.prices.amount",
              "variants.prices.currency_code",
            ],
            indexSettings: {
              searchableAttributes: [
                "title",
                "description",
                "handle",
                "producer.title",
                "categories.name",
                "variants.sku",
              ],
              displayedAttributes: [
                "id",
                "title",
                "description",
                "thumbnail",
                "handle",
                "created_at",
                "metadata",
                "producer",
                "categories",
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
                "facet_status",
                "facet_form",
                "facet_brand",
                "facet_ingredient",
                "facet_category_ids",
                "facet_in_stock",
                "facet_price",
              ],
              sortableAttributes: ["created_at", "title", "facet_price"],
            },
            transformer: async (
              document: Record<string, unknown>,
              defaultTransformer: (
                input: Record<string, unknown>
              ) => Record<string, unknown>
            ) => {
              const transformedDocument = defaultTransformer(document)

              return {
                ...transformedDocument,
                ...buildProductFacetDocument(transformedDocument),
              }
            },
            primaryKey: "id",
          },
          categories: {
            type: "categories",
            enabled: true,
            fields: ["id", "description", "handle"],
            indexSettings: {
              searchableAttributes: ["description"],
              displayedAttributes: ["id", "description", "handle"],
              filterableAttributes: ["id", "handle", "description"],
            },
            primaryKey: "id",
          },
          producers: {
            type: "producers",
            enabled: true,
            fields: ["id", "title", "handle"],
            indexSettings: {
              searchableAttributes: ["title", "handle"],
              displayedAttributes: ["id", "title", "handle"],
              filterableAttributes: ["id", "title", "handle"],
            },
            primaryKey: "id",
          },
        },
      },
    },
  ],
  modules: [
    {
      resolve: "@medusajs/medusa/translation",
    },
    {
      resolve: "@medusajs/medusa/caching",
      options: {
        providers: [
          {
            resolve: "@medusajs/caching-redis",
            id: "caching-redis",
            is_default: true,
            options: {
              redisUrl: REDIS_URL,
            },
          },
        ],
      },
    },
    {
      resolve: "./src/modules/producer",
    },
    {
      resolve: "@medusajs/event-bus-redis",
      key: Modules.EVENT_BUS,
      options: {
        redisUrl: REDIS_URL,
      },
    },
    {
      resolve: "@medusajs/medusa/workflow-engine-redis",
      options: {
        redis: {
          url: REDIS_URL,
        },
      },
    },
    {
      resolve: "@medusajs/medusa/locking",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/locking-redis",
            id: "locking-redis",
            is_default: true,
            options: {
              redisUrl: REDIS_URL,
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-s3",
            id: "s3",
            options: {
              file_url: process.env.MINIO_FILE_URL,
              endpoint: process.env.MINIO_ENDPOINT,
              bucket: process.env.MINIO_BUCKET,
              access_key_id: process.env.MINIO_ACCESS_KEY,
              secret_access_key: process.env.MINIO_SECRET_KEY,
              region: process.env.MINIO_REGION,
              additional_client_config: {
                forcePathStyle: true,
              },
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/index",
    },
    {
      resolve: "./src/modules/database",
    },
    // PPL Client Module - config stored in DB, managed via Settings → PPL
    ...(FEATURE_PPL_ENABLED
      ? [
          {
            resolve: "./src/modules/ppl-client",
            dependencies: [Modules.LOCKING],
            options: {
              environment: process.env.PPL_ENVIRONMENT || "testing",
            },
          },
        ]
      : []),
    // PPL Fulfillment Provider - thin provider delegating to ppl-client
    ...(FEATURE_PPL_ENABLED
      ? [
          {
            resolve: "@medusajs/medusa/fulfillment",
            dependencies: ["ppl_client"],
            options: {
              providers: [
                {
                  resolve: "./src/modules/fulfillment-ppl",
                  id: "ppl",
                },
              ],
            },
          },
        ]
      : []),
  ],
})
