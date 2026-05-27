import { Modules } from "@medusajs/framework/utils"
import { type MedusaConfigEnv, requireRedisUrl } from "./env"
import { assertNever, type MedusaModuleConfig } from "./types"

type ModuleProviderConfig = {
  id: string
  is_default?: boolean
  options?: Record<string, unknown>
  resolve: string
}

export function buildNotificationProvider(
  env: MedusaConfigEnv
): ModuleProviderConfig {
  switch (env.notificationProvider) {
    case "local":
      return {
        resolve: "@medusajs/medusa/notification-local",
        id: "local",
        options: {
          name: "Local Notification Provider",
          channels: ["email", "feed"],
        },
      }
    case "resend":
      return {
        resolve: "./src/modules/resend",
        id: "resend",
        options: {
          channels: ["email"],
          api_key: env.resendApiKey,
          from: env.resendFromEmail,
        },
      }
    default:
      return assertNever(env.notificationProvider)
  }
}

export function buildNotificationProviders(
  env: MedusaConfigEnv
): ModuleProviderConfig[] {
  const provider = buildNotificationProvider(env)

  if (env.notificationProvider === "resend") {
    return [
      provider,
      {
        resolve: "@medusajs/medusa/notification-local",
        id: "local-feed",
        options: {
          name: "Local Feed Notification Provider",
          channels: ["feed"],
        },
      },
    ]
  }

  return [provider]
}

export function buildCachingModule(env: MedusaConfigEnv): MedusaModuleConfig {
  switch (env.cacheProvider) {
    case "inmemory":
      return {
        resolve: "@medusajs/medusa/caching",
        options: {
          in_memory: {
            enable: true,
          },
        },
      }
    case "redis":
      return {
        resolve: "@medusajs/medusa/caching",
        options: {
          providers: [
            {
              resolve: "@medusajs/caching-redis",
              id: "caching-redis",
              is_default: true,
              options: {
                redisUrl: requireRedisUrl(env),
              },
            },
          ],
        },
      }
    default:
      return assertNever(env.cacheProvider)
  }
}

export function buildEventBusModule(env: MedusaConfigEnv): MedusaModuleConfig {
  switch (env.eventBusProvider) {
    case "local":
      return {
        resolve: "./src/modules/local-providers/event-bus-local",
        key: Modules.EVENT_BUS,
      }
    case "redis":
      return {
        resolve: "@medusajs/event-bus-redis",
        key: Modules.EVENT_BUS,
        options: {
          redisUrl: requireRedisUrl(env),
        },
      }
    default:
      return assertNever(env.eventBusProvider)
  }
}

export function buildWorkflowEngineModule(
  env: MedusaConfigEnv
): MedusaModuleConfig {
  switch (env.workflowEngineProvider) {
    case "inmemory":
      return {
        resolve: "@medusajs/medusa/workflow-engine-inmemory",
      }
    case "redis":
      return {
        resolve: "@medusajs/medusa/workflow-engine-redis",
        options: {
          redis: {
            redisUrl: requireRedisUrl(env),
          },
        },
      }
    default:
      return assertNever(env.workflowEngineProvider)
  }
}

function buildLockingProvider(env: MedusaConfigEnv): ModuleProviderConfig {
  switch (env.lockingProvider) {
    case "postgres":
      return {
        resolve: "@medusajs/medusa/locking-postgres",
        id: "locking-postgres",
        is_default: true,
      }
    case "redis":
      return {
        resolve: "@medusajs/medusa/locking-redis",
        id: "locking-redis",
        is_default: true,
        options: {
          redisUrl: requireRedisUrl(env),
        },
      }
    default:
      return assertNever(env.lockingProvider)
  }
}

export function buildLockingModule(env: MedusaConfigEnv): MedusaModuleConfig {
  return {
    resolve: "@medusajs/medusa/locking",
    options: {
      providers: [buildLockingProvider(env)],
    },
  }
}

function buildFileProvider(env: MedusaConfigEnv): ModuleProviderConfig {
  switch (env.fileProvider) {
    case "local":
      return {
        resolve: "./src/modules/local-providers/file-local",
        id: "local",
        options: {
          backend_url: "http://localhost:9000/static",
          private_upload_dir: env.fileLocalUploadDir,
          upload_dir: env.fileLocalUploadDir,
        },
      }
    case "s3":
      return {
        resolve: "@medusajs/medusa/file-s3",
        id: "s3",
        options: {
          file_url: env.minioFileUrl,
          endpoint: env.minioEndpoint,
          bucket: env.minioBucket,
          access_key_id: env.minioAccessKey,
          secret_access_key: env.minioSecretKey,
          region: env.minioRegion,
          additional_client_config: {
            forcePathStyle: true,
          },
        },
      }
    default:
      return assertNever(env.fileProvider)
  }
}

export function buildFileModule(env: MedusaConfigEnv): MedusaModuleConfig {
  return {
    resolve: "@medusajs/medusa/file",
    options: {
      providers: [buildFileProvider(env)],
    },
  }
}
