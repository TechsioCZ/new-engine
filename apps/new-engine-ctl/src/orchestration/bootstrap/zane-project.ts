import type { BootstrapInspectServiceDetails } from "../../contracts/bootstrap-shared.js"
import type { BootstrapZaneProjectPlanCommandInput } from "../../contracts/bootstrap-zane-project.js"
import {
  bootstrapZaneProjectInspectResponseSchema,
  bootstrapZaneProjectPlanResponseSchema,
} from "../../contracts/bootstrap-zane-project.js"
import type { PreviewSharedEnvVariableInput } from "../../contracts/preview-shared-env.js"
import { getBootstrapZaneProjectSharedEnvDefinitions } from "../../contracts/stack-inputs.js"
import type { StackInputs } from "../../contracts/stack-inputs.js"
import { getZaneService } from "../../contracts/stack-manifest.js"
import { loadDeployContracts } from "../deploy-inputs.js"
import type { BootstrapValueSource } from "./shared.js"
import {
  deriveBranchName,
  deriveRepositoryUrl,
  firstNonEmpty,
  isLoopbackUrl,
  literalSource,
  normalizeOriginUrl,
  preferExplicitOrMergeCsv,
  readJsonFile,
  serviceGlobalNetworkAliasSource,
  serviceInternalBucketUrlSource,
  serviceInternalOriginSource,
  serviceNetworkAliasSource,
  servicePublicOriginSource,
} from "./shared.js"

interface PlannedSharedEnvVariable {
  key: string
  source: BootstrapValueSource
}

interface PlannedServiceEnvVariable {
  envVar: string
  source: BootstrapValueSource
}

