import type { BootstrapInspectServiceDetails } from "../../contracts/bootstrap-shared.js"
import type { BootstrapZaneProjectPlanCommandInput } from "../../contracts/bootstrap-zane-project.js"
import {
  bootstrapZaneProjectInspectResponseSchema,
  bootstrapZaneProjectPlanResponseSchema,
} from "../../contracts/bootstrap-zane-project.js"
import type { PreviewSharedEnvVariableInput } from "../../contracts/preview-shared-env.js"
import { listDeployableServices } from "../../contracts/stack-manifest.js"
import { loadManifest } from "../deploy-inputs.js"
import type { BootstrapValueSource } from "./shared.js"
import {
  deriveBranchName,
  deriveRepositoryUrl,
  firstNonEmpty,
  isLoopbackUrl,
  literalSource,
  normalizeOriginUrl,
  preferPublicCsvOrUrl,
  readJsonFile,
  serviceGlobalNetworkAliasSource,
  serviceInternalBucketUrlSource,
  serviceInternalOriginSource,
  serviceNetworkAliasSource,
  servicePublicOriginSource,
} from "./shared.js"

type PlannedSharedEnvVariable = {
  key: string
  source: BootstrapValueSource
}

type PlannedServiceEnvVariable = {
  envVar: string
  source: BootstrapValueSource
}

type PlannedBootstrapService = {
  dockerfilePath: string
  buildContextDir: string
  command: string | null
  volumes: Array<{
    name: string
    container_path: string
    host_path: string | null
    mode: string
  }>
  urls: Array<{
    domain: string
    base_path: string
    strip_prefix: boolean
    associated_port: number | null
  }>
  healthcheck: {
    type: string
    value: string
    timeout_seconds: number
    interval_seconds: number
    associated_port?: number
  } | null
  resourceLimits: {
    cpus: number | null
    memory: {
      unit: "MEGABYTES"
      value: number
    } | null
  }
  env: PlannedServiceEnvVariable[]
  cleanupEnvKeys: string[]
}

type ZaneProjectContext = {
  projectSlug: string
  projectDescription: string
  environmentName: string
  repositoryUrl: string
  branchName: string
  gitAppId: string | null
  publicDomain: string | null
  publicUrlAffix: string
  minioFileUrlOverride: string | null
  storeCors: string
  adminCors: string
  authCors: string
  operatorUpstreamBaseUrl: string | null
  operatorUpstreamConnectBaseUrl: string | null
  operatorUpstreamConnectHostHeader: string | null
  operatorUpstreamUsername: string
  operatorUpstreamPassword: string
}

type InspectedServiceState = {
  exists: boolean
  details: BootstrapInspectServiceDetails | null
}

function requiredServiceSlug(
  serviceSlugs: Record<string, string>,
  serviceId: string
): string {
  const serviceSlug = serviceSlugs[serviceId]
  if (!serviceSlug) {
    throw new Error(
      `Missing manifest service slug for bootstrap service ${serviceId}.`
    )
  }

  return serviceSlug
}

