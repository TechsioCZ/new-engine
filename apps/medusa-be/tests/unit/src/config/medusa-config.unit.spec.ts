import { describe, expect, it } from "vitest"
import {
  readMedusaConfigEnv,
  requireRedisUrl,
} from "../../../../src/config/env"
import { buildModules } from "../../../../src/config/modules"
import { buildPlugins } from "../../../../src/config/plugins"
import { buildProjectConfig } from "../../../../src/config/project"
import {
  buildCachingModule,
  buildFileModule,
  buildNotificationProvider,
  buildNotificationProviders,
} from "../../../../src/config/providers"

const baseEnv = {
  REDIS_SESSIONS_ENABLED: "0",
  MEILISEARCH_ENABLED: "0",
  NOTIFICATION_PROVIDER: "local",
  CACHE_PROVIDER: "inmemory",
  EVENT_BUS_PROVIDER: "local",
  WORKFLOW_ENGINE_PROVIDER: "inmemory",
  LOCKING_PROVIDER: "postgres",
  FILE_PROVIDER: "local",
  FILE_LOCAL_UPLOAD_DIR: "/tmp/medusa-uploads",
} satisfies NodeJS.ProcessEnv

describe("readMedusaConfigEnv", () => {
  it("parses local provider defaults without requiring Redis", () => {
    const env = readMedusaConfigEnv(baseEnv)

    expect(env.redisUrl).toBeUndefined()
    expect(buildNotificationProvider(env)).toEqual({
      resolve: "@medusajs/medusa/notification-local",
      id: "local",
      options: {
        name: "Local Notification Provider",
        channels: ["email", "feed"],
      },
    })
    expect(buildNotificationProviders(env)).toEqual([
      {
        resolve: "@medusajs/medusa/notification-local",
        id: "local",
        options: {
          name: "Local Notification Provider",
          channels: ["email", "feed"],
        },
      },
    ])
    expect(buildCachingModule(env)).toEqual({
      resolve: "@medusajs/medusa/caching",
      options: {
        in_memory: {
          enable: true,
        },
      },
    })
    expect(buildFileModule(env)).toEqual({
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "./src/modules/local-providers/file-local",
            id: "local",
            options: {
              backend_url: "http://localhost:9000/static",
              private_upload_dir: "/tmp/medusa-uploads",
              upload_dir: "/tmp/medusa-uploads",
            },
          },
        ],
      },
    })
  })

  it("fails fast for unknown provider values", () => {
    expect(() =>
      readMedusaConfigEnv({
        ...baseEnv,
        FILE_PROVIDER: "minio",
      })
    ).toThrow("FILE_PROVIDER must be one of: local, s3. Received: minio")
  })

  it("requires Redis URL for Redis-backed providers", () => {
    expect(() =>
      readMedusaConfigEnv({
        ...baseEnv,
        CACHE_PROVIDER: "redis",
      })
    ).toThrow("REDIS_URL is required")
  })

  it("passes Redis URL to Redis-backed providers", () => {
    const env = readMedusaConfigEnv({
      ...baseEnv,
      CACHE_PROVIDER: "redis",
      REDIS_URL: "redis://localhost:6379",
    })

    expect(requireRedisUrl(env)).toBe("redis://localhost:6379")
    expect(buildCachingModule(env)).toEqual({
      resolve: "@medusajs/medusa/caching",
      options: {
        providers: [
          {
            resolve: "@medusajs/caching-redis",
            id: "caching-redis",
            is_default: true,
            options: {
              redisUrl: "redis://localhost:6379",
            },
          },
        ],
      },
    })
  })

  it("keeps feed notifications local when Resend handles email", () => {
    const env = readMedusaConfigEnv({
      ...baseEnv,
      NOTIFICATION_PROVIDER: "resend",
      RESEND_API_KEY: "re_test",
      RESEND_FROM_EMAIL: "store@example.com",
    })

    expect(buildNotificationProviders(env)).toEqual([
      {
        resolve: "./src/modules/resend",
        id: "resend",
        options: {
          channels: ["email"],
          api_key: "re_test",
          from: "store@example.com",
        },
      },
      {
        resolve: "@medusajs/medusa/notification-local",
        id: "local-feed",
        options: {
          name: "Local Feed Notification Provider",
          channels: ["feed"],
        },
      },
    ])
  })

  it("keeps project CORS values separate", () => {
    const env = readMedusaConfigEnv({
      ...baseEnv,
      ADMIN_CORS: "https://admin.example",
      AUTH_CORS: "https://auth.example",
      STORE_CORS: "https://store.example",
    })

    expect(buildProjectConfig(env).http).toEqual({
      storeCors: "https://store.example",
      adminCors: "https://admin.example",
      authCors: "https://auth.example",
      jwtSecret: undefined,
      cookieSecret: undefined,
    })
  })

  it("includes master-added dashboard plugin and product list module", () => {
    const env = readMedusaConfigEnv(baseEnv)

    expect(buildPlugins(env)).toEqual(
      expect.arrayContaining([
        {
          resolve: "medusa-order-dashboard-plugin",
          options: {},
        },
      ])
    )
    expect(buildModules(env)).toEqual(
      expect.arrayContaining([
        {
          resolve: "./src/modules/product-list",
        },
      ])
    )
  })
})
