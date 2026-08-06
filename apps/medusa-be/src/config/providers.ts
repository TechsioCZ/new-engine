import { Modules } from "@medusajs/framework/utils"

import { INTEGRATION_CONFIG_NAMES } from "../modules/api-store/integration-config"
import { requireRedisUrl } from "./env"
import type { MedusaConfigEnv } from "./env"
import { assertUnhandledConfigValue } from "./types"
import type { MedusaModuleConfig } from "./types"

interface ModuleProviderConfig {
  id: string
  is_default?: boolean
  options?: Record<string, unknown>
  resolve: string
}

export const buildNotificationProvider = (
  env: MedusaConfigEnv,
): ModuleProviderConfig => {
  switch (env.notificationProvider) {
    case "local": {
      return {
        id: "local",
        options: {
          channels: ["email", "feed"],
          name: "Local Notification Provider",
        },
        resolve: "@medusajs/medusa/notification-local",
      }
    }
    case "resend": {
      return {
        id: "resend",
        options: {
          apiStoreName: INTEGRATION_CONFIG_NAMES.RESEND,
          api_key: env.resendApiKey,
          channels: ["email"],
          from: env.resendFromEmail,
        },
        resolve: "./src/modules/resend",
      }
    }
    default: {
      return assertUnhandledConfigValue(env.notificationProvider)
    }
  }
}

export const buildNotificationProviders = (
  env: MedusaConfigEnv,
): ModuleProviderConfig[] => {
  const provider = buildNotificationProvider(env)

  if (env.notificationProvider === "resend") {
    return [
      provider,
      {
        id: "local-feed",
        options: {
          channels: ["feed"],
          name: "Local Feed Notification Provider",
        },
        resolve: "@medusajs/medusa/notification-local",
      },
    ]
  }

  return [provider]
}

export const buildCachingModule = (
  env: MedusaConfigEnv,
): MedusaModuleConfig => {
  switch (env.cacheProvider) {
    case "inmemory": {
      return {
        options: {
          in_memory: {
            enable: true,
          },
        },
        resolve: "@medusajs/medusa/caching",
      }
    }
    case "redis": {
      return {
        options: {
          providers: [
            {
              id: "caching-redis",
              is_default: true,
              options: {
                redisUrl: requireRedisUrl(env),
              },
              resolve: "@medusajs/caching-redis",
            },
          ],
        },
        resolve: "@medusajs/medusa/caching",
      }
    }
    default: {
      return assertUnhandledConfigValue(env.cacheProvider)
    }
  }
}

export const buildEventBusModule = (
  env: MedusaConfigEnv,
): MedusaModuleConfig => {
  switch (env.eventBusProvider) {
    case "local": {
      return {
        key: Modules.EVENT_BUS,
        resolve: "./src/modules/local-providers/event-bus-local",
      }
    }
    case "redis": {
      return {
        key: Modules.EVENT_BUS,
        options: {
          redisUrl: requireRedisUrl(env),
        },
        resolve: "@medusajs/event-bus-redis",
      }
    }
    default: {
      return assertUnhandledConfigValue(env.eventBusProvider)
    }
  }
}

export const buildWorkflowEngineModule = (
  env: MedusaConfigEnv,
): MedusaModuleConfig => {
  switch (env.workflowEngineProvider) {
    case "inmemory": {
      return {
        resolve: "@medusajs/medusa/workflow-engine-inmemory",
      }
    }
    case "redis": {
      return {
        options: {
          redis: {
            redisUrl: requireRedisUrl(env),
          },
        },
        resolve: "@medusajs/medusa/workflow-engine-redis",
      }
    }
    default: {
      return assertUnhandledConfigValue(env.workflowEngineProvider)
    }
  }
}

const buildLockingProvider = (env: MedusaConfigEnv): ModuleProviderConfig => {
  switch (env.lockingProvider) {
    case "postgres": {
      return {
        id: "locking-postgres",
        is_default: true,
        resolve: "@medusajs/medusa/locking-postgres",
      }
    }
    case "redis": {
      return {
        id: "locking-redis",
        is_default: true,
        options: {
          redisUrl: requireRedisUrl(env),
        },
        resolve: "@medusajs/medusa/locking-redis",
      }
    }
    default: {
      return assertUnhandledConfigValue(env.lockingProvider)
    }
  }
}

export const buildLockingModule = (
  env: MedusaConfigEnv,
): MedusaModuleConfig => ({
  options: {
    providers: [buildLockingProvider(env)],
  },
  resolve: "@medusajs/medusa/locking",
})

const buildFileProvider = (env: MedusaConfigEnv): ModuleProviderConfig => {
  switch (env.fileProvider) {
    case "local": {
      return {
        id: "local",
        options: {
          backend_url: "http://localhost:9000/static",
          private_upload_dir: env.fileLocalUploadDir,
          upload_dir: env.fileLocalUploadDir,
        },
        resolve: "./src/modules/local-providers/file-local",
      }
    }
    case "s3": {
      return {
        id: "s3",
        options: {
          access_key_id: env.minioAccessKey,
          additional_client_config: {
            forcePathStyle: true,
          },
          bucket: env.minioBucket,
          endpoint: env.minioEndpoint,
          file_url: env.minioFileUrl,
          region: env.minioRegion,
          secret_access_key: env.minioSecretKey,
        },
        resolve: "@medusajs/medusa/file-s3",
      }
    }
    default: {
      return assertUnhandledConfigValue(env.fileProvider)
    }
  }
}

export const buildFileModule = (env: MedusaConfigEnv): MedusaModuleConfig => ({
  options: {
    providers: [buildFileProvider(env)],
  },
  resolve: "@medusajs/medusa/file",
})