interface PlannedBootstrapService {
  dockerfilePath: string
  buildContextDir: string
  command: string | null
  volumes: {
    name: string
    container_path: string
    host_path: string | null
    mode: string
  }[]
  urls: {
    domain: string
    base_path: string
    strip_prefix: boolean
    associated_port: number | null
  }[]
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

interface ZaneProjectContext {
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

interface InspectedServiceState {
  exists: boolean
  details: BootstrapInspectServiceDetails | null
}

function requiredServiceSlug(
  serviceSlugs: Record<string, string>,
  serviceId: string,
): string {
  const serviceSlug = serviceSlugs[serviceId]
  if (!serviceSlug) {
    throw new Error(
      `Missing manifest service slug for bootstrap service ${serviceId}.`,
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
  "MEDUSA_COOKIE_SECURE",
  "MEDUSA_COOKIE_SAME_SITE",
  "MEDUSA_ADMIN_DISABLED_FOR_BACKEND_BUILD",
  "STOREFRONT_URL",
  "STORE_NAME",
  "PRODUCT_REVIEW_REQUEST_MESSAGE",
  "PRODUCT_REVIEW_REQUEST_DELAY_MINUTES",
  "PRODUCT_REVIEW_TOKEN_EXPIRY_DAYS",
  "WORKFLOW_QUEUE_RUNNER_BATCH_SIZE",
  "WORKFLOW_QUEUE_RUNNER_SCHEDULE",
  "SETTINGS_ENCRYPTION_KEY",
  "SUPERADMIN_EMAIL",
  "SUPERADMIN_PASSWORD",
  "INITIAL_PUBLISHABLE_KEY_NAME",
  "FEATURE_PPL_ENABLED",
  "PPL_ENVIRONMENT",
  "FEATURE_PACKETA_ENABLED",
  "PACKETA_ENVIRONMENT",
  "PACKETA_PICKUP_POINTS_API_KEY",
  "FEATURE_PAYKIT_ENABLED",
  "FEATURE_PAYKIT_GOPAY_ENABLED",
  "FEATURE_PAYKIT_STRIPE_ENABLED",
  "FEATURE_PAYKIT_COMGATE_ENABLED",
  "PAYKIT_DEBUG",
  "GOPAY_CLIENT_ID",
  "GOPAY_CLIENT_SECRET",
  "GOPAY_GO_ID",
  "GOPAY_SANDBOX",
  "GOPAY_WEBHOOK_URL",
  "STRIPE_API_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "COMGATE_MERCHANT",
  "COMGATE_SECRET",
  "COMGATE_SANDBOX",
  "COMGATE_PAYMENT_LABEL",
  "HERBATICA_XML_PATH",
  "HERBATICA_CATEGORIES_XML_PATH",
  "HERBATICA_MANUFACTURERS_CSV_PATH",
  "HERBATICA_REVIEWS_XML_PATH",
  "SENTRY_TRACES_SAMPLE_RATE",
  "FEATURE_PAYMENT_QR_ENABLED",
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
  "MEDUSA_BE_FEATURE_PACKETA_ENABLED",
  "MEDUSA_BE_PACKETA_ENVIRONMENT",
  "MEDUSA_BE_PACKETA_PICKUP_POINTS_API_KEY",
  "MEDUSA_BE_FEATURE_PAYKIT_ENABLED",
  "MEDUSA_BE_FEATURE_PAYKIT_GOPAY_ENABLED",
  "MEDUSA_BE_FEATURE_PAYKIT_STRIPE_ENABLED",
  "MEDUSA_BE_FEATURE_PAYKIT_COMGATE_ENABLED",
  "MEDUSA_BE_PAYKIT_DEBUG",
  "MEDUSA_BE_GOPAY_CLIENT_ID",
  "MEDUSA_BE_GOPAY_CLIENT_SECRET",
  "MEDUSA_BE_GOPAY_GO_ID",
  "MEDUSA_BE_GOPAY_SANDBOX",
  "MEDUSA_BE_GOPAY_WEBHOOK_URL",
  "MEDUSA_BE_STRIPE_API_KEY",
  "MEDUSA_BE_STRIPE_WEBHOOK_SECRET",
  "MEDUSA_BE_COMGATE_MERCHANT",
  "MEDUSA_BE_COMGATE_SECRET",
  "MEDUSA_BE_COMGATE_SANDBOX",
  "MEDUSA_BE_COMGATE_PAYMENT_LABEL",
  "MEDUSA_BE_HERBATICA_XML_PATH",
  "MEDUSA_BE_HERBATICA_CATEGORIES_XML_PATH",
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
  "DC_SENTRY_TRACES_SAMPLE_RATE",
  "DC_SETTINGS_ENCRYPTION_KEY",
  "DC_FEATURE_PPL_ENABLED",
  "DC_PPL_ENVIRONMENT",
  "DC_FEATURE_PAYMENT_QR_ENABLED",
  "DC_SUPERADMIN_EMAIL",
  "DC_SUPERADMIN_PASSWORD",
  "DC_INITIAL_PUBLISHABLE_KEY_NAME",
  "DC_N1_NEXT_PUBLIC_SITE_URL",
  "DC_N1_NEXT_PUBLIC_MEDUSA_BACKEND_URL",
  "DC_N1_NEXT_PUBLIC_MEILISEARCH_URL",
  "DC_N1_NEXT_PUBLIC_MEILISEARCH_API_KEY",
  "DC_N1_NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
  "DC_HERBATIKA_NEXT_PUBLIC_STOREFRONT_AUTH_MODE",
  "DC_HERBATIKA_MEDUSA_BACKEND_URL_INTERNAL",
  "DC_HERBATIKA_NEXT_PUBLIC_MEDUSA_BACKEND_URL",
  "DC_HERBATIKA_NEXT_PUBLIC_PACKETA_WIDGET_COUNTRIES",
  "DC_HERBATIKA_NEXT_PUBLIC_PACKETA_WIDGET_API_KEY",
  "DC_HERBATIKA_NEXT_PUBLIC_PPL_WIDGET_API_KEY",
  "DC_HERBATIKA_NEXT_PUBLIC_PAYLOAD_BASE_URL",
  "DC_HERBATIKA_NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
  "DC_N1_NEXT_PUBLIC_META_PIXEL_ID",
  "DC_N1_NEXT_PUBLIC_GOOGLE_ADS_ID",
  "DC_N1_NEXT_PUBLIC_HEUREKA_API_KEY",
  "DC_N1_NEXT_PUBLIC_LEADHUB_TRACKING_ID",
  "DC_RESEND_API_KEY",
  "DC_RESEND_FROM_EMAIL",
  "DC_RESEND_WEBHOOK_SECRET",
  "DC_CONTACT_EMAIL",
  "DC_MEDUSA_BE_NOTIFICATION_PROVIDER",
  "DC_MEDUSA_BE_RESEND_API_KEY",
  "DC_MEDUSA_BE_RESEND_FROM_EMAIL",
  "DC_MEDUSA_BE_RESEND_WEBHOOK_SECRET",
  "DC_N1_RESEND_API_KEY",
  "DC_N1_CONTACT_EMAIL",
  "DC_N1_RESEND_FROM_EMAIL",
  "DC_N1_MEDUSA_RESEND_API_KEY",
  "DC_N1_MEDUSA_CONTACT_EMAIL",
  "DC_N1_MEDUSA_RESEND_FROM_EMAIL",
  "DC_N1_MEDUSA_RESEND_WEBHOOK_SECRET",
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
  "DC_MEDUSA_COOKIE_SECURE",
  "DC_MEDUSA_COOKIE_SAME_SITE",
  "DC_MEDUSA_ADMIN_DISABLED_FOR_BACKEND_BUILD",
  "DC_STOREFRONT_URL",
  "DC_STORE_NAME",
  "DC_PRODUCT_REVIEW_REQUEST_MESSAGE",
  "DC_PRODUCT_REVIEW_REQUEST_DELAY_MINUTES",
  "DC_PRODUCT_REVIEW_TOKEN_EXPIRY_DAYS",
  "DC_WORKFLOW_QUEUE_RUNNER_BATCH_SIZE",
  "DC_WORKFLOW_QUEUE_RUNNER_SCHEDULE",
  "DC_MEDUSA_DEV_DB_USER",
  "DC_MEDUSA_DEV_DB_PASSWORD",
  "DC_REDIS_URL",
  "DC_MEDUSA_BE_REDIS_SESSIONS_ENABLED",
  "DC_MEDUSA_BE_CACHE_PROVIDER",
  "DC_MEDUSA_BE_EVENT_BUS_PROVIDER",
  "DC_MEDUSA_BE_WORKFLOW_ENGINE_PROVIDER",
  "DC_MEDUSA_BE_LOCKING_PROVIDER",
  "DC_MEDUSA_BE_MEILISEARCH_ENABLED",
  "DC_MEDUSA_BE_FILE_PROVIDER",
  "DC_MEDUSA_BE_FILE_LOCAL_UPLOAD_DIR",
  "DC_HERBATICA_MANUFACTURERS_CSV_PATH",
  "DC_HERBATICA_REVIEWS_XML_PATH",
  "DC_MEILISEARCH_BACKEND_API_KEY",
  "DC_N1_MEDUSA_BACKEND_URL_INTERNAL",
  "DC_N1_NEXT_PUBLIC_MEDUSA_BACKEND_URL",
  "DC_N1_NEXT_PUBLIC_MEILISEARCH_URL",
  "DC_N1_NEXT_PUBLIC_MEILISEARCH_API_KEY",
  "DC_N1_NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
  "DC_N1_NEXT_PUBLIC_SITE_URL",
  "DC_RESEND_API_KEY",
  "DC_RESEND_FROM_EMAIL",
  "DC_RESEND_WEBHOOK_SECRET",
  "DC_CONTACT_EMAIL",
  "DC_MEDUSA_BE_NOTIFICATION_PROVIDER",
  "DC_MEDUSA_BE_RESEND_API_KEY",
  "DC_MEDUSA_BE_RESEND_FROM_EMAIL",
  "DC_MEDUSA_BE_RESEND_WEBHOOK_SECRET",
  "DC_N1_RESEND_API_KEY",
  "DC_N1_CONTACT_EMAIL",
  "DC_N1_RESEND_FROM_EMAIL",
  "DC_N1_MEDUSA_RESEND_API_KEY",
  "DC_N1_MEDUSA_CONTACT_EMAIL",
  "DC_N1_MEDUSA_RESEND_FROM_EMAIL",
  "DC_N1_MEDUSA_RESEND_WEBHOOK_SECRET",
  "DC_LEGACY_DATABASE_URL",
  "DC_FEATURE_PAYLOAD_ENABLED",
  "DC_IS_IFRAME_PAYLOAD",
  "DC_PAYLOAD_API_KEY",
  "DC_PAYLOAD_BASE_URL",
  "DC_PAYLOAD_IFRAME_URL",
  "DC_PAYLOAD_WEBHOOK_SECRET",
  "DC_CMS_CACHE_TTL",
  "DC_CMS_LIST_CACHE_TTL",
  "DC_FEATURE_PAYLOAD_ARTICLES_ENABLED",
  "DC_FEATURE_PAYLOAD_PAGES_ENABLED",
  "DC_FEATURE_PAYLOAD_HERO_CAROUSELS_ENABLED",
  "DC_FE_MEDUSA_BACKEND_URL",
  "DC_PAYLOAD_DATABASE_USER",
  "DC_PAYLOAD_DATABASE_PASSWORD",
  "DC_PAYLOAD_DATABASE_SCHEMA_NAME",
  "DC_PAYLOAD_DATABASE_URL",
  "DC_PAYLOAD_SECRET",
  "DC_PAYLOAD_LOCALES",
  "DC_PAYLOAD_S3_ENDPOINT",
  "DC_PAYLOAD_S3_REGION",
  "DC_PAYLOAD_S3_BUCKET",
  "DC_PAYLOAD_S3_ACCESS_KEY_ID",
  "DC_PAYLOAD_S3_SECRET_ACCESS_KEY",
  "DC_PAYLOAD_SSO_ALG",
  "DC_PAYLOAD_SSO_ALLOWED_ORIGINS",
  "DC_PAYLOAD_SSO_AUDIENCE",
  "DC_PAYLOAD_SSO_ISSUER",
  "DC_PAYLOAD_SSO_PRIVATE_KEY",
  "DC_PAYLOAD_SSO_PUBLIC_KEY",
  "DC_PAYLOAD_SSO_TOKEN_TTL",
  "DC_PAYLOAD_SSO_USER_EMAIL",
  "DC_OPENAI_API_KEY",
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
  key?: string | undefined
  envVar?: string | undefined
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
  serviceSlugs: Record<string, string>,
  stackInputs: StackInputs,
): PlannedSharedEnvVariable[] {
  return getBootstrapZaneProjectSharedEnvDefinitions(stackInputs).map(
    (definition) => {
      switch (definition.source.kind) {
        case "service_global_network_alias": {
          return {
            key: definition.key,
            source: serviceGlobalNetworkAliasSource(
              requiredServiceSlug(
                serviceSlugs,
                definition.source.service_id ?? "",
              ),
            ),
          }
        }
        case "service_network_alias": {
          return {
            key: definition.key,
            source: serviceNetworkAliasSource(
              requiredServiceSlug(
                serviceSlugs,
                definition.source.service_id ?? "",
              ),
            ),
          }
        }
        case "local_env": {
          return {
            key: definition.key,
            source: literalSource(
              process.env[definition.source.env_var ?? ""] ??
                definition.source.default_value ??
                "",
            ),
          }
        }
        default: {
          throw new Error(
            `Unsupported bootstrap shared env source: ${JSON.stringify(definition.source)}`,
          )
        }
      }
    },
  )
}

function applySharedEnvServiceTargets(input: {
  plannedServices: Record<string, PlannedBootstrapService>
  stackInputs: StackInputs
}): void {
  for (const definition of getBootstrapZaneProjectSharedEnvDefinitions(
    input.stackInputs,
  )) {
    for (const target of definition.service_targets) {
      const servicePlan = input.plannedServices[target.service_id]
      if (!servicePlan) {
        throw new Error(
          `Missing bootstrap service plan for shared env target ${target.service_id}.${target.env_var}.`,
        )
      }

      const nextEnv = {
        envVar: target.env_var,
        source: literalSource(placeholderSharedValue(definition.key)),
      }
      const existingIndex = servicePlan.env.findIndex(
        (envVar) => envVar.envVar === target.env_var,
      )

      if (existingIndex === -1) {
        servicePlan.env.push(nextEnv)
      } else {
        servicePlan.env[existingIndex] = nextEnv
      }
    }
  }
}

// this is a declarative service bootstrap plan; splitting it would hide the service graph.
function buildZaneProjectServices(
  context: ZaneProjectContext,
  serviceSlugs: Record<string, string>,
): Record<string, PlannedBootstrapService> {
  const protectedNamesBase =
    process.env.DC_ZANE_OPERATOR_DB_PROTECTED_NAMES ??
    "postgres,template0,template1"
  const protectedNames = protectedNamesBase.includes("template_medusa")
    ? protectedNamesBase
    : `${protectedNamesBase},template_medusa`
  const medusaBeSlug = requiredServiceSlug(serviceSlugs, "medusa-be")
  const payloadSlug = requiredServiceSlug(serviceSlugs, "payload")
  const herbatikaSlug = requiredServiceSlug(serviceSlugs, "herbatika")
  const n1Slug = serviceSlugs.n1
  const meilisearchSlug = requiredServiceSlug(
    serviceSlugs,
    "medusa-meilisearch",
  )
  const minioSlug = requiredServiceSlug(serviceSlugs, "medusa-minio")
  const medusaBePublicDomain = publicServiceDomain({
    projectSlug: context.projectSlug,
    publicDomain: context.publicDomain,
    publicUrlAffix: context.publicUrlAffix,
    serviceSlug: medusaBeSlug,
  })
  const configuredGoPayWebhookUrl =
    process.env.DC_GOPAY_WEBHOOK_URL?.trim() ?? ""
  const generatedGoPayWebhookUrl = medusaBePublicDomain
    ? `https://${medusaBePublicDomain}/hooks/payment/paykit_gopay`
    : ""
  const goPayWebhookUrl =
    configuredGoPayWebhookUrl && !isLoopbackUrl(configuredGoPayWebhookUrl)
      ? configuredGoPayWebhookUrl
      : generatedGoPayWebhookUrl

  const servicePublicOrigins = {
    herbatika: servicePublicOriginSource(herbatikaSlug),
    medusaBe: servicePublicOriginSource(medusaBeSlug),
    meilisearch: servicePublicOriginSource(meilisearchSlug),
    payload: servicePublicOriginSource(payloadSlug),
  }
  const minioFileSource = context.minioFileUrlOverride
    ? literalSource(context.minioFileUrlOverride)
    : serviceInternalBucketUrlSource({
        bucketSharedEnvKey: "MEDUSA_MINIO_BUCKET",
        port: 9004,
        serviceSlug: minioSlug,
      })

  return {
    "medusa-db": {
      buildContextDir: "./docker/development/postgres",
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
        "DC_PAYLOAD_DATABASE_USER",
        "DC_PAYLOAD_DATABASE_PASSWORD",
        "DC_PAYLOAD_DATABASE_SCHEMA_NAME",
      ],
      command: "sh -lc 'exec /usr/local/bin/run-postgres-with-bootstrap.sh'",
      dockerfilePath: "./docker/development/postgres/Dockerfile",
      env: [
        {
          envVar: "POSTGRES_USER",
          source: literalSource(process.env.DC_POSTGRES_SUPERUSER ?? "root"),
        },
        {
          envVar: "POSTGRES_PASSWORD",
          source: literalSource(
            process.env.DC_POSTGRES_SUPERUSER_PASSWORD ?? "root",
          ),
        },
        {
          envVar: "PGDATA",
          source: literalSource("/var/lib/postgresql/18/docker"),
        },
        {
          envVar: "MEDUSA_DEV_DB_USER",
          source: literalSource(
            process.env.DC_MEDUSA_DEV_DB_USER ?? "medusa_dev",
          ),
        },
        {
          envVar: "MEDUSA_DEV_DB_PASSWORD",
          source: literalSource(process.env.DC_MEDUSA_DEV_DB_PASSWORD ?? ""),
        },
        {
          envVar: "MEDUSA_DB_ZANE_OPERATOR_USER",
          source: literalSource(
            process.env.DC_ZANE_OPERATOR_PGUSER ?? "zane_operator",
          ),
        },
        {
          envVar: "MEDUSA_DB_ZANE_OPERATOR_PASSWORD",
          source: literalSource(process.env.DC_ZANE_OPERATOR_PGPASSWORD ?? ""),
        },
        {
          envVar: "MEDUSA_DB_ZANE_OPERATOR_DB_TEMPLATE_NAME",
          source: literalSource(
            process.env.DC_ZANE_OPERATOR_DB_TEMPLATE_NAME ?? "template_medusa",
          ),
        },
      ],
      healthcheck: {
        interval_seconds: 30,
        timeout_seconds: 60,
        type: "COMMAND",
        value: "sh -lc 'exec /usr/local/bin/postgres-ready-with-bootstrap.sh'",
      },
      resourceLimits: { cpus: 0.5, memory: { unit: "MEGABYTES", value: 768 } },
      urls: [],
      volumes: [
        {
          container_path: "/var/lib/postgresql",
          host_path: null,
          mode: "READ_WRITE",
          name: "pgdata",
        },
      ],
    },
    "medusa-valkey": {
      buildContextDir: "./docker/development/medusa-valkey",
      cleanupEnvKeys: ["DC_VALKEY_PASSWORD"],
      command:
        "sh -lc 'exec valkey-server --requirepass \"$VALKEY_PASSWORD\" --appendonly yes'",
      dockerfilePath: "./docker/development/medusa-valkey/Dockerfile",
      env: [],
      healthcheck: {
        interval_seconds: 5,
        timeout_seconds: 60,
        type: "COMMAND",
        value:
          "sh -lc 'valkey-cli -a \"$VALKEY_PASSWORD\" --no-auth-warning ping | grep -q PONG'",
      },
      resourceLimits: { cpus: 0.25, memory: { unit: "MEGABYTES", value: 256 } },
      urls: [],
      volumes: [
        {
          container_path: "/data",
          host_path: null,
          mode: "READ_WRITE",
          name: "data",
        },
      ],
    },
    "medusa-minio": {
      buildContextDir: "./docker/development/medusa-minio",
      cleanupEnvKeys: [
        "DC_MINIO_ROOT_USER",
        "DC_MINIO_ROOT_PASSWORD",
        "DC_MINIO_ACCESS_KEY",
        "DC_MINIO_SECRET_KEY",
        "DC_MINIO_BUCKET",
      ],
      command: null,
      dockerfilePath: "./docker/development/medusa-minio/Dockerfile",
      env: [
        {
          envVar: "MINIO_ROOT_USER",
          source: literalSource(process.env.DC_MINIO_ROOT_USER ?? ""),
        },
        {
          envVar: "MINIO_ROOT_PASSWORD",
          source: literalSource(process.env.DC_MINIO_ROOT_PASSWORD ?? ""),
        },
      ],
      healthcheck: {
        associated_port: 9004,
        interval_seconds: 10,
        timeout_seconds: 60,
        type: "PATH",
        value: "/minio/health/live",
      },
      resourceLimits: { cpus: 0.25, memory: { unit: "MEGABYTES", value: 512 } },
      urls: [],
      volumes: [
        {
          container_path: "/data",
          host_path: null,
          mode: "READ_WRITE",
          name: "data",
        },
      ],
    },
    "medusa-meilisearch": {
      buildContextDir: "./docker/development/medusa-meilisearch",
      cleanupEnvKeys: ["DC_MEILISEARCH_MASTER_KEY"],
      command: null,
      dockerfilePath: "./docker/development/medusa-meilisearch/Dockerfile",
      env: [{ envVar: "MEILI_NO_ANALYTICS", source: literalSource("true") }],
      healthcheck: {
        associated_port: 7700,
        interval_seconds: 10,
        timeout_seconds: 60,
        type: "PATH",
        value: "/health",
      },
      resourceLimits: { cpus: 0.5, memory: { unit: "MEGABYTES", value: 1024 } },
      urls: [
        {
          associated_port: 7700,
          base_path: "/",
          domain:
            publicServiceDomain({
              projectSlug: context.projectSlug,
              publicDomain: context.publicDomain,
              publicUrlAffix: context.publicUrlAffix,
              serviceSlug: meilisearchSlug,
            }) ?? "",
          strip_prefix: true,
        },
      ].filter((url) => url.domain),
      volumes: [
        {
          container_path: "/meili_data",
          host_path: null,
          mode: "READ_WRITE",
          name: "data",
        },
      ],
    },
    "medusa-be": {
      buildContextDir: "./",
      cleanupEnvKeys: [
        "LEGACY_DATABASE_URL",
        "DC_NODE_ENV",
        "DC_JWT_SECRET",
        "DC_COOKIE_SECRET",
        "DC_MEDUSA_COOKIE_SECURE",
        "DC_MEDUSA_COOKIE_SAME_SITE",
        "DC_MEDUSA_ADMIN_DISABLED_FOR_BACKEND_BUILD",
        "DC_MEDUSA_BACKEND_URL",
        "DC_STOREFRONT_URL",
        "DC_STORE_NAME",
        "DC_PRODUCT_REVIEW_REQUEST_MESSAGE",
        "DC_PRODUCT_REVIEW_REQUEST_DELAY_MINUTES",
        "DC_PRODUCT_REVIEW_TOKEN_EXPIRY_DAYS",
        "DC_WORKFLOW_QUEUE_RUNNER_BATCH_SIZE",
        "DC_WORKFLOW_QUEUE_RUNNER_SCHEDULE",
        "DC_STORE_CORS",
        "DC_ADMIN_CORS",
        "DC_AUTH_CORS",
        "DC_SUPERADMIN_EMAIL",
        "DC_SUPERADMIN_PASSWORD",
        "DC_INITIAL_PUBLISHABLE_KEY_NAME",
        "DC_SETTINGS_ENCRYPTION_KEY",
        "DC_SENTRY_NAME",
        "DC_SENTRY_DSN",
        "DC_SENTRY_TRACES_SAMPLE_RATE",
        "DC_HERBATICA_XML_PATH",
        "DC_HERBATICA_CATEGORIES_XML_PATH",
        "DC_HERBATICA_MANUFACTURERS_CSV_PATH",
        "DC_HERBATICA_REVIEWS_XML_PATH",
        "DC_FEATURE_PPL_ENABLED",
        "DC_PPL_ENVIRONMENT",
        "DC_FEATURE_PACKETA_ENABLED",
        "DC_PACKETA_ENVIRONMENT",
        "DC_NEXT_PUBLIC_PACKETA_WIDGET_API_KEY",
        "DC_FEATURE_PAYMENT_QR_ENABLED",
        "DC_FEATURE_PAYKIT_ENABLED",
        "DC_FEATURE_PAYKIT_GOPAY_ENABLED",
        "DC_FEATURE_PAYKIT_STRIPE_ENABLED",
        "DC_FEATURE_PAYKIT_COMGATE_ENABLED",
        "DC_PAYKIT_DEBUG",
        "DC_GOPAY_CLIENT_ID",
        "DC_GOPAY_CLIENT_SECRET",
        "DC_GOPAY_GO_ID",
        "DC_GOPAY_SANDBOX",
        "DC_GOPAY_WEBHOOK_URL",
        "DC_STRIPE_API_KEY",
        "DC_STRIPE_WEBHOOK_SECRET",
        "DC_COMGATE_MERCHANT",
        "DC_COMGATE_SECRET",
        "DC_COMGATE_SANDBOX",
        "DC_COMGATE_PAYMENT_LABEL",
        "DC_FEATURE_PAYLOAD_ENABLED",
        "DC_IS_IFRAME_PAYLOAD",
        "DC_PAYLOAD_BASE_URL",
        "DC_PAYLOAD_IFRAME_URL",
        "DC_PAYLOAD_API_KEY",
        "DC_PAYLOAD_WEBHOOK_SECRET",
        "DC_CMS_CACHE_TTL",
        "DC_CMS_LIST_CACHE_TTL",
        "DC_PAYLOAD_SSO_PRIVATE_KEY",
        "DC_PAYLOAD_SSO_USER_EMAIL",
        "DC_PAYLOAD_SSO_ISSUER",
        "DC_PAYLOAD_SSO_AUDIENCE",
        "DC_PAYLOAD_SSO_ALG",
        "DC_PAYLOAD_SSO_TOKEN_TTL",
        "DC_MEDUSA_APP_DB_USER",
        "DC_MEDUSA_APP_DB_PASSWORD",
        "DC_MEDUSA_APP_DB_NAME",
        "DC_MEDUSA_APP_DB_SCHEMA",
        "DC_REDIS_URL",
        "DC_MEDUSA_BE_REDIS_SESSIONS_ENABLED",
        "DC_MEDUSA_BE_CACHE_PROVIDER",
        "DC_MEDUSA_BE_EVENT_BUS_PROVIDER",
        "DC_MEDUSA_BE_WORKFLOW_ENGINE_PROVIDER",
        "DC_MEDUSA_BE_LOCKING_PROVIDER",
        "DC_MEDUSA_BE_MEILISEARCH_ENABLED",
        "DC_MEDUSA_BE_FILE_PROVIDER",
        "DC_MEDUSA_BE_FILE_LOCAL_UPLOAD_DIR",
        "DC_MEILISEARCH_HOST",
        "DC_MEILISEARCH_BACKEND_API_KEY",
        "DC_MINIO_FILE_URL",
        "DC_MINIO_REGION",
        "DC_MINIO_ENDPOINT",
        "DC_MINIO_BUCKET",
        "DC_MINIO_ACCESS_KEY",
        "DC_MINIO_SECRET_KEY",
        "DC_MEDUSA_BE_NOTIFICATION_PROVIDER",
        "DC_MEDUSA_BE_RESEND_API_KEY",
        "DC_MEDUSA_BE_RESEND_FROM_EMAIL",
        "DC_MEDUSA_BE_RESEND_WEBHOOK_SECRET",
        "DC_N1_MEDUSA_RESEND_API_KEY",
        "DC_N1_MEDUSA_RESEND_FROM_EMAIL",
        "DC_N1_MEDUSA_RESEND_WEBHOOK_SECRET",
      ],
      command: null,
      dockerfilePath: "./docker/development/medusa-be/Dockerfile",
      env: [
        {
          envVar: "JWT_SECRET",
          source: literalSource(process.env.DC_JWT_SECRET ?? ""),
        },
        {
          envVar: "COOKIE_SECRET",
          source: literalSource(process.env.DC_COOKIE_SECRET ?? ""),
        },
        {
          envVar: "MEDUSA_COOKIE_SECURE",
          source: literalSource(process.env.DC_MEDUSA_COOKIE_SECURE ?? ""),
        },
        {
          envVar: "MEDUSA_COOKIE_SAME_SITE",
          source: literalSource(process.env.DC_MEDUSA_COOKIE_SAME_SITE ?? ""),
        },
        {
          envVar: "MEDUSA_ADMIN_DISABLED_FOR_BACKEND_BUILD",
          source: literalSource(
            process.env.DC_MEDUSA_ADMIN_DISABLED_FOR_BACKEND_BUILD ?? "0",
          ),
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
              "Storefront Publishable Key",
          ),
        },
        {
          envVar: "SETTINGS_ENCRYPTION_KEY",
          source: literalSource(process.env.DC_SETTINGS_ENCRYPTION_KEY ?? ""),
        },
        {
          envVar: "SENTRY_NAME",
          source: literalSource(process.env.DC_SENTRY_NAME ?? ""),
        },
        {
          envVar: "SENTRY_DSN",
          source: literalSource(process.env.DC_SENTRY_DSN ?? ""),
        },
        {
          envVar: "SENTRY_TRACES_SAMPLE_RATE",
          source: literalSource(
            process.env.DC_SENTRY_TRACES_SAMPLE_RATE ?? "0.1",
          ),
        },
        {
          envVar: "STOREFRONT_URL",
          source: process.env.DC_STOREFRONT_URL?.trim()
            ? literalSource(process.env.DC_STOREFRONT_URL.trim())
            : servicePublicOrigins.herbatika,
        },
        {
          envVar: "STORE_NAME",
          source: literalSource(process.env.DC_STORE_NAME ?? "Herbatika"),
        },
        {
          envVar: "PRODUCT_REVIEW_REQUEST_MESSAGE",
          source: literalSource(
            process.env.DC_PRODUCT_REVIEW_REQUEST_MESSAGE ??
              "Napiš recenzi produktu",
          ),
        },
        {
          envVar: "PRODUCT_REVIEW_REQUEST_DELAY_MINUTES",
          source: literalSource(
            process.env.DC_PRODUCT_REVIEW_REQUEST_DELAY_MINUTES ?? "10080",
          ),
        },
        {
          envVar: "PRODUCT_REVIEW_TOKEN_EXPIRY_DAYS",
          source: literalSource(
            process.env.DC_PRODUCT_REVIEW_TOKEN_EXPIRY_DAYS ?? "90",
          ),
        },
        {
          envVar: "WORKFLOW_QUEUE_RUNNER_BATCH_SIZE",
          source: literalSource(
            process.env.DC_WORKFLOW_QUEUE_RUNNER_BATCH_SIZE ?? "500",
          ),
        },
        {
          envVar: "WORKFLOW_QUEUE_RUNNER_SCHEDULE",
          source: literalSource(
            process.env.DC_WORKFLOW_QUEUE_RUNNER_SCHEDULE ?? "0 * * * *",
          ),
        },
        {
          envVar: "HERBATICA_XML_PATH",
          source: literalSource(process.env.DC_HERBATICA_XML_PATH ?? ""),
        },
        {
          envVar: "HERBATICA_CATEGORIES_XML_PATH",
          source: literalSource(
            process.env.DC_HERBATICA_CATEGORIES_XML_PATH ?? "",
          ),
        },
        {
          envVar: "HERBATICA_MANUFACTURERS_CSV_PATH",
          source: literalSource(
            process.env.DC_HERBATICA_MANUFACTURERS_CSV_PATH ?? "",
          ),
        },
        {
          envVar: "HERBATICA_REVIEWS_XML_PATH",
          source: literalSource(
            process.env.DC_HERBATICA_REVIEWS_XML_PATH ?? "",
          ),
        },
        {
          envVar: "FEATURE_PPL_ENABLED",
          source: literalSource(process.env.DC_FEATURE_PPL_ENABLED ?? "0"),
        },
        {
          envVar: "PPL_ENVIRONMENT",
          source: literalSource(process.env.DC_PPL_ENVIRONMENT ?? "testing"),
        },
        {
          envVar: "FEATURE_PACKETA_ENABLED",
          source: literalSource(process.env.DC_FEATURE_PACKETA_ENABLED ?? "0"),
        },
        {
          envVar: "PACKETA_ENVIRONMENT",
          source: literalSource(
            process.env.DC_PACKETA_ENVIRONMENT ?? "testing",
          ),
        },
        {
          envVar: "PACKETA_PICKUP_POINTS_API_KEY",
          source: literalSource(
            process.env.DC_NEXT_PUBLIC_PACKETA_WIDGET_API_KEY ?? "",
          ),
        },
        {
          envVar: "FEATURE_PAYMENT_QR_ENABLED",
          source: literalSource(
            process.env.DC_FEATURE_PAYMENT_QR_ENABLED ?? "0",
          ),
        },
        {
          envVar: "FEATURE_PAYKIT_ENABLED",
          source: literalSource(process.env.DC_FEATURE_PAYKIT_ENABLED ?? "0"),
        },
        {
          envVar: "FEATURE_PAYKIT_GOPAY_ENABLED",
          source: literalSource(
            process.env.DC_FEATURE_PAYKIT_GOPAY_ENABLED ?? "",
          ),
        },
        {
          envVar: "FEATURE_PAYKIT_STRIPE_ENABLED",
          source: literalSource(
            process.env.DC_FEATURE_PAYKIT_STRIPE_ENABLED ?? "",
          ),
        },
        {
          envVar: "FEATURE_PAYKIT_COMGATE_ENABLED",
          source: literalSource(
            process.env.DC_FEATURE_PAYKIT_COMGATE_ENABLED ?? "",
          ),
        },
        {
          envVar: "PAYKIT_DEBUG",
          source: literalSource(process.env.DC_PAYKIT_DEBUG ?? "0"),
        },
        {
          envVar: "GOPAY_CLIENT_ID",
          source: literalSource(process.env.DC_GOPAY_CLIENT_ID ?? ""),
        },
        {
          envVar: "GOPAY_CLIENT_SECRET",
          source: literalSource(process.env.DC_GOPAY_CLIENT_SECRET ?? ""),
        },
        {
          envVar: "GOPAY_GO_ID",
          source: literalSource(process.env.DC_GOPAY_GO_ID ?? ""),
        },
        {
          envVar: "GOPAY_SANDBOX",
          source: literalSource(process.env.DC_GOPAY_SANDBOX ?? "true"),
        },
        {
          envVar: "GOPAY_WEBHOOK_URL",
          source: literalSource(goPayWebhookUrl),
        },
        {
          envVar: "STRIPE_API_KEY",
          source: literalSource(process.env.DC_STRIPE_API_KEY ?? ""),
        },
        {
          envVar: "STRIPE_WEBHOOK_SECRET",
          source: literalSource(process.env.DC_STRIPE_WEBHOOK_SECRET ?? ""),
        },
        {
          envVar: "COMGATE_MERCHANT",
          source: literalSource(process.env.DC_COMGATE_MERCHANT ?? ""),
        },
        {
          envVar: "COMGATE_SECRET",
          source: literalSource(process.env.DC_COMGATE_SECRET ?? ""),
        },
        {
          envVar: "COMGATE_SANDBOX",
          source: literalSource(process.env.DC_COMGATE_SANDBOX ?? "true"),
        },
        {
          envVar: "COMGATE_PAYMENT_LABEL",
          source: literalSource(process.env.DC_COMGATE_PAYMENT_LABEL ?? ""),
        },
        {
          envVar: "FEATURE_PAYLOAD_ENABLED",
          source: literalSource(process.env.DC_FEATURE_PAYLOAD_ENABLED ?? "0"),
        },
        {
          envVar: "IS_IFRAME_PAYLOAD",
          source: literalSource(process.env.DC_IS_IFRAME_PAYLOAD ?? "true"),
        },
        {
          envVar: "PAYLOAD_BASE_URL",
          source: serviceInternalOriginSource({
            port: 8083,
            serviceSlug: payloadSlug,
          }),
        },
        { envVar: "PAYLOAD_IFRAME_URL", source: servicePublicOrigins.payload },
        {
          envVar: "CMS_CACHE_TTL",
          source: literalSource(process.env.DC_CMS_CACHE_TTL ?? "3600"),
        },
        {
          envVar: "CMS_LIST_CACHE_TTL",
          source: literalSource(process.env.DC_CMS_LIST_CACHE_TTL ?? "600"),
        },
        {
          envVar: "PAYLOAD_SSO_TOKEN_TTL",
          source: literalSource(process.env.DC_PAYLOAD_SSO_TOKEN_TTL ?? "60"),
        },
        { envVar: "DATABASE_TYPE", source: literalSource("postgres") },
        {
          envVar: "DATABASE_URL",
          source: literalSource(
            "postgresql://{{env.MEDUSA_APP_DB_USER}}:{{env.MEDUSA_APP_DB_PASSWORD}}@{{env.MEDUSA_DB_HOST}}:5432/{{env.MEDUSA_APP_DB_NAME}}?sslmode=disable&options=-csearch_path%3D{{env.MEDUSA_APP_DB_SCHEMA}}%2Cpg_catalog",
          ),
        },
        {
          envVar: "REDIS_URL",
          source: literalSource(
            "redis://:{{env.MEDUSA_VALKEY_PASSWORD}}@{{env.MEDUSA_VALKEY_HOST}}:6379",
          ),
        },
        {
          envVar: "MEILISEARCH_HOST",
          source: literalSource("http://{{env.MEDUSA_MEILISEARCH_HOST}}:7700"),
        },
        { envVar: "MINIO_FILE_URL", source: minioFileSource },
        {
          envVar: "MINIO_ENDPOINT",
          source: serviceInternalOriginSource({
            port: 9004,
            serviceSlug: minioSlug,
            trailingSlash: true,
          }),
        },
        {
          envVar: "NOTIFICATION_PROVIDER",
          source: literalSource(
            process.env.DC_MEDUSA_BE_NOTIFICATION_PROVIDER ?? "resend",
          ),
        },
        {
          envVar: "RESEND_API_KEY",
          source: literalSource(
            firstNonEmpty(
              process.env.DC_MEDUSA_BE_RESEND_API_KEY,
              process.env.DC_RESEND_API_KEY,
            ) ?? "",
          ),
        },
        {
          envVar: "RESEND_FROM_EMAIL",
          source: literalSource(
            firstNonEmpty(
              process.env.DC_MEDUSA_BE_RESEND_FROM_EMAIL,
              process.env.DC_RESEND_FROM_EMAIL,
            ) ?? "",
          ),
        },
        {
          envVar: "RESEND_WEBHOOK_SECRET",
          source: literalSource(
            firstNonEmpty(
              process.env.DC_MEDUSA_BE_RESEND_WEBHOOK_SECRET,
              process.env.DC_RESEND_WEBHOOK_SECRET,
            ) ?? "",
          ),
        },
      ],
      healthcheck: {
        associated_port: 9000,
        interval_seconds: 10,
        timeout_seconds: 120,
        type: "PATH",
        value: "/app",
      },
      resourceLimits: { cpus: 1, memory: { unit: "MEGABYTES", value: 2048 } },
      urls: [
        {
          associated_port: 9000,
          base_path: "/",
          domain: medusaBePublicDomain ?? "",
          strip_prefix: true,
        },
      ].filter((url) => url.domain),
      volumes: [],
    },
    payload: {
      buildContextDir: "./",
      cleanupEnvKeys: [
        "DC_NODE_ENV",
        "DC_PAYLOAD_API_KEY",
        "DC_PAYLOAD_BASE_URL",
        "DC_PAYLOAD_WEBHOOK_SECRET",
        "DC_FEATURE_PAYLOAD_ARTICLES_ENABLED",
        "DC_FEATURE_PAYLOAD_PAGES_ENABLED",
        "DC_FEATURE_PAYLOAD_HERO_CAROUSELS_ENABLED",
        "DC_FE_MEDUSA_BACKEND_URL",
        "DC_PAYLOAD_DATABASE_USER",
        "DC_PAYLOAD_DATABASE_PASSWORD",
        "DC_PAYLOAD_DATABASE_SCHEMA_NAME",
        "DC_PAYLOAD_DATABASE_URL",
        "DC_PAYLOAD_SECRET",
        "DC_PAYLOAD_LOCALES",
        "DC_PAYLOAD_S3_ENDPOINT",
        "DC_PAYLOAD_S3_REGION",
        "DC_PAYLOAD_S3_BUCKET",
        "DC_PAYLOAD_S3_ACCESS_KEY_ID",
        "DC_PAYLOAD_S3_SECRET_ACCESS_KEY",
        "DC_PAYLOAD_SSO_ALG",
        "DC_PAYLOAD_SSO_ALLOWED_ORIGINS",
        "DC_PAYLOAD_SSO_AUDIENCE",
        "DC_PAYLOAD_SSO_ISSUER",
        "DC_PAYLOAD_SSO_PRIVATE_KEY",
        "DC_PAYLOAD_SSO_PUBLIC_KEY",
        "DC_PAYLOAD_SSO_USER_EMAIL",
        "DC_OPENAI_API_KEY",
      ],
      command: null,
      dockerfilePath: "./docker/development/payload/Dockerfile",
      env: [
        {
          envVar: "DATABASE_URL",
          source: literalSource(
            "postgresql://{{env.PAYLOAD_DB_USER}}:{{env.PAYLOAD_DB_PASSWORD}}@{{env.MEDUSA_DB_HOST}}:5432/{{env.MEDUSA_APP_DB_NAME}}?sslmode=disable&options=-csearch_path%3D{{env.PAYLOAD_DB_SCHEMA}}%2Cpg_catalog",
          ),
        },
        {
          envVar: "PAYLOAD_SECRET",
          source: literalSource(
            process.env.DC_PAYLOAD_SECRET ?? "payload_secret_change_me",
          ),
        },
        { envVar: "PAYLOAD_BASE_URL", source: servicePublicOrigins.payload },
        {
          envVar: "MEDUSA_BACKEND_URL",
          source: serviceInternalOriginSource({
            port: 9000,
            serviceSlug: medusaBeSlug,
          }),
        },
        {
          envVar: "FEATURE_PAYLOAD_ARTICLES_ENABLED",
          source: literalSource(
            process.env.DC_FEATURE_PAYLOAD_ARTICLES_ENABLED ?? "1",
          ),
        },
        {
          envVar: "FEATURE_PAYLOAD_PAGES_ENABLED",
          source: literalSource(
            process.env.DC_FEATURE_PAYLOAD_PAGES_ENABLED ?? "1",
          ),
        },
        {
          envVar: "FEATURE_PAYLOAD_HERO_CAROUSELS_ENABLED",
          source: literalSource(
            process.env.DC_FEATURE_PAYLOAD_HERO_CAROUSELS_ENABLED ?? "1",
          ),
        },
        {
          envVar: "PAYLOAD_LOCALES",
          source: literalSource(process.env.DC_PAYLOAD_LOCALES ?? "cs,sk,en"),
        },
        {
          envVar: "PAYLOAD_SSO_PUBLIC_KEY",
          source: literalSource(process.env.DC_PAYLOAD_SSO_PUBLIC_KEY ?? ""),
        },
        {
          envVar: "PAYLOAD_SSO_ALLOWED_ORIGINS",
          source: literalSource(context.adminCors),
        },
        {
          envVar: "OPENAI_API_KEY",
          source: literalSource(process.env.DC_OPENAI_API_KEY ?? ""),
        },
        {
          envVar: "S3_ENDPOINT",
          source: serviceInternalOriginSource({
            port: 9004,
            serviceSlug: minioSlug,
          }),
        },
      ],
      healthcheck: {
        associated_port: 8083,
        interval_seconds: 30,
        timeout_seconds: 120,
        type: "PATH",
        value: "/api/health",
      },
      resourceLimits: {
        cpus: 0.75,
        memory: { unit: "MEGABYTES", value: 1536 },
      },
      urls: [
        {
          associated_port: 8083,
          base_path: "/",
          domain:
            publicServiceDomain({
              projectSlug: context.projectSlug,
              publicDomain: context.publicDomain,
              publicUrlAffix: context.publicUrlAffix,
              serviceSlug: payloadSlug,
            }) ?? "",
          strip_prefix: true,
        },
      ].filter((url) => url.domain),
      volumes: [],
    },
    herbatika: {
      buildContextDir: "./",
      cleanupEnvKeys: [
        "MEILISEARCH_HOST",
        "MEILISEARCH_SEARCH_API_KEY",
        "MEILISEARCH_PRODUCTS_INDEX",
        "MEILISEARCH_CATEGORIES_INDEX",
        "MEILISEARCH_PRODUCERS_INDEX",
        "DC_HERBATIKA_PUBLIC_PORT",
        "DC_HERBATIKA_NEXT_PUBLIC_STOREFRONT_AUTH_MODE",
        "DC_HERBATIKA_MEDUSA_BACKEND_URL_INTERNAL",
        "DC_HERBATIKA_NEXT_PUBLIC_MEDUSA_BACKEND_URL",
        "DC_HERBATIKA_NEXT_PUBLIC_PACKETA_WIDGET_COUNTRIES",
        "DC_HERBATIKA_NEXT_PUBLIC_PACKETA_WIDGET_API_KEY",
        "DC_HERBATIKA_NEXT_PUBLIC_PPL_WIDGET_API_KEY",
        "DC_HERBATIKA_NEXT_PUBLIC_PAYLOAD_BASE_URL",
        "DC_HERBATIKA_NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
      ],
      command: null,
      dockerfilePath: "./docker/development/herbatika/Dockerfile",
      env: [
        {
          envVar: "MEDUSA_BACKEND_URL_INTERNAL",
          source: serviceInternalOriginSource({
            port: 9000,
            serviceSlug: medusaBeSlug,
          }),
        },
        {
          envVar: "NEXT_PUBLIC_MEDUSA_BACKEND_URL",
          source: servicePublicOrigins.medusaBe,
        },
        {
          envVar: "NEXT_PUBLIC_STOREFRONT_AUTH_MODE",
          source: literalSource(
            process.env.DC_HERBATIKA_NEXT_PUBLIC_STOREFRONT_AUTH_MODE ??
              "session_proxy",
          ),
        },
        {
          envVar: "NEXT_PUBLIC_PACKETA_WIDGET_COUNTRIES",
          source: literalSource(
            process.env.DC_HERBATIKA_NEXT_PUBLIC_PACKETA_WIDGET_COUNTRIES ??
              "sk",
          ),
        },
        {
          envVar: "NEXT_PUBLIC_PACKETA_WIDGET_API_KEY",
          source: literalSource(
            process.env.DC_HERBATIKA_NEXT_PUBLIC_PACKETA_WIDGET_API_KEY ?? "",
          ),
        },
        {
          envVar: "NEXT_PUBLIC_PPL_WIDGET_API_KEY",
          source: literalSource(
            process.env.DC_HERBATIKA_NEXT_PUBLIC_PPL_WIDGET_API_KEY ?? "",
          ),
        },
        {
          envVar: "NEXT_PUBLIC_PAYLOAD_BASE_URL",
          source: servicePublicOrigins.payload,
        },
      ],
      healthcheck: {
        associated_port: 3000,
        interval_seconds: 30,
        timeout_seconds: 120,
        type: "PATH",
        value: "/",
      },
      resourceLimits: {
        cpus: 0.75,
        memory: { unit: "MEGABYTES", value: 1536 },
      },
      urls: [
        {
          associated_port: 3000,
          base_path: "/",
          domain:
            publicServiceDomain({
              projectSlug: context.projectSlug,
              publicDomain: context.publicDomain,
              publicUrlAffix: context.publicUrlAffix,
              serviceSlug: herbatikaSlug,
            }) ?? "",
          strip_prefix: true,
        },
      ].filter((url) => url.domain),
      volumes: [],
    },
    ...(n1Slug
      ? {
          n1: {
            buildContextDir: "./",
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
              "DC_N1_RESEND_API_KEY",
              "DC_N1_CONTACT_EMAIL",
              "DC_N1_RESEND_FROM_EMAIL",
              "DC_N1_MEDUSA_RESEND_API_KEY",
              "DC_N1_MEDUSA_CONTACT_EMAIL",
              "DC_N1_MEDUSA_RESEND_FROM_EMAIL",
            ],
            command: null,
            dockerfilePath: "./docker/development/n1/Dockerfile",
            env: [
              {
                envVar: "MEDUSA_BACKEND_URL_INTERNAL",
                source: serviceInternalOriginSource({
                  port: 9000,
                  serviceSlug: medusaBeSlug,
                }),
              },
              {
                envVar: "NEXT_PUBLIC_MEDUSA_BACKEND_URL",
                source: servicePublicOrigins.medusaBe,
              },
              {
                envVar: "NEXT_PUBLIC_MEILISEARCH_URL",
                source: servicePublicOrigins.meilisearch,
              },
              {
                envVar: "NEXT_PUBLIC_SITE_URL",
                source: servicePublicOriginSource(n1Slug),
              },
              {
                envVar: "NEXT_PUBLIC_META_PIXEL_ID",
                source: literalSource(
                  process.env.DC_N1_NEXT_PUBLIC_META_PIXEL_ID ?? "",
                ),
              },
              {
                envVar: "NEXT_PUBLIC_GOOGLE_ADS_ID",
                source: literalSource(
                  process.env.DC_N1_NEXT_PUBLIC_GOOGLE_ADS_ID ?? "",
                ),
              },
              {
                envVar: "NEXT_PUBLIC_HEUREKA_API_KEY",
                source: literalSource(
                  process.env.DC_N1_NEXT_PUBLIC_HEUREKA_API_KEY ?? "",
                ),
              },
              {
                envVar: "NEXT_PUBLIC_LEADHUB_TRACKING_ID",
                source: literalSource(
                  process.env.DC_N1_NEXT_PUBLIC_LEADHUB_TRACKING_ID ?? "",
                ),
              },
              {
                envVar: "RESEND_API_KEY",
                source: literalSource(
                  firstNonEmpty(
                    process.env.DC_N1_RESEND_API_KEY,
                    process.env.DC_RESEND_API_KEY,
                  ) ?? "",
                ),
              },
              {
                envVar: "CONTACT_EMAIL",
                source: literalSource(
                  firstNonEmpty(
                    process.env.DC_N1_CONTACT_EMAIL,
                    process.env.DC_CONTACT_EMAIL,
                  ) ?? "",
                ),
              },
              {
                envVar: "RESEND_FROM_EMAIL",
                source: literalSource(
                  firstNonEmpty(
                    process.env.DC_N1_RESEND_FROM_EMAIL,
                    process.env.DC_RESEND_FROM_EMAIL,
                  ) ?? "",
                ),
              },
            ],
            healthcheck: {
              associated_port: 3000,
              interval_seconds: 30,
              timeout_seconds: 120,
              type: "PATH",
              value: "/api/health",
            },
            resourceLimits: {
              cpus: 0.75,
              memory: { unit: "MEGABYTES", value: 1536 },
            },
            urls: [
              {
                associated_port: 3000,
                base_path: "/",
                domain:
                  publicServiceDomain({
                    projectSlug: context.projectSlug,
                    publicDomain: context.publicDomain,
                    publicUrlAffix: context.publicUrlAffix,
                    serviceSlug: n1Slug,
                  }) ?? "",
                strip_prefix: true,
              },
            ].filter((url) => url.domain),
            volumes: [],
          },
        }
      : {}),
    "zane-operator": {
      buildContextDir: "./",
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
      command: null,
      dockerfilePath: "./docker/development/zane-operator/Dockerfile",
      env: [
        { envVar: "PORT", source: literalSource("8080") },
        {
          envVar: "API_AUTH_TOKEN",
          source: literalSource(
            process.env.DC_ZANE_OPERATOR_API_AUTH_TOKEN ?? "",
          ),
        },
        { envVar: "PGPORT", source: literalSource("5432") },
        {
          envVar: "PGUSER",
          source: literalSource(
            process.env.DC_ZANE_OPERATOR_PGUSER ?? "zane_operator",
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
            process.env.DC_ZANE_OPERATOR_DB_TEMPLATE_NAME ?? "template_medusa",
          ),
        },
        {
          envVar: "DB_PREVIEW_PREFIX",
          source: literalSource(
            process.env.DC_ZANE_OPERATOR_DB_PREVIEW_PREFIX ?? "medusa_pr_",
          ),
        },
        {
          envVar: "DB_PREVIEW_APP_USER_PREFIX",
          source: literalSource(
            process.env.DC_ZANE_OPERATOR_DB_PREVIEW_APP_USER_PREFIX ??
              "medusa_pr_app_",
          ),
        },
        {
          envVar: "DB_PREVIEW_DEV_ROLE",
          source: literalSource(
            process.env.DC_MEDUSA_DEV_DB_USER ?? "medusa_dev",
          ),
        },
        {
          envVar: "DB_PREVIEW_APP_PASSWORD_SECRET",
          source: literalSource(
            process.env.DC_ZANE_OPERATOR_DB_PREVIEW_APP_PASSWORD_SECRET ?? "",
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
            context.operatorUpstreamConnectHostHeader ?? "",
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
      healthcheck: {
        associated_port: 8080,
        interval_seconds: 30,
        timeout_seconds: 60,
        type: "PATH",
        value: "/healthz",
      },
      resourceLimits: { cpus: 0.25, memory: { unit: "MEGABYTES", value: 256 } },
      urls: [
        {
          associated_port: 8080,
          base_path: "/",
          domain:
            publicServiceDomain({
              projectSlug: context.projectSlug,
              publicDomain: context.publicDomain,
              publicUrlAffix: context.publicUrlAffix,
              serviceSlug: "zane-operator",
            }) ?? "",
          strip_prefix: true,
        },
      ].filter((url) => url.domain),
      volumes: [],
    },
  }
}

function resolveOperatorUpstreamBaseUrl(input: {
  candidate?: string | undefined
  appDomain?: string | undefined | null
}): string | null {
  if (input.candidate && !isLoopbackUrl(input.candidate)) {
    return input.candidate
  }

  return input.appDomain ? `https://${input.appDomain}` : null
}

function buildContext(input: {
  planInput: BootstrapZaneProjectPlanCommandInput
  settings: {
    root_domain?: string | undefined | null
    app_domain?: string | undefined | null
  }
  repositoryUrl: string
  branchName: string
}): ZaneProjectContext {
  const publicDomain =
    input.planInput.publicDomain ?? input.settings.root_domain ?? null
  const operatorUpstreamBaseUrlCandidate = normalizeOriginUrl(
    firstNonEmpty(
      input.planInput.operatorUpstreamZaneBaseUrl,
      process.env.DC_ZANE_OPERATOR_ZANE_BASE_URL,
    ),
  )
  const operatorUpstreamBaseUrl = resolveOperatorUpstreamBaseUrl({
    appDomain: input.settings.app_domain,
    candidate: operatorUpstreamBaseUrlCandidate,
  })
  const connectBaseUrl = normalizeOriginUrl(
    firstNonEmpty(
      input.planInput.operatorUpstreamZaneConnectBaseUrl,
      process.env.DC_ZANE_OPERATOR_ZANE_CONNECT_BASE_URL,
      input.settings.root_domain === "127-0-0-1.sslip.io"
        ? "http://zane-app"
        : undefined,
    ),
  )
  const connectHostHeader =
    firstNonEmpty(
      input.planInput.operatorUpstreamZaneConnectHostHeader,
      process.env.DC_ZANE_OPERATOR_ZANE_CONNECT_HOST_HEADER,
    ) ??
    (connectBaseUrl && input.settings.app_domain
      ? input.settings.app_domain
      : null)

  return {
    adminCors: preferExplicitOrMergeCsv({
      envValue: process.env.DC_ADMIN_CORS,
      explicitValue: input.planInput.adminCorsOverride,
      fallbackValue: publicDomain
        ? `https://${input.planInput.projectSlug}-medusa-be${input.planInput.publicUrlAffix}.${publicDomain}`
        : "https://pending-public-domain.invalid",
    }),
    authCors: preferExplicitOrMergeCsv({
      envValue: process.env.DC_AUTH_CORS,
      explicitValue: input.planInput.authCorsOverride,
      fallbackValue: publicDomain
        ? `https://${input.planInput.projectSlug}-medusa-be${input.planInput.publicUrlAffix}.${publicDomain}`
        : "https://pending-public-domain.invalid",
    }),
    branchName: input.branchName,
    environmentName: input.planInput.environmentName,
    gitAppId: input.planInput.gitAppId?.trim() || null,
    minioFileUrlOverride: input.planInput.minioFileUrlOverride?.trim() || null,
    operatorUpstreamBaseUrl,
    operatorUpstreamConnectBaseUrl: connectBaseUrl ?? null,
    operatorUpstreamConnectHostHeader: connectHostHeader,
    operatorUpstreamPassword:
      input.planInput.operatorUpstreamZanePassword ??
      process.env.DC_ZANE_OPERATOR_ZANE_PASSWORD ??
      "",
    operatorUpstreamUsername:
      input.planInput.operatorUpstreamZaneUsername ??
      process.env.DC_ZANE_OPERATOR_ZANE_USERNAME ??
      "",
    projectDescription: input.planInput.projectDescription,
    projectSlug: input.planInput.projectSlug,
    publicDomain,
    publicUrlAffix: input.planInput.publicUrlAffix,
    repositoryUrl: input.repositoryUrl,
    storeCors: preferExplicitOrMergeCsv({
      envValue: process.env.DC_STORE_CORS,
      explicitValue: input.planInput.storeCorsOverride,
      fallbackValue: publicDomain
        ? `https://${input.planInput.projectSlug}-herbatika${input.planInput.publicUrlAffix}.${publicDomain}`
        : "https://pending-public-domain.invalid",
    }),
  }
}

interface BootstrapRequiredValueCheck {
  label: string
  value: string | null | undefined
  placeholderValues?: string[] | undefined
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
      `Environment ${input.context.environmentName} is missing and must exist before bootstrap sync.`,
    )
  }

  if (!input.context.publicDomain) {
    reasons.push(
      "Public domain could not be derived from input or Zane settings.",
    )
  }

  for (const [serviceId, serviceState] of Object.entries(
    input.inspectedServices,
  )) {
    const serviceType = serviceState.details?.type ?? null
    const isGitServiceType =
      serviceType === "git" || serviceType === "GIT_REPOSITORY"
    if (serviceState.exists && !isGitServiceType) {
      reasons.push(
        `Service ${serviceId} already exists but is not a Git service and cannot be reconciled by this bootstrap flow.`,
      )
    }
  }

  if (input.phase === "services") {
    return reasons
  }

  if (!input.context.operatorUpstreamBaseUrl) {
    reasons.push(
      "zane-operator upstream Zane base URL could not be derived from input or Zane settings.",
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
      missingMessage: "could not be resolved for bootstrap.",
      placeholderMessage:
        "is still set to a placeholder value and must be replaced before bootstrap.",
    }),
  )

