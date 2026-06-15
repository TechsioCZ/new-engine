type MedusaCookieSameSite = "lax" | "none" | "strict"

const FEATURE_FLAG_ENABLED_VALUE = "1"

export type MedusaConfigEnv = {
  adminAllowedHosts: true | string[] | undefined
  adminCors: string
  authCors: string
  cacheProvider: "inmemory" | "redis"
  cookieOptions: {
    sameSite?: MedusaCookieSameSite
    secure?: boolean
  }
  cookieSecret: string | undefined
  databaseSchema: string
  databaseUrl: string | undefined
  eventBusProvider: "local" | "redis"
  featurePacketaEnabled: boolean
  featurePayloadEnabled: boolean
  featurePaymentQrEnabled: boolean
  featurePplEnabled: boolean
  fileLocalUploadDir: string | undefined
  fileProvider: "local" | "s3"
  jwtSecret: string | undefined
  lockingProvider: "postgres" | "redis"
  medusaAdminDisabledForBackendBuild: boolean
  meilisearchApiKey: string | undefined
  meilisearchEnabled: boolean
  meilisearchHost: string | undefined
  minioAccessKey: string | undefined
  minioBucket: string | undefined
  minioEndpoint: string | undefined
  minioFileUrl: string | undefined
  minioRegion: string | undefined
  minioSecretKey: string | undefined
  notificationProvider: "local" | "resend"
  packetaEnvironment: string
  payloadApiKey: string | undefined
  payloadBaseUrl: string | undefined
  payloadContentCacheTtl: number
  payloadListCacheTtl: number
  pplEnvironment: string
  redisSessionsEnabled: boolean
  redisUrl: string | undefined
  resendApiKey: string | undefined
  resendFromEmail: string | undefined
  storeCors: string
  workflowEngineProvider: "inmemory" | "redis"
}

function isDbGenerateCommand(env: NodeJS.ProcessEnv): boolean {
  if (env.MEDUSA_SCHEMA_AGNOSTIC_MIGRATION_GENERATION === "1") {
    return true
  }

  return process.argv.some((arg) => arg === "db:generate")
}

function configureSchemaAgnosticMigrationGeneration(
  env: NodeJS.ProcessEnv,
  databaseSchema: string
): void {
  if (!isDbGenerateCommand(env)) {
    return
  }

  // MikroORM v6 emits schema-agnostic migration SQL when the ORM schema is
  // public, but the migration bookkeeping table must still live in the app
  // schema because this project does not grant writes to public.
  // TODO: When Medusa upgrades to MikroORM >=7.1.0 and exposes/passes the
  // native migrator config, replace this env override with runtime schema
  // context: generate with unqualified DDL, then apply via migrations.schema
  // (and includeWildcardSchema only if entities use schema: "*").
  // Docs: https://mikro-orm.io/docs/migrations#runtime-schema-context
  // Added in: https://mikro-orm.io/changelog (v7.1.0, #7597).
  process.env.MIKRO_ORM_SCHEMA ??= env.MIKRO_ORM_SCHEMA ?? "public"
  process.env.MIKRO_ORM_MIGRATIONS_TABLE_NAME ??=
    env.MIKRO_ORM_MIGRATIONS_TABLE_NAME ??
    `${databaseSchema}.mikro_orm_migrations`
}

export function readRequiredEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim()

  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
}

function readEnumEnv<const AllowedValues extends readonly string[]>(
  env: NodeJS.ProcessEnv,
  name: string,
  allowedValues: AllowedValues
): AllowedValues[number] {
  const value = env[name]?.trim()

  if (!(value && (allowedValues as readonly string[]).includes(value))) {
    throw new Error(
      `${name} must be one of: ${allowedValues.join(", ")}${
        value ? `. Received: ${value}` : ""
      }`
    )
  }

  return value as AllowedValues[number]
}

function readBooleanFlagEnv(env: NodeJS.ProcessEnv, name: string): boolean {
  return readEnumEnv(env, name, ["0", "1"] as const) === "1"
}

function readCookieOptions(
  env: NodeJS.ProcessEnv
): MedusaConfigEnv["cookieOptions"] {
  const secure = env.MEDUSA_COOKIE_SECURE
  const sameSite = env.MEDUSA_COOKIE_SAME_SITE
  const parsedSameSite: MedusaCookieSameSite | undefined =
    sameSite === "lax" || sameSite === "none" || sameSite === "strict"
      ? sameSite
      : undefined

  return {
    ...(secure !== undefined
      ? {
          secure: secure === "1" || secure.toLowerCase() === "true",
        }
      : {}),
    ...(parsedSameSite
      ? {
          sameSite: parsedSameSite,
        }
      : {}),
  }
}

function readAdminAllowedHosts(
  env: NodeJS.ProcessEnv
): MedusaConfigEnv["adminAllowedHosts"] {
  const backendUrl = env.MEDUSA_BACKEND_URL?.trim()

  if (env.NODE_ENV === "development") {
    return true
  }

  if (!backendUrl) {
    return
  }

  const normalizedBackendUrl = backendUrl.includes("://")
    ? backendUrl
    : `http://${backendUrl}`

  return [new URL(normalizedBackendUrl).hostname]
}

