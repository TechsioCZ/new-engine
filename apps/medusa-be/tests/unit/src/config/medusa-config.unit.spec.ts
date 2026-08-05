import { afterEach, describe, expect, it } from "vitest"

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
  CACHE_PROVIDER: "inmemory",
  EVENT_BUS_PROVIDER: "local",
  FILE_LOCAL_UPLOAD_DIR: "/tmp/medusa-uploads",
  FILE_PROVIDER: "local",
  LOCKING_PROVIDER: "postgres",
  MEILISEARCH_ENABLED: "0",
  NOTIFICATION_PROVIDER: "local",
  REDIS_SESSIONS_ENABLED: "0",
  WORKFLOW_ENGINE_PROVIDER: "inmemory",
} satisfies NodeJS.ProcessEnv

const originalMikroOrmSchema = process.env["MIKRO_ORM_SCHEMA"]
const originalMikroOrmMigrationsTableName =
  process.env["MIKRO_ORM_MIGRATIONS_TABLE_NAME"]

afterEach(() => {
  if (originalMikroOrmSchema === undefined) {
    Reflect.deleteProperty(process.env, "MIKRO_ORM_SCHEMA")
  } else {
    process.env["MIKRO_ORM_SCHEMA"] = originalMikroOrmSchema
  }

  if (originalMikroOrmMigrationsTableName === undefined) {
    Reflect.deleteProperty(process.env, "MIKRO_ORM_MIGRATIONS_TABLE_NAME")
  } else {
    process.env["MIKRO_ORM_MIGRATIONS_TABLE_NAME"] =
      originalMikroOrmMigrationsTableName
  }
})