const sharedEnvCleanupKeys = [
  "LEGACY_DATABASE_URL",
  "SENTRY_NAME",
  "SENTRY_DSN",
  "NEXT_PUBLIC_META_PIXEL_ID",
  "NEXT_PUBLIC_GOOGLE_ADS_ID",
  "NEXT_PUBLIC_HEUREKA_API_KEY",
  "NEXT_PUBLIC_LEADHUB_TRACKING_ID",
  "RESEND_API_KEY",
  "CONTACT_EMAIL",
  "RESEND_FROM_EMAIL",
  "NODE_ENV",
  "MEDUSA_BACKEND_URL",
  "STORE_CORS",
  "ADMIN_CORS",
  "AUTH_CORS",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_MEDUSA_BACKEND_URL",
  "NEXT_PUBLIC_MEILISEARCH_URL",
  "NEXT_PUBLIC_MEILISEARCH_API_KEY",
  "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
  "MINIO_FILE_URL",
  "VALKEY_HOST",
  "MINIO_HOST",
  "MEILI_HOST",
  "POSTGRES_SUPERUSER",
  "POSTGRES_SUPERUSER_PASSWORD",
  "VALKEY_PASSWORD",
  "MINIO_ROOT_USER",
  "MINIO_ROOT_PASSWORD",
  "MINIO_ACCESS_KEY",
  "MINIO_SECRET_KEY",
  "MINIO_BUCKET",
  "MINIO_REGION",
  "MINIO_ENDPOINT",
  "MEILI_MASTER_KEY",
  "JWT_SECRET",
  "COOKIE_SECRET",
  "SETTINGS_ENCRYPTION_KEY",
  "SUPERADMIN_EMAIL",
  "SUPERADMIN_PASSWORD",
  "INITIAL_PUBLISHABLE_KEY_NAME",
  "FEATURE_PPL_ENABLED",
  "PPL_ENVIRONMENT",
  "MEDUSA_BE_NODE_ENV",
  "MEDUSA_BE_BACKEND_URL",
  "MEDUSA_BE_STORE_CORS",
  "MEDUSA_BE_ADMIN_CORS",
  "MEDUSA_BE_AUTH_CORS",
  "N1_NEXT_PUBLIC_SITE_URL",
  "N1_NEXT_PUBLIC_MEDUSA_BACKEND_URL",
  "N1_NEXT_PUBLIC_MEILISEARCH_URL",
  "N1_NEXT_PUBLIC_MEILISEARCH_API_KEY",
  "N1_NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
  "MEDUSA_BE_HOST",
  "MEDUSA_DB_POSTGRES_SUPERUSER",
  "MEDUSA_DB_POSTGRES_SUPERUSER_PASSWORD",
  "MEDUSA_DEV_DB_USER",
  "MEDUSA_DEV_DB_PASSWORD",
  "MEDUSA_MINIO_ROOT_USER",
  "MEDUSA_MINIO_ROOT_PASSWORD",
  "MEDUSA_MINIO_REGION",
  "MEDUSA_MINIO_ENDPOINT",
  "MEDUSA_MINIO_FILE_URL",
  "MEDUSA_MINIO_HOST",
  "MEDUSA_BE_JWT_SECRET",
  "MEDUSA_BE_COOKIE_SECRET",
  "MEDUSA_BE_SETTINGS_ENCRYPTION_KEY",
  "MEDUSA_BE_SUPERADMIN_EMAIL",
  "MEDUSA_BE_SUPERADMIN_PASSWORD",
  "MEDUSA_BE_INITIAL_PUBLISHABLE_KEY_NAME",
  "MEDUSA_BE_FEATURE_PPL_ENABLED",
  "MEDUSA_BE_PPL_ENVIRONMENT",
  "ZANE_OPERATOR_API_AUTH_TOKEN",
  "ZANE_OPERATOR_DB_PREVIEW_APP_PASSWORD_SECRET",
  "ZANE_OPERATOR_DB_TEMPLATE_NAME",
  "ZANE_OPERATOR_DB_PREVIEW_PREFIX",
  "ZANE_OPERATOR_DB_PREVIEW_APP_USER_PREFIX",
  "ZANE_OPERATOR_DB_PROTECTED_NAMES",
  "ZANE_OPERATOR_UPSTREAM_BASE_URL",
  "ZANE_OPERATOR_UPSTREAM_USERNAME",
  "ZANE_OPERATOR_UPSTREAM_PASSWORD",
  "DC_MEDUSA_APP_DB_USER",
  "DC_MEDUSA_APP_DB_PASSWORD",
  "DC_MEDUSA_APP_DB_NAME",
  "DC_MEDUSA_APP_DB_SCHEMA",
  "DC_VALKEY_PASSWORD",
  "DC_MINIO_ACCESS_KEY",
  "DC_MINIO_SECRET_KEY",
  "DC_MINIO_BUCKET",
  "DC_MEILISEARCH_MASTER_KEY",
  "DC_MEDUSA_APP_DB_HOST",
  "DC_MEDUSA_APP_DB_PORT",
  "DC_POSTGRES_SSLMODE",
  "DC_MINIO_REGION",
  "DC_MINIO_ENDPOINT",
  "DC_MINIO_FILE_URL",
  "DC_MEILISEARCH_HOST",
  "DC_STORE_CORS",
  "DC_ADMIN_CORS",
  "DC_AUTH_CORS",
  "DC_MEDUSA_BACKEND_URL",
  "DC_NODE_ENV",
  "DC_SENTRY_NAME",
  "DC_SENTRY_DSN",
  "DC_SETTINGS_ENCRYPTION_KEY",
  "DC_FEATURE_PPL_ENABLED",
  "DC_PPL_ENVIRONMENT",
  "DC_SUPERADMIN_EMAIL",
  "DC_SUPERADMIN_PASSWORD",
  "DC_INITIAL_PUBLISHABLE_KEY_NAME",
  "DC_N1_NEXT_PUBLIC_SITE_URL",
  "DC_N1_NEXT_PUBLIC_MEDUSA_BACKEND_URL",
  "DC_N1_NEXT_PUBLIC_MEILISEARCH_URL",
  "DC_N1_NEXT_PUBLIC_MEILISEARCH_API_KEY",
  "DC_N1_NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
  "DC_N1_NEXT_PUBLIC_META_PIXEL_ID",
  "DC_N1_NEXT_PUBLIC_GOOGLE_ADS_ID",
  "DC_N1_NEXT_PUBLIC_HEUREKA_API_KEY",
  "DC_N1_NEXT_PUBLIC_LEADHUB_TRACKING_ID",
  "DC_N1_MEDUSA_RESEND_API_KEY",
  "DC_N1_MEDUSA_CONTACT_EMAIL",
  "DC_N1_MEDUSA_RESEND_FROM_EMAIL",
  "DC_ZANE_OPERATOR_API_AUTH_TOKEN",
  "DC_ZANE_OPERATOR_DB_PREVIEW_APP_PASSWORD_SECRET",
  "DC_ZANE_OPERATOR_DB_TEMPLATE_NAME",
  "DC_ZANE_OPERATOR_DB_PREVIEW_PREFIX",
  "DC_ZANE_OPERATOR_DB_PREVIEW_APP_USER_PREFIX",
  "DC_ZANE_OPERATOR_DB_PROTECTED_NAMES",
  "DC_ZANE_OPERATOR_ZANE_BASE_URL",
  "DC_ZANE_OPERATOR_ZANE_CONNECT_BASE_URL",
  "DC_ZANE_OPERATOR_ZANE_CONNECT_HOST_HEADER",
  "DC_ZANE_OPERATOR_ZANE_USERNAME",
  "DC_ZANE_OPERATOR_ZANE_PASSWORD",
  "DC_ZANE_OPERATOR_PGUSER",
  "DC_ZANE_OPERATOR_PGPASSWORD",
  "DC_ZANE_OPERATOR_PGDATABASE",
  "DC_POSTGRES_SUPERUSER",
  "DC_POSTGRES_SUPERUSER_PASSWORD",
  "DC_MINIO_ROOT_USER",
  "DC_MINIO_ROOT_PASSWORD",
  "DC_JWT_SECRET",
  "DC_COOKIE_SECRET",
  "DC_MEDUSA_DEV_DB_USER",
  "DC_MEDUSA_DEV_DB_PASSWORD",
  "DC_REDIS_URL",
  "DC_MEILISEARCH_BACKEND_API_KEY",
  "DC_N1_MEDUSA_BACKEND_URL_INTERNAL",
  "DC_N1_NEXT_PUBLIC_MEDUSA_BACKEND_URL",
  "DC_N1_NEXT_PUBLIC_MEILISEARCH_URL",
  "DC_N1_NEXT_PUBLIC_MEILISEARCH_API_KEY",
  "DC_N1_NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
  "DC_N1_NEXT_PUBLIC_SITE_URL",
  "DC_N1_MEDUSA_RESEND_API_KEY",
  "DC_N1_MEDUSA_CONTACT_EMAIL",
  "DC_N1_MEDUSA_RESEND_FROM_EMAIL",
  "DC_LEGACY_DATABASE_URL",
] as const

function placeholderSharedValue(key: string): string {
  return `{{env.${key}}}`
}

function publicServiceDomain(input: {
  projectSlug: string
  serviceSlug: string
  publicUrlAffix: string
  publicDomain: string | null
}): string | null {
  if (!input.publicDomain) {
    return null
  }

  return `${input.projectSlug}-${input.serviceSlug}${input.publicUrlAffix}.${input.publicDomain}`
}

function summarizeSource(input: {
  key?: string
  envVar?: string
  source: PreviewSharedEnvVariableInput["source"]
}) {
  return {
    ...(input.key ? { key: input.key } : {}),
    ...(input.envVar ? { env_var: input.envVar } : {}),
    source_kind: input.source.kind,
    source_service_slug:
      input.source.kind === "literal"
        ? null
        : (input.source.service_slug ?? null),
  }
}

function buildSharedEnvVariables(
  serviceSlugs: Record<string, string>
): PlannedSharedEnvVariable[] {
  const medusaDbSlug = requiredServiceSlug(serviceSlugs, "medusa-db")
  const valkeySlug = requiredServiceSlug(serviceSlugs, "medusa-valkey")
  const meilisearchSlug = requiredServiceSlug(
    serviceSlugs,
    "medusa-meilisearch"
  )

  return [
    {
      key: "MEDUSA_DB_HOST",
      source: serviceGlobalNetworkAliasSource(medusaDbSlug),
    },
    {
      key: "MEDUSA_VALKEY_HOST",
      source: serviceNetworkAliasSource(valkeySlug),
    },
    {
      key: "MEDUSA_MEILISEARCH_HOST",
      source: serviceNetworkAliasSource(meilisearchSlug),
    },
    {
      key: "MEDUSA_APP_DB_USER",
      source: literalSource(process.env.DC_MEDUSA_APP_DB_USER ?? "medusa_app"),
    },
    {
      key: "MEDUSA_APP_DB_PASSWORD",
      source: literalSource(process.env.DC_MEDUSA_APP_DB_PASSWORD ?? ""),
    },
    {
      key: "MEDUSA_APP_DB_NAME",
      source: literalSource(process.env.DC_MEDUSA_APP_DB_NAME ?? "medusa"),
    },
    {
      key: "MEDUSA_APP_DB_SCHEMA",
      source: literalSource(process.env.DC_MEDUSA_APP_DB_SCHEMA ?? "medusa"),
    },
    {
      key: "MEDUSA_VALKEY_PASSWORD",
      source: literalSource(process.env.DC_VALKEY_PASSWORD ?? ""),
    },
    {
      key: "MEDUSA_MINIO_ACCESS_KEY",
      source: literalSource(process.env.DC_MINIO_ACCESS_KEY ?? ""),
    },
    {
      key: "MEDUSA_MINIO_SECRET_KEY",
      source: literalSource(process.env.DC_MINIO_SECRET_KEY ?? ""),
    },
    {
      key: "MEDUSA_MINIO_BUCKET",
      source: literalSource(process.env.DC_MINIO_BUCKET ?? "medusa-bucket"),
    },
    {
      key: "MEDUSA_MEILISEARCH_MASTER_KEY",
      source: literalSource(process.env.DC_MEILISEARCH_MASTER_KEY ?? ""),
    },
  ]
}