  const aliasChecks: {
    serviceId: string
    field: "network_alias" | "global_network_alias"
  }[] = [
    { field: "global_network_alias", serviceId: "medusa-db" },
    { field: "network_alias", serviceId: "medusa-valkey" },
    { field: "network_alias", serviceId: "medusa-meilisearch" },
    { field: "network_alias", serviceId: "medusa-minio" },
    { field: "network_alias", serviceId: "medusa-be" },
    { field: "network_alias", serviceId: "payload" },
  ]
  for (const aliasCheck of aliasChecks) {
    const details = input.inspectedServices[aliasCheck.serviceId]?.details
    if (!details?.[aliasCheck.field]) {
      reasons.push(
        `Service ${aliasCheck.serviceId} is missing ${aliasCheck.field} required for bootstrap env resolution.`,
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
        placeholderValues: ["medusa_app_change_me"],
        value: process.env.DC_MEDUSA_APP_DB_PASSWORD,
      },
      {
        label: "DC_VALKEY_PASSWORD",
        placeholderValues: ["valkey_dev_change_me"],
        value: process.env.DC_VALKEY_PASSWORD,
      },
      {
        label: "DC_MINIO_ACCESS_KEY",
        placeholderValues: ["medusaappkey"],
        value: process.env.DC_MINIO_ACCESS_KEY,
      },
      {
        label: "DC_MINIO_SECRET_KEY",
        placeholderValues: ["medusaappsecret_change_me"],
        value: process.env.DC_MINIO_SECRET_KEY,
      },
      {
        label: "DC_MEILISEARCH_MASTER_KEY",
        value: process.env.DC_MEILISEARCH_MASTER_KEY,
      },
      {
        label: "DC_MEDUSA_DEV_DB_PASSWORD",
        placeholderValues: ["medusa_dev_change_me"],
        value: process.env.DC_MEDUSA_DEV_DB_PASSWORD,
      },
      {
        label: "DC_MINIO_ROOT_USER",
        placeholderValues: ["minioadmin"],
        value: process.env.DC_MINIO_ROOT_USER,
      },
      {
        label: "DC_MINIO_ROOT_PASSWORD",
        placeholderValues: ["minioadmin"],
        value: process.env.DC_MINIO_ROOT_PASSWORD,
      },
      {
        label: "DC_JWT_SECRET",
        placeholderValues: ["supersecret"],
        value: process.env.DC_JWT_SECRET,
      },
      {
        label: "DC_COOKIE_SECRET",
        placeholderValues: ["supersecret"],
        value: process.env.DC_COOKIE_SECRET,
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
      {
        label: "DC_PAYLOAD_API_KEY",
        placeholderValues: ["payload_dev_api_key_change_me"],
        value: process.env.DC_PAYLOAD_API_KEY,
      },
      {
        label: "DC_PAYLOAD_WEBHOOK_SECRET",
        placeholderValues: ["payload_webhook_secret_change_me"],
        value: process.env.DC_PAYLOAD_WEBHOOK_SECRET,
      },
      {
        label: "DC_PAYLOAD_SECRET",
        placeholderValues: ["payload_secret_change_me"],
        value: process.env.DC_PAYLOAD_SECRET,
      },
      {
        label: "DC_PAYLOAD_DATABASE_PASSWORD",
        placeholderValues: ["payload"],
        value: process.env.DC_PAYLOAD_DATABASE_PASSWORD,
      },
      {
        label: "DC_PAYLOAD_SSO_PRIVATE_KEY",
        value: process.env.DC_PAYLOAD_SSO_PRIVATE_KEY,
      },
      {
        label: "DC_PAYLOAD_SSO_PUBLIC_KEY",
        value: process.env.DC_PAYLOAD_SSO_PUBLIC_KEY,
      },
      {
        label: "DC_PAYLOAD_SSO_USER_EMAIL",
        value: process.env.DC_PAYLOAD_SSO_USER_EMAIL,
      },
    ],
    missingMessage:
      "is empty; bootstrap will continue, but the value should be filled before relying on the deployed service.",
    placeholderMessage:
      "is still set to a placeholder value; bootstrap will continue, but the value should be replaced.",
  })
}

function interpolateSharedValues(
  value: string,
  sharedEnv: Record<string, string>,
): string {
  return value.replaceAll(
    /\{\{env\.([A-Z0-9_]+)\}\}/g,
    (_match, key) => sharedEnv[key] ?? "",
  )
}

// source resolution intentionally keeps all supported source kinds in one switch.
function resolveSharedSourceValue(input: {
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
    (service) => service.details?.slug === source.service_slug,
  )
  const serviceDetails = serviceState?.details
  if (!serviceDetails) {
    return ""
  }

  switch (source.kind) {
    case "service_network_alias": {
      return serviceDetails.network_alias ?? ""
    }
    case "service_global_network_alias": {
      return serviceDetails.global_network_alias ?? ""
    }
    case "service_public_origin": {
      const domain = publicServiceDomain({
        projectSlug: context.projectSlug,
        publicDomain: context.publicDomain,
        publicUrlAffix: context.publicUrlAffix,
        serviceSlug: source.service_slug ?? "",
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
    default: {
      return ""
    }
  }
}

function renderSharedEnvReference(key: string | undefined): string {
  return key ? placeholderSharedValue(key) : ""
}

// source resolution intentionally keeps all supported source kinds in one switch.
function resolveServiceSourceValue(input: {
  source: BootstrapValueSource
  context: ZaneProjectContext
  inspectedServices: Record<string, InspectedServiceState>
}): string {
  const { source, context, inspectedServices } = input
  if (source.kind === "literal") {
    return source.value ?? ""
  }

  const serviceState = Object.values(inspectedServices).find(
    (service) => service.details?.slug === source.service_slug,
  )
  const serviceDetails = serviceState?.details
  if (!serviceDetails) {
    return ""
  }

  switch (source.kind) {
    case "service_network_alias": {
      return serviceDetails.network_alias ?? ""
    }
    case "service_global_network_alias": {
      return serviceDetails.global_network_alias ?? ""
    }
    case "service_public_origin": {
      const domain = publicServiceDomain({
        projectSlug: context.projectSlug,
        publicDomain: context.publicDomain,
        publicUrlAffix: context.publicUrlAffix,
        serviceSlug: source.service_slug ?? "",
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
      const bucketReference = renderSharedEnvReference(
        source.bucket_shared_env_key,
      )
      return alias && source.port && bucketReference
        ? `http://${alias}:${source.port}/${bucketReference}`
        : ""
    }
    default: {
      return ""
    }
  }
}

function resolveSharedEnv(
  variables: PlannedSharedEnvVariable[],
  context: ZaneProjectContext,
  inspectedServices: Record<string, InspectedServiceState>,
): Record<string, string> {
  const sharedEnv: Record<string, string> = {}
  for (const variable of variables) {
    sharedEnv[variable.key] = resolveSharedSourceValue({
      context,
      inspectedServices,
      sharedEnv,
      source: variable.source,
    })
  }
  return sharedEnv
}

function resolveServiceEnv(
  env: PlannedServiceEnvVariable[],
  context: ZaneProjectContext,
  inspectedServices: Record<string, InspectedServiceState>,
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const envVar of env) {
    result[envVar.envVar] = resolveServiceSourceValue({
      context,
      inspectedServices,
      source: envVar.source,
    })
  }
  return result
}

export async function executeBootstrapZaneProjectPlan(
  input: BootstrapZaneProjectPlanCommandInput,
) {
  const { manifest, stackInputs } = await loadDeployContracts(
    input.stackManifestPath,
    input.stackInputsPath,
  )
  const repositoryUrl = await deriveRepositoryUrl(input.repositoryUrl)
  const branchName = await deriveBranchName(input.branchName)
  const inspectResponse = bootstrapZaneProjectInspectResponseSchema.parse(
    await readJsonFile(input.inspectJsonPath),
  )
  const inspectedServiceSlugs = new Set(
    inspectResponse.services.map((service) => service.service_slug),
  )
  const bootstrapServices = manifest.services.flatMap((service) =>
    service.ci.zane && inspectedServiceSlugs.has(service.ci.zane.service_slug)
      ? [getZaneService(manifest, service.id)]
      : [],
  )
  const context = buildContext({
    branchName,
    planInput: input,
    repositoryUrl,
    settings: inspectResponse.settings,
  })
  const serviceSlugById = Object.fromEntries(
    bootstrapServices.map((service) => [service.id, service.serviceSlug]),
  ) as Record<string, string>
  const plannedServices = buildZaneProjectServices(context, serviceSlugById)
  applySharedEnvServiceTargets({ plannedServices, stackInputs })
  const inspectedServices = Object.fromEntries(
    bootstrapServices.map((service) => {
      const inspected = inspectResponse.services.find(
        (candidate) => candidate.service_slug === service.serviceSlug,
      )

      return [
        service.id,
        {
          details: inspected?.details ?? null,
          exists: inspected?.exists ?? false,
        },
      ]
    }),
  ) as Record<string, InspectedServiceState>
  const blockingReasons = buildBlockingReasons({
    context,
    environmentExists: inspectResponse.environment_exists,
    inspectedServices,
    phase: input.phase,
    projectExists: inspectResponse.project_exists,
  })
  const warnings = buildWarningReasons()
  const sharedEnvVariables = buildSharedEnvVariables(
    serviceSlugById,
    stackInputs,
  )
  const resolvedSharedEnv =
    input.phase === "services"
      ? {}
      : resolveSharedEnv(sharedEnvVariables, context, inspectedServices)

  return bootstrapZaneProjectPlanResponseSchema.parse({
    blocking_reasons: blockingReasons,
    branch_name: context.branchName,
    ensure_project: !inspectResponse.project_exists,
    environment_exists: inspectResponse.environment_exists,
    environment_name: context.environmentName,
    git_app_id: context.gitAppId,
    operator_upstream: {
      base_url: context.operatorUpstreamBaseUrl,
      connect_base_url: context.operatorUpstreamConnectBaseUrl,
      connect_host_header: context.operatorUpstreamConnectHostHeader,
    },
    phase: input.phase,
    project_description: context.projectDescription,
    project_exists: inspectResponse.project_exists,
    project_slug: context.projectSlug,
    public_domain: context.publicDomain,
    public_url_affix: context.publicUrlAffix,
    repository_url: context.repositoryUrl,
    services: bootstrapServices.map((service) => {
      const servicePlan = plannedServices[service.id]
      const serviceState = inspectedServices[service.id]
      if (!servicePlan) {
        throw new Error(`Missing bootstrap service plan for ${service.id}.`)
      }
      if (!serviceState) {
        throw new Error(
          `Missing inspected bootstrap service state for ${service.id}.`,
        )
      }
      const managedPublicDomains = servicePlan.urls
        .map((url) => url.domain)
        .filter((value): value is string => Boolean(value))
      const desiredEnv =
        input.phase === "services"
          ? {}
          : resolveServiceEnv(servicePlan.env, context, inspectedServices)

      return {
        build_context_dir: servicePlan.buildContextDir,
        cleanup_env_keys: servicePlan.cleanupEnvKeys,
        create_service: !serviceState.exists,
        desired_builder: {
          build_context_dir: servicePlan.buildContextDir,
          dockerfile_path: servicePlan.dockerfilePath,
        },
        desired_command: servicePlan.command,
        desired_env: desiredEnv,
        desired_git_source: {
          branch_name: context.branchName,
          git_app_id: context.gitAppId,
          repository_url: context.repositoryUrl,
        },
        desired_healthcheck: servicePlan.healthcheck,
        desired_resource_limits: {
          cpus: servicePlan.resourceLimits.cpus,
          memory: servicePlan.resourceLimits.memory,
        },
        desired_urls: servicePlan.urls,
        desired_volumes: servicePlan.volumes,
        dockerfile_path: servicePlan.dockerfilePath,
        env_keys: servicePlan.env.map((envVar) => envVar.envVar),
        env_sources: servicePlan.env.map((envVar) =>
          summarizeSource({ envVar: envVar.envVar, source: envVar.source }),
        ),
        exists: serviceState.exists,
        has_command: Boolean(servicePlan.command),
        healthcheck: servicePlan.healthcheck,
        managed_public_domains: managedPublicDomains,
        resource_limits: {
          cpus: servicePlan.resourceLimits.cpus,
          memory_mb: servicePlan.resourceLimits.memory?.value ?? null,
        },
        service_id: service.id,
        service_slug: service.serviceSlug,
        service_type: serviceState.details?.type ?? null,
        volume_names: servicePlan.volumes.map((volume) => volume.name),
      }
    }),
    settings: inspectResponse.settings,
    shared_env: resolvedSharedEnv,
    shared_env_cleanup_keys: [...sharedEnvCleanupKeys],
    shared_env_variables: sharedEnvVariables.map((variable) =>
      summarizeSource({ key: variable.key, source: variable.source }),
    ),
    status: blockingReasons.length === 0 ? "ready" : "blocked",
    warnings,
  })
}
