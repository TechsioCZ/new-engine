import {
  ContainerRegistrationKeys,
  defineConfig,
  loadEnv,
  Modules,
} from "@medusajs/framework/utils"
import { buildProductFacetDocument } from "./src/modules/meilisearch/facets/product-facets"
import {
  isPaykitProviderEnabled,
  PAYKIT_COMGATE_PROVIDER_ID,
  PAYKIT_GOPAY_PROVIDER_ID,
  PAYKIT_STRIPE_PROVIDER_ID,
  parseBooleanEnv,
} from "./src/modules/payment-paykit/config"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"

const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || ""
const MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY || ""

const FEATURE_PPL_ENABLED = process.env.FEATURE_PPL_ENABLED === "1"
const FEATURE_PACKETA_ENABLED = process.env.FEATURE_PACKETA_ENABLED === "1"
const FEATURE_PAYLOAD_ENABLED = process.env.FEATURE_PAYLOAD_ENABLED === "1"

const FEATURE_PAYKIT_GOPAY_ENABLED = isPaykitProviderEnabled("GOPAY")
const FEATURE_PAYKIT_STRIPE_ENABLED = isPaykitProviderEnabled("STRIPE")
const FEATURE_PAYKIT_COMGATE_ENABLED = isPaykitProviderEnabled("COMGATE")

const PAYKIT_CLOUD_API_KEY = process.env.PAYKIT_CLOUD_API_KEY
const PAYKIT_DEBUG = process.env.PAYKIT_DEBUG === "1"
const PAYKIT_PAYMENT_PROVIDERS = [
  ...(FEATURE_PAYKIT_GOPAY_ENABLED
    ? [
        {
          resolve: "./src/modules/payment-paykit/services/gopay",
          id: PAYKIT_GOPAY_PROVIDER_ID,
          options: {
            clientId: process.env.GOPAY_CLIENT_ID,
            clientSecret: process.env.GOPAY_CLIENT_SECRET,
            cloudApiKey: PAYKIT_CLOUD_API_KEY,
            goId: process.env.GOPAY_GO_ID,
            isSandbox: parseBooleanEnv(process.env.GOPAY_SANDBOX, true),
            webhookUrl: process.env.GOPAY_WEBHOOK_URL,
            debug: PAYKIT_DEBUG,
          },
        },
      ]
    : []),
  ...(FEATURE_PAYKIT_STRIPE_ENABLED
    ? [
        {
          resolve: "./src/modules/payment-paykit/services/stripe",
          id: PAYKIT_STRIPE_PROVIDER_ID,
          options: {
            apiKey: process.env.STRIPE_API_KEY,
            cloudApiKey: PAYKIT_CLOUD_API_KEY,
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
            debug: PAYKIT_DEBUG,
          },
        },
      ]
    : []),
  ...(FEATURE_PAYKIT_COMGATE_ENABLED
    ? [
        {
          resolve: "./src/modules/payment-paykit/services/comgate",
          id: PAYKIT_COMGATE_PROVIDER_ID,
          options: {
            cloudApiKey: PAYKIT_CLOUD_API_KEY,
            merchant: process.env.COMGATE_MERCHANT,
            secret: process.env.COMGATE_SECRET,
            isSandbox: parseBooleanEnv(process.env.COMGATE_SANDBOX, true),
            paymentLabel: process.env.COMGATE_PAYMENT_LABEL,
            debug: PAYKIT_DEBUG,
          },
        },
      ]
    : []),
]

const NOTIFICATION_PROVIDER = process.env.NOTIFICATION_PROVIDER ?? "resend"
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL

const notificationProvider =
  NOTIFICATION_PROVIDER === "local"
    ? {
        resolve: "@medusajs/medusa/notification-local",
        id: "local",
        options: {
          name: "Local Notification Provider",
          channels: ["email"],
        },
      }
    : {
        resolve: "./src/modules/resend",
        id: "resend",
        options: {
          channels: ["email"],
          api_key: RESEND_API_KEY,
          from: RESEND_FROM_EMAIL,
        },
      }

const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL?.trim()
const MEDUSA_COOKIE_SECURE = process.env.MEDUSA_COOKIE_SECURE
const MEDUSA_COOKIE_SAME_SITE = process.env.MEDUSA_COOKIE_SAME_SITE as
  | "lax"
  | "none"
  | "strict"
  | undefined

let MEDUSA_ADMIN_ALLOWED_HOSTS: true | string[] | undefined

if (process.env.NODE_ENV === "development") {
  MEDUSA_ADMIN_ALLOWED_HOSTS = true
} else if (MEDUSA_BACKEND_URL) {
  const backendUrl = MEDUSA_BACKEND_URL.includes("://")
    ? MEDUSA_BACKEND_URL
    : `http://${MEDUSA_BACKEND_URL}`

  MEDUSA_ADMIN_ALLOWED_HOSTS = [new URL(backendUrl).hostname]
}