function buildZaneProjectServices(
  context: ZaneProjectContext,
  serviceSlugs: Record<string, string>
): Record<string, PlannedBootstrapService> {
  const protectedNamesBase =
    process.env.DC_ZANE_OPERATOR_DB_PROTECTED_NAMES ??
    "postgres,template0,template1"
  const protectedNames = protectedNamesBase.includes("template_medusa")
    ? protectedNamesBase
    : `${protectedNamesBase},template_medusa`
  const medusaBeSlug = requiredServiceSlug(serviceSlugs, "medusa-be")
  const n1Slug = requiredServiceSlug(serviceSlugs, "n1")
  const meilisearchSlug = requiredServiceSlug(
    serviceSlugs,
    "medusa-meilisearch"
  )
  const minioSlug = requiredServiceSlug(serviceSlugs, "medusa-minio")

  const servicePublicOrigins = {
    medusaBe: servicePublicOriginSource(medusaBeSlug),
    n1: servicePublicOriginSource(n1Slug),
    meilisearch: servicePublicOriginSource(meilisearchSlug),
  }
  const minioFileSource = context.minioFileUrlOverride
    ? literalSource(context.minioFileUrlOverride)
    : serviceInternalBucketUrlSource({
        serviceSlug: minioSlug,
        port: 9004,
        bucketSharedEnvKey: "MEDUSA_MINIO_BUCKET",
      })

  return {
    "medusa-db": {
      dockerfilePath: "./docker/development/postgres/Dockerfile",
      buildContextDir: "./docker/development/postgres",
      command: "sh -lc 'exec /usr/local/bin/run-postgres-with-bootstrap.sh'",
      volumes: [
        {
          name: "pgdata",
          container_path: "/var/lib/postgresql",
          host_path: null,
          mode: "READ_WRITE",
        },
      ],
      urls: [],
      healthcheck: {
        type: "COMMAND",
        value: "sh -lc 'exec /usr/local/bin/postgres-ready-with-bootstrap.sh'",
        timeout_seconds: 60,
        interval_seconds: 30,
      },
      resourceLimits: { cpus: 0.5, memory: { unit: "MEGABYTES", value: 768 } },
      cleanupEnvKeys: [
        "DC_POSTGRES_SUPERUSER",
        "DC_POSTGRES_SUPERUSER_PASSWORD",
        "DC_MEDUSA_APP_DB_USER",
        "DC_MEDUSA_APP_DB_PASSWORD",
        "DC_MEDUSA_APP_DB_NAME",
        "DC_MEDUSA_APP_DB_SCHEMA",
        "DC_MEDUSA_DEV_DB_USER",
        "DC_MEDUSA_DEV_DB_PASSWORD",
        "DC_ZANE_OPERATOR_PGUSER",
        "DC_ZANE_OPERATOR_PGPASSWORD",
        "DC_ZANE_OPERATOR_DB_TEMPLATE_NAME",
      ],
      env: [
        {
          envVar: "POSTGRES_USER",
          source: literalSource(process.env.DC_POSTGRES_SUPERUSER ?? "root"),
        },
        {
          envVar: "POSTGRES_PASSWORD",
          source: literalSource(
            process.env.DC_POSTGRES_SUPERUSER_PASSWORD ?? "root"
          ),
        },
        {
          envVar: "POSTGRES_DB",
          source: literalSource(placeholderSharedValue("MEDUSA_APP_DB_NAME")),
        },
        {
          envVar: "PGDATA",
          source: literalSource("/var/lib/postgresql/18/docker"),
        },
        {
          envVar: "MEDUSA_APP_DB_USER",
          source: literalSource(placeholderSharedValue("MEDUSA_APP_DB_USER")),
        },
        {
          envVar: "MEDUSA_APP_DB_PASSWORD",
          source: literalSource(
            placeholderSharedValue("MEDUSA_APP_DB_PASSWORD")
          ),
        },
        {
          envVar: "MEDUSA_APP_DB_NAME",
          source: literalSource(placeholderSharedValue("MEDUSA_APP_DB_NAME")),
        },
        {
          envVar: "MEDUSA_APP_DB_SCHEMA",
          source: literalSource(placeholderSharedValue("MEDUSA_APP_DB_SCHEMA")),
        },
        {
          envVar: "MEDUSA_DEV_DB_USER",
          source: literalSource(
            process.env.DC_MEDUSA_DEV_DB_USER ?? "medusa_dev"
          ),
        },
        {
          envVar: "MEDUSA_DEV_DB_PASSWORD",
          source: literalSource(process.env.DC_MEDUSA_DEV_DB_PASSWORD ?? ""),
        },
        {
          envVar: "MEDUSA_DB_ZANE_OPERATOR_USER",
          source: literalSource(
            process.env.DC_ZANE_OPERATOR_PGUSER ?? "zane_operator"
          ),
        },
        {
          envVar: "MEDUSA_DB_ZANE_OPERATOR_PASSWORD",
          source: literalSource(process.env.DC_ZANE_OPERATOR_PGPASSWORD ?? ""),
        },
        {
          envVar: "MEDUSA_DB_ZANE_OPERATOR_DB_TEMPLATE_NAME",
          source: literalSource(
            process.env.DC_ZANE_OPERATOR_DB_TEMPLATE_NAME ?? "template_medusa"
          ),
        },
      ],
    },
    "medusa-valkey": {
      dockerfilePath: "./docker/development/medusa-valkey/Dockerfile",
      buildContextDir: "./docker/development/medusa-valkey",
      command:
        "sh -lc 'exec valkey-server --requirepass \"$VALKEY_PASSWORD\" --appendonly yes'",
      volumes: [
        {
          name: "data",
          container_path: "/data",
          host_path: null,
          mode: "READ_WRITE",
        },
      ],
      urls: [],
      healthcheck: {
        type: "COMMAND",
        value:
          "sh -lc 'valkey-cli -a \"$VALKEY_PASSWORD\" --no-auth-warning ping | grep -q PONG'",
        timeout_seconds: 60,
        interval_seconds: 5,
      },
      resourceLimits: { cpus: 0.25, memory: { unit: "MEGABYTES", value: 256 } },
      cleanupEnvKeys: ["DC_VALKEY_PASSWORD"],
      env: [
        {
          envVar: "VALKEY_PASSWORD",
          source: literalSource(
            placeholderSharedValue("MEDUSA_VALKEY_PASSWORD")
          ),
        },
      ],
    },
    "medusa-minio": {
      dockerfilePath: "./docker/development/medusa-minio/Dockerfile",
      buildContextDir: "./docker/development/medusa-minio",
      command: null,
      volumes: [
        {
          name: "data",
          container_path: "/data",
          host_path: null,
          mode: "READ_WRITE",
        },
      ],
      urls: [],
      healthcheck: {
        type: "PATH",
        value: "/minio/health/live",
        timeout_seconds: 60,
        interval_seconds: 10,
        associated_port: 9004,
      },
      resourceLimits: { cpus: 0.25, memory: { unit: "MEGABYTES", value: 512 } },
      cleanupEnvKeys: [
        "DC_MINIO_ROOT_USER",
        "DC_MINIO_ROOT_PASSWORD",
        "DC_MINIO_ACCESS_KEY",
        "DC_MINIO_SECRET_KEY",
        "DC_MINIO_BUCKET",
      ],
      env: [
        {
          envVar: "MINIO_ROOT_USER",
          source: literalSource(process.env.DC_MINIO_ROOT_USER ?? ""),
        },
        {
          envVar: "MINIO_ROOT_PASSWORD",
          source: literalSource(process.env.DC_MINIO_ROOT_PASSWORD ?? ""),
        },
        {
          envVar: "MINIO_MEDUSA_ACCESS_KEY",
          source: literalSource(
            placeholderSharedValue("MEDUSA_MINIO_ACCESS_KEY")
          ),
        },
        {
          envVar: "MINIO_MEDUSA_SECRET_KEY",
          source: literalSource(
            placeholderSharedValue("MEDUSA_MINIO_SECRET_KEY")
          ),
        },
        {
          envVar: "MINIO_MEDUSA_BUCKET",
          source: literalSource(placeholderSharedValue("MEDUSA_MINIO_BUCKET")),
        },
      ],
    },
    "medusa-meilisearch": {
      dockerfilePath: "./docker/development/medusa-meilisearch/Dockerfile",
      buildContextDir: "./docker/development/medusa-meilisearch",
      command: null,
      volumes: [
        {
          name: "data",
          container_path: "/meili_data",
          host_path: null,
          mode: "READ_WRITE",
        },
      ],
      urls: [
        {
          domain:
            publicServiceDomain({
              projectSlug: context.projectSlug,
              serviceSlug: meilisearchSlug,
              publicUrlAffix: context.publicUrlAffix,
              publicDomain: context.publicDomain,
            }) ?? "",
          base_path: "/",
          strip_prefix: true,
          associated_port: 7700,
        },
      ].filter((url) => url.domain),
      healthcheck: {
        type: "PATH",
        value: "/health",
        timeout_seconds: 60,
        interval_seconds: 10,
        associated_port: 7700,
      },
      resourceLimits: { cpus: 0.5, memory: { unit: "MEGABYTES", value: 1024 } },
      cleanupEnvKeys: ["DC_MEILISEARCH_MASTER_KEY"],
      env: [
        {
          envVar: "MEILI_MASTER_KEY",
          source: literalSource(
            placeholderSharedValue("MEDUSA_MEILISEARCH_MASTER_KEY")
          ),
        },
        { envVar: "MEILI_NO_ANALYTICS", source: literalSource("true") },
      ],
    },
    "medusa-be": {
      dockerfilePath: "./docker/development/medusa-be/Dockerfile",
      buildContextDir: "./",
      command: null,
      volumes: [],
      urls: [
        {
          domain:
            publicServiceDomain({
              projectSlug: context.projectSlug,
              serviceSlug: medusaBeSlug,
              publicUrlAffix: context.publicUrlAffix,
              publicDomain: context.publicDomain,
            }) ?? "",
          base_path: "/",
          strip_prefix: true,
          associated_port: 9000,
        },
      ].filter((url) => url.domain),
      healthcheck: {
        type: "PATH",
        value: "/app",
        timeout_seconds: 120,
        interval_seconds: 10,
        associated_port: 9000,
      },
      resourceLimits: { cpus: 1, memory: { unit: "MEGABYTES", value: 2048 } },
      cleanupEnvKeys: [
        "LEGACY_DATABASE_URL",
        "DC_NODE_ENV",
        "DC_JWT_SECRET",
        "DC_COOKIE_SECRET",
        "DC_MEDUSA_BACKEND_URL",
        "DC_STORE_CORS",
        "DC_ADMIN_CORS",
        "DC_AUTH_CORS",
        "DC_SUPERADMIN_EMAIL",
        "DC_SUPERADMIN_PASSWORD",
        "DC_INITIAL_PUBLISHABLE_KEY_NAME",
        "DC_SETTINGS_ENCRYPTION_KEY",
        "DC_FEATURE_PPL_ENABLED",
        "DC_PPL_ENVIRONMENT",
        "DC_MEDUSA_APP_DB_USER",
        "DC_MEDUSA_APP_DB_PASSWORD",
        "DC_MEDUSA_APP_DB_NAME",
        "DC_MEDUSA_APP_DB_SCHEMA",
        "DC_REDIS_URL",
        "DC_MEILISEARCH_HOST",
        "DC_MEILISEARCH_BACKEND_API_KEY",
        "DC_MINIO_FILE_URL",
        "DC_MINIO_REGION",
        "DC_MINIO_ENDPOINT",
        "DC_MINIO_BUCKET",
        "DC_MINIO_ACCESS_KEY",
        "DC_MINIO_SECRET_KEY",
      ],
      env: [
        { envVar: "NODE_ENV", source: literalSource("production") },
        {
          envVar: "JWT_SECRET",
          source: literalSource(process.env.DC_JWT_SECRET ?? ""),
        },
        {
          envVar: "COOKIE_SECRET",
          source: literalSource(process.env.DC_COOKIE_SECRET ?? ""),
        },
        { envVar: "MEDUSA_BACKEND_URL", source: servicePublicOrigins.medusaBe },
        { envVar: "STORE_CORS", source: literalSource(context.storeCors) },
        { envVar: "ADMIN_CORS", source: literalSource(context.adminCors) },
        { envVar: "AUTH_CORS", source: literalSource(context.authCors) },
        {
          envVar: "SUPERADMIN_EMAIL",
          source: literalSource(process.env.DC_SUPERADMIN_EMAIL ?? ""),
        },
        {
          envVar: "SUPERADMIN_PASSWORD",
          source: literalSource(process.env.DC_SUPERADMIN_PASSWORD ?? ""),
        },
        {
          envVar: "INITIAL_PUBLISHABLE_KEY_NAME",
          source: literalSource(
            process.env.DC_INITIAL_PUBLISHABLE_KEY_NAME ??
              "Storefront Publishable Key"
          ),
        },
        {
          envVar: "SETTINGS_ENCRYPTION_KEY",
          source: literalSource(process.env.DC_SETTINGS_ENCRYPTION_KEY ?? ""),
        },
        {
          envVar: "FEATURE_PPL_ENABLED",
          source: literalSource(process.env.DC_FEATURE_PPL_ENABLED ?? "0"),
        },
        {
          envVar: "PPL_ENVIRONMENT",
          source: literalSource(process.env.DC_PPL_ENVIRONMENT ?? "testing"),
        },
        { envVar: "DATABASE_TYPE", source: literalSource("postgres") },
        {
          envVar: "MEDUSA_APP_DB_USER",
          source: literalSource(placeholderSharedValue("MEDUSA_APP_DB_USER")),
        },
        {
          envVar: "MEDUSA_APP_DB_PASSWORD",
          source: literalSource(
            placeholderSharedValue("MEDUSA_APP_DB_PASSWORD")
          ),
        },
        {
          envVar: "MEDUSA_APP_DB_NAME",
          source: literalSource(placeholderSharedValue("MEDUSA_APP_DB_NAME")),
        },
        {
          envVar: "MEDUSA_APP_DB_SCHEMA",
          source: literalSource(placeholderSharedValue("MEDUSA_APP_DB_SCHEMA")),
        },
        {
          envVar: "MEDUSA_DATABASE_SCHEMA",
          source: literalSource(placeholderSharedValue("MEDUSA_APP_DB_SCHEMA")),
        },
        {
          envVar: "DATABASE_SCHEMA",
          source: literalSource(placeholderSharedValue("MEDUSA_APP_DB_SCHEMA")),
        },
        {
          envVar: "DATABASE_URL",
          source: literalSource(
            "postgresql://{{env.MEDUSA_APP_DB_USER}}:{{env.MEDUSA_APP_DB_PASSWORD}}@{{env.MEDUSA_DB_HOST}}:5432/{{env.MEDUSA_APP_DB_NAME}}?sslmode=disable&options=-csearch_path%3D{{env.MEDUSA_APP_DB_SCHEMA}}%2Cpg_catalog"
          ),
        },
        {
          envVar: "REDIS_URL",
          source: literalSource(
            "redis://:{{env.MEDUSA_VALKEY_PASSWORD}}@{{env.MEDUSA_VALKEY_HOST}}:6379"
          ),
        },
        {
          envVar: "MEILISEARCH_HOST",
          source: literalSource("http://{{env.MEDUSA_MEILISEARCH_HOST}}:7700"),
        },
        {
          envVar: "MEILISEARCH_API_KEY",
          source: literalSource(
            process.env.DC_MEILISEARCH_BACKEND_API_KEY ?? ""
          ),
        },
        { envVar: "MINIO_FILE_URL", source: minioFileSource },
        {
          envVar: "MINIO_REGION",
          source: literalSource(process.env.DC_MINIO_REGION ?? "us-east-1"),
        },
        {
          envVar: "MINIO_ENDPOINT",
          source: serviceInternalOriginSource({
            serviceSlug: minioSlug,
            port: 9004,
            trailingSlash: true,
          }),
        },
        {
          envVar: "MINIO_BUCKET",
          source: literalSource(placeholderSharedValue("MEDUSA_MINIO_BUCKET")),
        },
        {
          envVar: "MINIO_ACCESS_KEY",
          source: literalSource(
            placeholderSharedValue("MEDUSA_MINIO_ACCESS_KEY")
          ),
        },
        {
          envVar: "MINIO_SECRET_KEY",
          source: literalSource(
            placeholderSharedValue("MEDUSA_MINIO_SECRET_KEY")
          ),
        },
      ],
    },
    n1: {
      dockerfilePath: "./docker/development/n1/Dockerfile",
      buildContextDir: "./",
      command: null,
      volumes: [],
      urls: [
        {
          domain:
            publicServiceDomain({
              projectSlug: context.projectSlug,
              serviceSlug: n1Slug,
              publicUrlAffix: context.publicUrlAffix,
              publicDomain: context.publicDomain,
            }) ?? "",
          base_path: "/",
          strip_prefix: true,
          associated_port: 3000,
        },
      ].filter((url) => url.domain),
      healthcheck: {
        type: "PATH",
        value: "/api/health",
        timeout_seconds: 120,
        interval_seconds: 30,
        associated_port: 3000,
      },
      resourceLimits: {
        cpus: 0.75,
        memory: { unit: "MEGABYTES", value: 1536 },
      },
      cleanupEnvKeys: [
        "NEXT_PUBLIC_META_PIXEL_ID",
        "NEXT_PUBLIC_GOOGLE_ADS_ID",
        "NEXT_PUBLIC_HEUREKA_API_KEY",
        "NEXT_PUBLIC_LEADHUB_TRACKING_ID",
        "RESEND_API_KEY",
        "CONTACT_EMAIL",
        "RESEND_FROM_EMAIL",
        "DC_N1_MEDUSA_BACKEND_URL_INTERNAL",
        "DC_N1_NEXT_PUBLIC_MEDUSA_BACKEND_URL",
        "DC_N1_NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
        "DC_N1_NEXT_PUBLIC_MEILISEARCH_URL",
        "DC_N1_NEXT_PUBLIC_MEILISEARCH_API_KEY",
        "DC_N1_NEXT_PUBLIC_SITE_URL",
        "DC_N1_NEXT_PUBLIC_META_PIXEL_ID",
        "DC_N1_NEXT_PUBLIC_GOOGLE_ADS_ID",
        "DC_N1_NEXT_PUBLIC_HEUREKA_API_KEY",
        "DC_N1_NEXT_PUBLIC_LEADHUB_TRACKING_ID",
        "DC_N1_MEDUSA_RESEND_API_KEY",
        "DC_N1_MEDUSA_CONTACT_EMAIL",
        "DC_N1_MEDUSA_RESEND_FROM_EMAIL",
      ],
      env: [
        {
          envVar: "MEDUSA_BACKEND_URL_INTERNAL",
          source: serviceInternalOriginSource({
            serviceSlug: medusaBeSlug,
            port: 9000,
          }),
        },
        {
          envVar: "NEXT_PUBLIC_MEDUSA_BACKEND_URL",
          source: servicePublicOrigins.medusaBe,
        },
        {
          envVar: "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
          source: literalSource(
            process.env.DC_N1_NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""
          ),
        },
        {
          envVar: "NEXT_PUBLIC_MEILISEARCH_URL",
          source: servicePublicOrigins.meilisearch,
        },
        {
          envVar: "NEXT_PUBLIC_MEILISEARCH_API_KEY",
          source: literalSource(
            process.env.DC_N1_NEXT_PUBLIC_MEILISEARCH_API_KEY ?? ""
          ),
        },
        { envVar: "NEXT_PUBLIC_SITE_URL", source: servicePublicOrigins.n1 },
      ],
    },
    "zane-operator": {
      dockerfilePath: "./docker/development/zane-operator/Dockerfile",
      buildContextDir: "./",
      command: null,
      volumes: [],
      urls: [
        {
          domain:
            publicServiceDomain({
              projectSlug: context.projectSlug,
              serviceSlug: "zane-operator",
              publicUrlAffix: context.publicUrlAffix,
              publicDomain: context.publicDomain,
            }) ?? "",
          base_path: "/",
          strip_prefix: true,
          associated_port: 8080,
        },
      ].filter((url) => url.domain),
      healthcheck: {
        type: "PATH",
        value: "/healthz",
        timeout_seconds: 60,
        interval_seconds: 30,
        associated_port: 8080,
      },
      resourceLimits: { cpus: 0.25, memory: { unit: "MEGABYTES", value: 256 } },
      cleanupEnvKeys: [
        "DC_ZANE_OPERATOR_PORT",
        "DC_NODE_ENV",
        "DC_ZANE_OPERATOR_API_AUTH_TOKEN",
        "DC_ZANE_OPERATOR_ZANE_BASE_URL",
        "DC_ZANE_OPERATOR_ZANE_CONNECT_BASE_URL",
        "DC_ZANE_OPERATOR_ZANE_CONNECT_HOST_HEADER",
        "DC_ZANE_OPERATOR_ZANE_USERNAME",
        "DC_ZANE_OPERATOR_ZANE_PASSWORD",
        "DC_ZANE_OPERATOR_PGUSER",
        "DC_ZANE_OPERATOR_PGPASSWORD",
        "DC_ZANE_OPERATOR_PGDATABASE",
        "DC_POSTGRES_SSLMODE",
        "DC_ZANE_OPERATOR_DB_TEMPLATE_NAME",
        "DC_ZANE_OPERATOR_DB_PREVIEW_PREFIX",
        "DC_ZANE_OPERATOR_DB_PREVIEW_APP_USER_PREFIX",
        "DC_MEDUSA_DEV_DB_USER",
        "DC_MEDUSA_APP_DB_SCHEMA",
        "DC_ZANE_OPERATOR_DB_PREVIEW_APP_PASSWORD_SECRET",
        "DC_ZANE_OPERATOR_DB_PROTECTED_NAMES",
      ],
      env: [
        { envVar: "PORT", source: literalSource("8080") },
        {
          envVar: "API_AUTH_TOKEN",
          source: literalSource(
            process.env.DC_ZANE_OPERATOR_API_AUTH_TOKEN ?? ""
          ),
        },
        {
          envVar: "PGHOST",
          source: literalSource(placeholderSharedValue("MEDUSA_DB_HOST")),
        },
        { envVar: "PGPORT", source: literalSource("5432") },
        {
          envVar: "PGUSER",
          source: literalSource(
            process.env.DC_ZANE_OPERATOR_PGUSER ?? "zane_operator"
          ),
        },
        {
          envVar: "PGPASSWORD",
          source: literalSource(process.env.DC_ZANE_OPERATOR_PGPASSWORD ?? ""),
        },
        { envVar: "PGDATABASE", source: literalSource("postgres") },
        { envVar: "PGSSLMODE", source: literalSource("disable") },
        {
          envVar: "DB_TEMPLATE_NAME",
          source: literalSource(
            process.env.DC_ZANE_OPERATOR_DB_TEMPLATE_NAME ?? "template_medusa"
          ),
        },
        {
          envVar: "DB_PREVIEW_PREFIX",
          source: literalSource(
            process.env.DC_ZANE_OPERATOR_DB_PREVIEW_PREFIX ?? "medusa_pr_"
          ),
        },
        {
          envVar: "DB_PREVIEW_APP_USER_PREFIX",
          source: literalSource(
            process.env.DC_ZANE_OPERATOR_DB_PREVIEW_APP_USER_PREFIX ??
              "medusa_pr_app_"
          ),
        },
        {
          envVar: "DB_PREVIEW_DEV_ROLE",
          source: literalSource(
            process.env.DC_MEDUSA_DEV_DB_USER ?? "medusa_dev"
          ),
        },
        {
          envVar: "DB_APP_SCHEMA",
          source: literalSource(placeholderSharedValue("MEDUSA_APP_DB_SCHEMA")),
        },
        {
          envVar: "DB_PREVIEW_APP_PASSWORD_SECRET",
          source: literalSource(
            process.env.DC_ZANE_OPERATOR_DB_PREVIEW_APP_PASSWORD_SECRET ?? ""
          ),
        },
        { envVar: "DB_PROTECTED_NAMES", source: literalSource(protectedNames) },
        {
          envVar: "ZANE_BASE_URL",
          source: literalSource(context.operatorUpstreamBaseUrl ?? ""),
        },
        {
          envVar: "ZANE_CONNECT_BASE_URL",
          source: literalSource(context.operatorUpstreamConnectBaseUrl ?? ""),
        },
        {
          envVar: "ZANE_CONNECT_HOST_HEADER",
          source: literalSource(
            context.operatorUpstreamConnectHostHeader ?? ""
          ),
        },
        {
          envVar: "ZANE_USERNAME",
          source: literalSource(context.operatorUpstreamUsername),
        },
        {
          envVar: "ZANE_PASSWORD",
          source: literalSource(context.operatorUpstreamPassword),
        },
      ],
    },
  }
}