export function requireRedisUrl(env: MedusaConfigEnv): string {
  if (!env.redisUrl) {
    throw new Error(
      "REDIS_URL is required when a Redis-backed provider is enabled"
    )
  }

  return env.redisUrl
}

export function readMedusaConfigEnv(
  env: NodeJS.ProcessEnv = process.env
): MedusaConfigEnv {
  const databaseSchema =
    env.MEDUSA_DATABASE_SCHEMA ?? env.DATABASE_SCHEMA ?? "public"

  configureSchemaAgnosticMigrationGeneration(env, databaseSchema)

  const redisSessionsEnabled = readBooleanFlagEnv(env, "REDIS_SESSIONS_ENABLED")
  const meilisearchEnabled = readBooleanFlagEnv(env, "MEILISEARCH_ENABLED")
  const cacheProvider = readEnumEnv(env, "CACHE_PROVIDER", [
    "inmemory",
    "redis",
  ] as const)
  const eventBusProvider = readEnumEnv(env, "EVENT_BUS_PROVIDER", [
    "local",
    "redis",
  ] as const)
  const workflowEngineProvider = readEnumEnv(env, "WORKFLOW_ENGINE_PROVIDER", [
    "inmemory",
    "redis",
  ] as const)
  const lockingProvider = readEnumEnv(env, "LOCKING_PROVIDER", [
    "postgres",
    "redis",
  ] as const)
  const fileProvider = readEnumEnv(env, "FILE_PROVIDER", [
    "local",
    "s3",
  ] as const)

  const redisUrl =
    redisSessionsEnabled ||
    cacheProvider === "redis" ||
    eventBusProvider === "redis" ||
    workflowEngineProvider === "redis" ||
    lockingProvider === "redis"
      ? readRequiredEnv(env, "REDIS_URL")
      : undefined

  return {
    adminAllowedHosts: readAdminAllowedHosts(env),
    adminCors: env.ADMIN_CORS ?? "",
    authCors: env.AUTH_CORS ?? "",
    cacheProvider,
    cookieOptions: readCookieOptions(env),
    cookieSecret: env.COOKIE_SECRET,
    databaseSchema,
    databaseUrl: env.DATABASE_URL,
    eventBusProvider,
    featurePacketaEnabled:
      env.FEATURE_PACKETA_ENABLED === FEATURE_FLAG_ENABLED_VALUE,
    featurePayloadEnabled:
      env.FEATURE_PAYLOAD_ENABLED === FEATURE_FLAG_ENABLED_VALUE,
    featurePaymentQrEnabled:
      env.FEATURE_PAYMENT_QR_ENABLED === FEATURE_FLAG_ENABLED_VALUE,
    featurePplEnabled: env.FEATURE_PPL_ENABLED === FEATURE_FLAG_ENABLED_VALUE,
    fileLocalUploadDir:
      fileProvider === "local"
        ? readRequiredEnv(env, "FILE_LOCAL_UPLOAD_DIR")
        : undefined,
    fileProvider,
    jwtSecret: env.JWT_SECRET,
    lockingProvider,
    medusaAdminDisabledForBackendBuild:
      env.MEDUSA_ADMIN_DISABLED_FOR_BACKEND_BUILD === "1",
    meilisearchApiKey: env.MEILISEARCH_API_KEY,
    meilisearchEnabled,
    meilisearchHost: meilisearchEnabled
      ? readRequiredEnv(env, "MEILISEARCH_HOST")
      : undefined,
    minioAccessKey: env.MINIO_ACCESS_KEY,
    minioBucket: env.MINIO_BUCKET,
    minioEndpoint: env.MINIO_ENDPOINT,
    minioFileUrl: env.MINIO_FILE_URL,
    minioRegion: env.MINIO_REGION,
    minioSecretKey: env.MINIO_SECRET_KEY,
    notificationProvider: readEnumEnv(env, "NOTIFICATION_PROVIDER", [
      "local",
      "resend",
    ] as const),
    packetaEnvironment: env.PACKETA_ENVIRONMENT ?? "testing",
    payloadApiKey: env.PAYLOAD_API_KEY,
    payloadBaseUrl: env.PAYLOAD_BASE_URL,
    payloadContentCacheTtl: Number.parseInt(env.CMS_CACHE_TTL ?? "3600", 10),
    payloadListCacheTtl: Number.parseInt(env.CMS_LIST_CACHE_TTL ?? "600", 10),
    pplEnvironment: env.PPL_ENVIRONMENT || "testing",
    redisSessionsEnabled,
    redisUrl,
    resendApiKey: env.RESEND_API_KEY,
    resendFromEmail: env.RESEND_FROM_EMAIL,
    storeCors: env.STORE_CORS ?? "",
    workflowEngineProvider,
  }
}
