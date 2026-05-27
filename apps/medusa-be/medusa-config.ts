import { defineConfig, loadEnv } from "@medusajs/framework/utils"
import type { InputConfigWithArrayModules } from "@medusajs/types"
import { readMedusaConfigEnv } from "./src/config/env"
import { buildModules } from "./src/config/modules"
import { buildPlugins } from "./src/config/plugins"
import { buildAdminConfig, buildProjectConfig } from "./src/config/project"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const env = readMedusaConfigEnv(process.env)

const config = {
  featureFlags: {
    index_engine: true,
    translation: true,
    caching: true,
    backend_hmr: true,
  },
<<<<<<< HEAD
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
    ...(REDIS_SESSIONS_ENABLED
      ? {
          redisUrl: requireRedisUrl(),
        }
      : {}),
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
      resolve: "medusa-symmy-plugin",
      options: {},
    },
    {
      resolve: "medusa-order-dashboard-plugin",
      options: {},
    },
    ...(MEILISEARCH_ENABLED ? [meilisearchPlugin] : []),
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
    cachingModule,
    {
      resolve: "./src/modules/producer",
    },
    {
      resolve: "./src/modules/product-list",
    },
    {
      resolve: "./src/modules/product-review",
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
      resolve: "./src/modules/email-log",
    },
    {
      resolve: "./src/modules/order-receipt",
    },
    {
      resolve: "./src/modules/workflow-queue",
    },
    ...(FEATURE_PAYMENT_QR_ENABLED
      ? [
          {
            resolve: "./src/modules/payment-qr",
          },
        ]
      : []),
    eventBusModule,
    workflowEngineModule,
    lockingModule,
    fileModule,
    {
      resolve: "@medusajs/index",
    },
    {
      resolve: "./src/modules/database",
    },
    {
      resolve: "@medusajs/medusa/payment",
      dependencies: [
        ...(FEATURE_PAYMENT_QR_ENABLED ? [QR_PAYMENT_MODULE] : []),
      ],
      options: {
        providers: PAYMENT_PROVIDERS,
      },
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
=======
  admin: buildAdminConfig(env),
  projectConfig: buildProjectConfig(env),
  plugins: buildPlugins(env),
  modules: buildModules(env),
} satisfies InputConfigWithArrayModules

module.exports = defineConfig(config)
>>>>>>> 0a7b17bb (refactor(config): split medusa-config into separate configs)