function buildContext(input: {
  planInput: BootstrapZaneProjectPlanCommandInput
  settings: {
    root_domain?: string | null
    app_domain?: string | null
  }
  repositoryUrl: string
  branchName: string
}): ZaneProjectContext {
  const publicDomain =
    input.planInput.publicDomain ?? input.settings.root_domain ?? null
  const operatorUpstreamBaseUrlCandidate = normalizeOriginUrl(
    firstNonEmpty(
      input.planInput.operatorUpstreamZaneBaseUrl,
      process.env.DC_ZANE_OPERATOR_ZANE_BASE_URL
    )
  )
  const operatorUpstreamBaseUrl =
    operatorUpstreamBaseUrlCandidate &&
    !isLoopbackUrl(operatorUpstreamBaseUrlCandidate)
      ? operatorUpstreamBaseUrlCandidate
      : input.settings.app_domain
        ? `https://${input.settings.app_domain}`
        : null
  const connectBaseUrl = normalizeOriginUrl(
    firstNonEmpty(
      input.planInput.operatorUpstreamZaneConnectBaseUrl,
      process.env.DC_ZANE_OPERATOR_ZANE_CONNECT_BASE_URL,
      input.settings.root_domain === "127-0-0-1.sslip.io"
        ? "http://zane-app"
        : undefined
    )
  )
  const connectHostHeader =
    firstNonEmpty(
      input.planInput.operatorUpstreamZaneConnectHostHeader,
      process.env.DC_ZANE_OPERATOR_ZANE_CONNECT_HOST_HEADER
    ) ??
    (connectBaseUrl && input.settings.app_domain
      ? input.settings.app_domain
      : null)

  return {
    projectSlug: input.planInput.projectSlug,
    projectDescription: input.planInput.projectDescription,
    environmentName: input.planInput.environmentName,
    repositoryUrl: input.repositoryUrl,
    branchName: input.branchName,
    gitAppId: input.planInput.gitAppId?.trim() || null,
    publicDomain,
    publicUrlAffix: input.planInput.publicUrlAffix,
    minioFileUrlOverride: input.planInput.minioFileUrlOverride?.trim() || null,
    storeCors: preferPublicCsvOrUrl({
      explicitValue: input.planInput.storeCorsOverride,
      envValue: process.env.DC_STORE_CORS,
      fallbackValue: publicDomain
        ? `https://${input.planInput.projectSlug}-${"n1"}${input.planInput.publicUrlAffix}.${publicDomain}`
        : "https://pending-public-domain.invalid",
    }),
    adminCors: preferPublicCsvOrUrl({
      explicitValue: input.planInput.adminCorsOverride,
      envValue: process.env.DC_ADMIN_CORS,
      fallbackValue: publicDomain
        ? `https://${input.planInput.projectSlug}-${"medusa-be"}${input.planInput.publicUrlAffix}.${publicDomain}`
        : "https://pending-public-domain.invalid",
    }),
    authCors: preferPublicCsvOrUrl({
      explicitValue: input.planInput.authCorsOverride,
      envValue: process.env.DC_AUTH_CORS,
      fallbackValue: publicDomain
        ? `https://${input.planInput.projectSlug}-${"medusa-be"}${input.planInput.publicUrlAffix}.${publicDomain}`
        : "https://pending-public-domain.invalid",
    }),
    operatorUpstreamBaseUrl,
    operatorUpstreamConnectBaseUrl: connectBaseUrl ?? null,
    operatorUpstreamConnectHostHeader: connectHostHeader,
    operatorUpstreamUsername:
      input.planInput.operatorUpstreamZaneUsername ??
      process.env.DC_ZANE_OPERATOR_ZANE_USERNAME ??
      "",
    operatorUpstreamPassword:
      input.planInput.operatorUpstreamZanePassword ??
      process.env.DC_ZANE_OPERATOR_ZANE_PASSWORD ??
      "",
  }
}