const cookieOptions = {
  ...(MEDUSA_COOKIE_SECURE !== undefined
    ? {
        secure:
          MEDUSA_COOKIE_SECURE === "1" ||
          MEDUSA_COOKIE_SECURE.toLowerCase() === "true",
      }
    : {}),
  ...(MEDUSA_COOKIE_SAME_SITE
    ? {
        sameSite: MEDUSA_COOKIE_SAME_SITE,
      }
    : {}),
}

module.exports = defineConfig({
  featureFlags: {
    index_engine: true,
    translation: true,
    caching: true,
    backend_hmr: true,
  },
  admin: {
    disable: process.env.MEDUSA_ADMIN_DISABLED_FOR_BACKEND_BUILD === "1",
    // backendUrl: BACKEND_URL,
    vite: () => ({
      build: {
        cssMinify: false,
        minify: false,
        modulePreload: false,
        reportCompressedSize: false,
        target: "esnext",
      },
      esbuild: {
        target: "esnext",
      },
      server: {
        allowedHosts: MEDUSA_ADMIN_ALLOWED_HOSTS,
        hmr: false,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    }),
  },
  projectConfig: {
    // databaseLogging: [
    //     'query'
    // ],
    databaseUrl: process.env.DATABASE_URL,
    databaseSchema:
      process.env.MEDUSA_DATABASE_SCHEMA ??
      process.env.DATABASE_SCHEMA ??
      "public",
    http: {
      storeCors: process.env.STORE_CORS ?? "",
      adminCors: process.env.ADMIN_CORS ?? "",
      authCors: process.env.AUTH_CORS ?? "",
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
    cookieOptions,
    redisUrl: REDIS_URL,
  },
  plugins: [
    {
      resolve: "medusa-plugin-content",
      options: {},
    },
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
              "producer.id",
              "producer.title",
              "producer.handle",
              "sales_channels.id",
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
                "status",
                "title",
                "description",
                "thumbnail",
                "handle",
                "created_at",
                "metadata",
                "producer",
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
              sortableAttributes: ["created_at", "title", "facet_price"],
              rankingRules: [
                "sort",
                "words",
                "typo",
                "proximity",
                "attribute",
                "exactness",
              ],
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
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [notificationProvider],
      },
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
      resolve: "./src/modules/email-log",
    },
    {
      resolve: "./src/modules/order-receipt",
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
    ...(PAYKIT_PAYMENT_PROVIDERS.length
      ? [
          {
            resolve: "@medusajs/medusa/payment",
            options: {
              providers: PAYKIT_PAYMENT_PROVIDERS,
            },
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
    // Packeta Client Module - config stored in DB, managed via Settings → Packeta
    ...(FEATURE_PACKETA_ENABLED
      ? [
          {
            resolve: "./src/modules/packeta-client",
            dependencies: [Modules.LOCKING],
            options: {
              environment: process.env.PACKETA_ENVIRONMENT ?? "testing",
            },
          },
        ]
      : []),
    // Unified Fulfillment Module — conditionally includes PPL and/or Packeta
    // providers. Registered only if at least one carrier is enabled.
    ...(FEATURE_PPL_ENABLED || FEATURE_PACKETA_ENABLED
      ? [
          {
            resolve: "@medusajs/medusa/fulfillment",
            dependencies: [
              ...(FEATURE_PPL_ENABLED ? ["ppl_client"] : []),
              ...(FEATURE_PACKETA_ENABLED
                ? [
                    "packeta_client",
                    Modules.FILE,
                    ContainerRegistrationKeys.QUERY,
                  ]
                : []),
            ],
            options: {
              providers: [
                {
                  resolve: "@medusajs/medusa/fulfillment-manual",
                  id: "manual",
                },
                ...(FEATURE_PPL_ENABLED
                  ? [
                      {
                        resolve: "./src/modules/fulfillment-ppl",
                        id: "ppl",
                      },
                    ]
                  : []),
                ...(FEATURE_PACKETA_ENABLED
                  ? [
                      {
                        resolve: "./src/modules/fulfillment-packeta",
                        id: "packeta",
                      },
                    ]
                  : []),
              ],
            },
          },
        ]
      : []),
    ...(FEATURE_PAYLOAD_ENABLED
      ? [
          {
            resolve: "./src/modules/payload",
            options: {
              serverUrl: process.env.PAYLOAD_BASE_URL,
              apiKey: process.env.PAYLOAD_API_KEY,
              contentCacheTtl: Number.parseInt(
                process.env.CMS_CACHE_TTL ?? "3600",
                10
              ),
              listCacheTtl: Number.parseInt(
                process.env.CMS_LIST_CACHE_TTL ?? "600",
                10
              ),
            },
          },
        ]
      : []),
  ],
})
