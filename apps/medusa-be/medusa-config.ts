import { defineConfig, loadEnv, Modules } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"
const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || ""
const MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY || ""
const FEATURE_PPL_ENABLED = process.env.FEATURE_PPL_ENABLED === "1"
const FEATURE_COMPANY_ENABLED = process.env.FEATURE_COMPANY_ENABLED === "1"

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
              "variant_sku",
              "thumbnail",
            ],
            indexSettings: {
              searchableAttributes: ["title", "description", "variant_sku"],
              displayedAttributes: [
                "id",
                "title",
                "description",
                "variant_sku",
                "thumbnail",
                "handle",
              ],
              filterableAttributes: ["id", "handle", "title"],
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
      resolve: "./src/modules/company",
    },
    {
      resolve: "./src/modules/quote",
    },
    {
      resolve: "./src/modules/approval",
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
          redisUrl: REDIS_URL,
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
    ...(FEATURE_COMPANY_ENABLED
      ? [
          {
            resolve: "./src/modules/company-check",
          },
        ]
      : []),
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