type BootstrapRequiredValueCheck = {
  label: string
  value: string | null | undefined
  placeholderValues?: string[]
}

function buildValueIssueReasons(input: {
  checks: BootstrapRequiredValueCheck[]
  placeholderMessage: string
  missingMessage: string
}): string[] {
  const reasons: string[] = []

  for (const check of input.checks) {
    const normalizedValue = check.value?.trim() ?? ""
    if (!normalizedValue) {
      reasons.push(`${check.label} ${input.missingMessage}`)
      continue
    }
    if (check.placeholderValues?.includes(normalizedValue)) {
      reasons.push(`${check.label} ${input.placeholderMessage}`)
    }
  }

  return reasons
}

function buildBlockingReasons(input: {
  context: ZaneProjectContext
  phase: BootstrapZaneProjectPlanCommandInput["phase"]
  projectExists: boolean
  environmentExists: boolean
  inspectedServices: Record<string, InspectedServiceState>
}): string[] {
  const reasons: string[] = []

  if (input.projectExists && !input.environmentExists) {
    reasons.push(
      `Environment ${input.context.environmentName} is missing and must exist before bootstrap sync.`
    )
  }

  if (!input.context.publicDomain) {
    reasons.push(
      "Public domain could not be derived from input or Zane settings."
    )
  }

  for (const [serviceId, serviceState] of Object.entries(
    input.inspectedServices
  )) {
    const serviceType = serviceState.details?.type ?? null
    const isGitServiceType =
      serviceType === "git" || serviceType === "GIT_REPOSITORY"
    if (serviceState.exists && !isGitServiceType) {
      reasons.push(
        `Service ${serviceId} already exists but is not a Git service and cannot be reconciled by this bootstrap flow.`
      )
    }
  }

  if (input.phase === "services") {
    return reasons
  }

  if (!input.context.operatorUpstreamBaseUrl) {
    reasons.push(
      "zane-operator upstream Zane base URL could not be derived from input or Zane settings."
    )
  }

  reasons.push(
    ...buildValueIssueReasons({
      checks: [
        {
          label: "zane-operator upstream Zane username",
          value: input.context.operatorUpstreamUsername,
        },
        {
          label: "zane-operator upstream Zane password",
          value: input.context.operatorUpstreamPassword,
        },
        {
          label: "DC_ZANE_OPERATOR_API_AUTH_TOKEN",
          value: process.env.DC_ZANE_OPERATOR_API_AUTH_TOKEN,
        },
        {
          label: "DC_ZANE_OPERATOR_PGPASSWORD",
          value: process.env.DC_ZANE_OPERATOR_PGPASSWORD,
        },
        {
          label: "DC_ZANE_OPERATOR_DB_PREVIEW_APP_PASSWORD_SECRET",
          value: process.env.DC_ZANE_OPERATOR_DB_PREVIEW_APP_PASSWORD_SECRET,
        },
      ],
      placeholderMessage: "is still set to a placeholder value and must be replaced before bootstrap.",
      missingMessage: "could not be resolved for bootstrap.",
    })
  )

  const aliasChecks: Array<{
    serviceId: string
    field: "network_alias" | "global_network_alias"
  }> = [
    { serviceId: "medusa-db", field: "global_network_alias" },
    { serviceId: "medusa-valkey", field: "network_alias" },
    { serviceId: "medusa-meilisearch", field: "network_alias" },
    { serviceId: "medusa-minio", field: "network_alias" },
    { serviceId: "medusa-be", field: "network_alias" },
  ]
  for (const aliasCheck of aliasChecks) {
    const details = input.inspectedServices[aliasCheck.serviceId]?.details
    if (!details?.[aliasCheck.field]) {
      reasons.push(
        `Service ${aliasCheck.serviceId} is missing ${aliasCheck.field} required for bootstrap env resolution.`
      )
    }
  }

  return reasons
}