describe(readMedusaConfigEnv, () => {
  it("parses local provider defaults without requiring Redis", () => {
    const env = readMedusaConfigEnv(baseEnv)

    expect(env.redisUrl).toBeUndefined()
    expect(buildNotificationProvider(env)).toStrictEqual({
      id: "local",
      options: {
        channels: ["email", "feed"],
        name: "Local Notification Provider",
      },
      resolve: "@medusajs/medusa/notification-local",
    })
    expect(buildNotificationProviders(env)).toStrictEqual([
      {
        id: "local",
        options: {
          channels: ["email", "feed"],
          name: "Local Notification Provider",
        },
        resolve: "@medusajs/medusa/notification-local",
      },
    ])
    expect(buildCachingModule(env)).toStrictEqual({
      options: {
        in_memory: {
          enable: true,
        },
      },
      resolve: "@medusajs/medusa/caching",
    })
    expect(buildFileModule(env)).toStrictEqual({
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
      resolve: "@medusajs/medusa/file",
    })
  })

  it("fails fast for unknown provider values", () => {
    expect(() =>
      readMedusaConfigEnv({
        ...baseEnv,
        FILE_PROVIDER: "minio",
      }),
    ).toThrow("FILE_PROVIDER must be one of: local, s3. Received: minio")
  })

  it("requires Redis URL for Redis-backed providers", () => {
    expect(() =>
      readMedusaConfigEnv({
        ...baseEnv,
        CACHE_PROVIDER: "redis",
      }),
    ).toThrow("REDIS_URL is required")
  })

  it("passes Redis URL to Redis-backed providers", () => {
    const env = readMedusaConfigEnv({
      ...baseEnv,
      CACHE_PROVIDER: "redis",
      REDIS_URL: "redis://localhost:6379",
    })

    expect(requireRedisUrl(env)).toBe("redis://localhost:6379")
    expect(buildCachingModule(env)).toStrictEqual({
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
      resolve: "@medusajs/medusa/caching",
    })
  })

  it("configures schema-agnostic migration generation from injected argv", () => {
    const env: NodeJS.ProcessEnv = {
      ...baseEnv,
      MEDUSA_DATABASE_SCHEMA: "medusa",
    }

    const config = readMedusaConfigEnv(env, [
      "node",
      "medusa",
      "db:generate",
      "brand",
    ])

    expect(config.databaseSchema).toBe("medusa")
    expect(env["MIKRO_ORM_SCHEMA"]).toBe("public")
    expect(env["MIKRO_ORM_MIGRATIONS_TABLE_NAME"]).toBe(
      "medusa.mikro_orm_migrations",
    )
  })

  it("does not use global argv when argv is injected", () => {
    const env: NodeJS.ProcessEnv = {
      ...baseEnv,
      MEDUSA_DATABASE_SCHEMA: "medusa",
    }

    readMedusaConfigEnv(env, ["node", "vitest"])

    expect(env["MIKRO_ORM_SCHEMA"]).toBeUndefined()
    expect(env["MIKRO_ORM_MIGRATIONS_TABLE_NAME"]).toBeUndefined()
  })

  it("does not pollute process.env when a custom env is injected", () => {
    Reflect.deleteProperty(process.env, "MIKRO_ORM_SCHEMA")
    Reflect.deleteProperty(process.env, "MIKRO_ORM_MIGRATIONS_TABLE_NAME")

    const env: NodeJS.ProcessEnv = {
      ...baseEnv,
      MEDUSA_DATABASE_SCHEMA: "medusa",
      MEDUSA_SCHEMA_AGNOSTIC_MIGRATION_GENERATION: "1",
    }

    readMedusaConfigEnv(env, ["node", "vitest"])

    expect(env["MIKRO_ORM_SCHEMA"]).toBe("public")
    expect(env["MIKRO_ORM_MIGRATIONS_TABLE_NAME"]).toBe(
      "medusa.mikro_orm_migrations",
    )
    expect(process.env["MIKRO_ORM_SCHEMA"]).toBeUndefined()
    expect(process.env["MIKRO_ORM_MIGRATIONS_TABLE_NAME"]).toBeUndefined()
  })

  it("keeps feed notifications local when Resend handles email", () => {
    const env = readMedusaConfigEnv({
      ...baseEnv,
      NOTIFICATION_PROVIDER: "resend",
      RESEND_API_KEY: "re_test",
      RESEND_FROM_EMAIL: "store@example.com",
    })

    expect(buildNotificationProviders(env)).toStrictEqual([
      {
        id: "resend",
        options: {
          api_key: "re_test",
          channels: ["email"],
          from: "store@example.com",
        },
        resolve: "./src/modules/resend",
      },
      {
        id: "local-feed",
        options: {
          channels: ["feed"],
          name: "Local Feed Notification Provider",
        },
        resolve: "@medusajs/medusa/notification-local",
      },
    ])
  })

  it("does not register Meilisearch when search is disabled", () => {
    const env = readMedusaConfigEnv({
      ...baseEnv,
      MEILISEARCH_ENABLED: "0",
    })

    expect(env.meilisearchHost).toBeUndefined()
    expect(buildPlugins(env)).not.toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resolve: "@rokmohar/medusa-plugin-meilisearch",
        }),
      ]),
    )
  })

  it("keeps project CORS values separate", () => {
    const env = readMedusaConfigEnv({
      ...baseEnv,
      ADMIN_CORS: "https://admin.example",
      AUTH_CORS: "https://auth.example",
      STORE_CORS: "https://store.example",
    })

    expect(buildProjectConfig(env).http).toStrictEqual({
      adminCors: "https://admin.example",
      authCors: "https://auth.example",
      cookieSecret: undefined,
      jwtSecret: undefined,
      storeCors: "https://store.example",
    })
  })

  it("includes master-added dashboard plugin and product list module", () => {
    const env = readMedusaConfigEnv(baseEnv)

    expect(buildPlugins(env)).toStrictEqual(
      expect.arrayContaining([
        {
          options: {},
          resolve: "medusa-order-dashboard-plugin",
        },
      ]),
    )
    expect(buildModules(env)).toStrictEqual(
      expect.arrayContaining([
        {
          resolve: "./src/modules/product-list",
        },
      ]),
    )
  })
})