function buildWarningReasons(): string[] {
  return buildValueIssueReasons({
    checks: [
      {
        label: "DC_MEDUSA_APP_DB_PASSWORD",
        value: process.env.DC_MEDUSA_APP_DB_PASSWORD,
        placeholderValues: ["medusa_app_change_me"],
      },
      {
        label: "DC_VALKEY_PASSWORD",
        value: process.env.DC_VALKEY_PASSWORD,
        placeholderValues: ["valkey_dev_change_me"],
      },
      {
        label: "DC_MINIO_ACCESS_KEY",
        value: process.env.DC_MINIO_ACCESS_KEY,
        placeholderValues: ["medusaappkey"],
      },
      {
        label: "DC_MINIO_SECRET_KEY",
        value: process.env.DC_MINIO_SECRET_KEY,
        placeholderValues: ["medusaappsecret_change_me"],
      },
      {
        label: "DC_MEILISEARCH_MASTER_KEY",
        value: process.env.DC_MEILISEARCH_MASTER_KEY,
      },
      {
        label: "DC_MEDUSA_DEV_DB_PASSWORD",
        value: process.env.DC_MEDUSA_DEV_DB_PASSWORD,
        placeholderValues: ["medusa_dev_change_me"],
      },
      {
        label: "DC_MINIO_ROOT_USER",
        value: process.env.DC_MINIO_ROOT_USER,
        placeholderValues: ["minioadmin"],
      },
      {
        label: "DC_MINIO_ROOT_PASSWORD",
        value: process.env.DC_MINIO_ROOT_PASSWORD,
        placeholderValues: ["minioadmin"],
      },
      {
        label: "DC_JWT_SECRET",
        value: process.env.DC_JWT_SECRET,
        placeholderValues: ["supersecret"],
      },
      {
        label: "DC_COOKIE_SECRET",
        value: process.env.DC_COOKIE_SECRET,
        placeholderValues: ["supersecret"],
      },
      {
        label: "DC_SUPERADMIN_EMAIL",
        value: process.env.DC_SUPERADMIN_EMAIL,
      },
      {
        label: "DC_SUPERADMIN_PASSWORD",
        value: process.env.DC_SUPERADMIN_PASSWORD,
      },
      {
        label: "DC_SETTINGS_ENCRYPTION_KEY",
        value: process.env.DC_SETTINGS_ENCRYPTION_KEY,
      },
    ],
    placeholderMessage: "is still set to a placeholder value; bootstrap will continue, but the value should be replaced.",
    missingMessage: "is empty; bootstrap will continue, but the value should be filled before relying on the deployed service.",
  })
}

function interpolateSharedValues(
  value: string,
  sharedEnv: Record<string, string>
): string {
  return value.replace(
    /\{\{env\.([A-Z0-9_]+)\}\}/g,
    (_match, key) => sharedEnv[key] ?? ""
  )
}

function resolveSourceValue(input: {
  source: BootstrapValueSource
  context: ZaneProjectContext
  inspectedServices: Record<string, InspectedServiceState>
  sharedEnv: Record<string, string>
}): string {
  const { source, context, inspectedServices, sharedEnv } = input
  if (source.kind === "literal") {
    return interpolateSharedValues(source.value ?? "", sharedEnv)
  }

  const serviceState = Object.values(inspectedServices).find(
    (service) => service.details?.slug === source.service_slug
  )
  const serviceDetails = serviceState?.details
  if (!serviceDetails) {
    return ""
  }

  switch (source.kind) {
    case "service_network_alias":
      return serviceDetails.network_alias ?? ""
    case "service_global_network_alias":
      return serviceDetails.global_network_alias ?? ""
    case "service_public_origin": {
      const domain = publicServiceDomain({
        projectSlug: context.projectSlug,
        serviceSlug: source.service_slug ?? "",
        publicUrlAffix: context.publicUrlAffix,
        publicDomain: context.publicDomain,
      })
      return domain ? `https://${domain}` : ""
    }
    case "service_internal_origin": {
      const alias = serviceDetails.network_alias ?? ""
      const suffix = source.trailing_slash ? "/" : ""
      return alias && source.port
        ? `http://${alias}:${source.port}${suffix}`
        : ""
    }
    case "service_internal_bucket_url": {
      const alias = serviceDetails.network_alias ?? ""
      const bucket = source.bucket_shared_env_key
        ? (sharedEnv[source.bucket_shared_env_key] ?? "")
        : ""
      return alias && source.port && bucket
        ? `http://${alias}:${source.port}/${bucket}`
        : ""
    }
    default:
      return ""
  }
}

function resolveSharedEnv(
  variables: PlannedSharedEnvVariable[],
  context: ZaneProjectContext,
  inspectedServices: Record<string, InspectedServiceState>
): Record<string, string> {
  const sharedEnv: Record<string, string> = {}
  for (const variable of variables) {
    sharedEnv[variable.key] = resolveSourceValue({
      source: variable.source,
      context,
      inspectedServices,
      sharedEnv,
    })
  }
  return sharedEnv
}

function resolveServiceEnv(
  env: PlannedServiceEnvVariable[],
  context: ZaneProjectContext,
  inspectedServices: Record<string, InspectedServiceState>,
  sharedEnv: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const envVar of env) {
    result[envVar.envVar] = resolveSourceValue({
      source: envVar.source,
      context,
      inspectedServices,
      sharedEnv,
    })
  }
  return result
}

export async function executeBootstrapZaneProjectPlan(
  input: BootstrapZaneProjectPlanCommandInput
) {
  const manifest = await loadManifest(input.stackManifestPath)
  const deployableServices = listDeployableServices(manifest)
  const repositoryUrl = await deriveRepositoryUrl(input.repositoryUrl)
  const branchName = await deriveBranchName(input.branchName)
  const inspectResponse = bootstrapZaneProjectInspectResponseSchema.parse(
    await readJsonFile(input.inspectJsonPath)
  )
  const context = buildContext({
    planInput: input,
    settings: inspectResponse.settings,
    repositoryUrl,
    branchName,
  })
  const serviceSlugById = Object.fromEntries(
    deployableServices.map((service) => [service.id, service.serviceSlug])
  ) as Record<string, string>
  const plannedServices = buildZaneProjectServices(context, serviceSlugById)
  const inspectedServices = Object.fromEntries(
    deployableServices.map((service) => {
      const inspected = inspectResponse.services.find(
        (candidate) => candidate.service_slug === service.serviceSlug
      )

      return [
        service.id,
        {
          exists: inspected?.exists ?? false,
          details: inspected?.details ?? null,
        },
      ]
    })
  ) as Record<string, InspectedServiceState>
  const blockingReasons = buildBlockingReasons({
    context,
    phase: input.phase,
    projectExists: inspectResponse.project_exists,
    environmentExists: inspectResponse.environment_exists,
    inspectedServices,
  })
  const warnings = buildWarningReasons()
  const sharedEnvVariables = buildSharedEnvVariables(serviceSlugById)
  const resolvedSharedEnv =
    input.phase === "services"
      ? {}
      : resolveSharedEnv(sharedEnvVariables, context, inspectedServices)

  return bootstrapZaneProjectPlanResponseSchema.parse({
    project_slug: context.projectSlug,
    project_description: context.projectDescription,
    environment_name: context.environmentName,
    phase: input.phase,
    status: blockingReasons.length === 0 ? "ready" : "blocked",
    blocking_reasons: blockingReasons,
    warnings,
    ensure_project: !inspectResponse.project_exists,
    project_exists: inspectResponse.project_exists,
    environment_exists: inspectResponse.environment_exists,
    repository_url: context.repositoryUrl,
    branch_name: context.branchName,
    git_app_id: context.gitAppId,
    public_domain: context.publicDomain,
    public_url_affix: context.publicUrlAffix,
    settings: inspectResponse.settings,
    operator_upstream: {
      base_url: context.operatorUpstreamBaseUrl,
      connect_base_url: context.operatorUpstreamConnectBaseUrl,
      connect_host_header: context.operatorUpstreamConnectHostHeader,
    },
    services: deployableServices.map((service) => {
      const servicePlan = plannedServices[service.id]
      const serviceState = inspectedServices[service.id]
      if (!servicePlan) {
        throw new Error(`Missing bootstrap service plan for ${service.id}.`)
      }
      if (!serviceState) {
        throw new Error(
          `Missing inspected bootstrap service state for ${service.id}.`
        )
      }
      const managedPublicDomains = servicePlan.urls
        .map((url) => url.domain)
        .filter((value): value is string => Boolean(value))
      const desiredEnv =
        input.phase === "services"
          ? {}
          : resolveServiceEnv(
              servicePlan.env,
              context,
              inspectedServices,
              resolvedSharedEnv
            )

      return {
        service_id: service.id,
        service_slug: service.serviceSlug,
        exists: serviceState.exists,
        service_type: serviceState.details?.type ?? null,
        create_service: !serviceState.exists,
        dockerfile_path: servicePlan.dockerfilePath,
        build_context_dir: servicePlan.buildContextDir,
        has_command: Boolean(servicePlan.command),
        volume_names: servicePlan.volumes.map((volume) => volume.name),
        managed_public_domains: managedPublicDomains,
        env_keys: servicePlan.env.map((envVar) => envVar.envVar),
        env_sources: servicePlan.env.map((envVar) =>
          summarizeSource({ envVar: envVar.envVar, source: envVar.source })
        ),
        cleanup_env_keys: servicePlan.cleanupEnvKeys,
        desired_git_source: {
          repository_url: context.repositoryUrl,
          branch_name: context.branchName,
          git_app_id: context.gitAppId,
        },
        desired_builder: {
          dockerfile_path: servicePlan.dockerfilePath,
          build_context_dir: servicePlan.buildContextDir,
        },
        desired_command: servicePlan.command,
        desired_volumes: servicePlan.volumes,
        desired_urls: servicePlan.urls,
        desired_healthcheck: servicePlan.healthcheck,
        desired_resource_limits: {
          cpus: servicePlan.resourceLimits.cpus,
          memory: servicePlan.resourceLimits.memory,
        },
        desired_env: desiredEnv,
        healthcheck: servicePlan.healthcheck,
        resource_limits: {
          cpus: servicePlan.resourceLimits.cpus,
          memory_mb: servicePlan.resourceLimits.memory?.value ?? null,
        },
      }
    }),
    shared_env_variables: sharedEnvVariables.map((variable) =>
      summarizeSource({ key: variable.key, source: variable.source })
    ),
    shared_env: resolvedSharedEnv,
    shared_env_cleanup_keys: [...sharedEnvCleanupKeys],
  })
}
