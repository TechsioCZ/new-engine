import type {
  SmartSuggestD1Database,
  SmartSuggestKvNamespace,
} from "./cloudflare-runtime"

export type SmartSuggestRuntimeEnvironment =
  | "local"
  | "preview"
  | "staging"
  | "production"
  | "test"

export type SmartSuggestEnv = {
  readonly SMART_SUGGEST_ENV?: string
  readonly SMART_SUGGEST_VERSION?: string
  readonly SMART_SUGGEST_BUILD_ID?: string
  readonly SMART_SUGGEST_ALLOWED_ORIGINS?: string
  readonly SMART_SUGGEST_DEFAULT_TENANT_ID?: string
  readonly SMART_SUGGEST_TENANT_HEADER?: string
  readonly SMART_SUGGEST_PROVIDER_PRIORITY?: string
  readonly SMART_SUGGEST_DB?: SmartSuggestD1Database
  readonly SMART_SUGGEST_CONFIG?: SmartSuggestKvNamespace
  readonly SMART_SUGGEST_CACHE?: SmartSuggestKvNamespace
  readonly SMART_SUGGEST_PROVIDER_CACHE?: SmartSuggestKvNamespace
  readonly SMART_SUGGEST_MAPY_API_KEY?: string
}

export type SmartSuggestConfig = {
  readonly serviceName: "smart-suggest"
  readonly version: string
  readonly buildId: string
  readonly environment: SmartSuggestRuntimeEnvironment
  readonly allowedOrigins: readonly string[]
  readonly tenant: {
    readonly defaultTenantId: string
    readonly tenantHeader: string
  }
  readonly providerPriority: readonly string[]
  readonly bindings: {
    readonly d1: boolean
    readonly configKv: boolean
    readonly cacheKv: boolean
    readonly providerCacheKv: boolean
  }
  readonly providerSecrets: {
    readonly mapyApiKey: boolean
  }
}

export type SmartSuggestConfigIssue = {
  readonly code:
    | "invalid_environment"
    | "invalid_origin"
    | "invalid_provider_id"
    | "invalid_tenant_header"
    | "invalid_tenant_id"
  readonly message: string
}

export type SmartSuggestConfigResult =
  | {
      readonly ok: true
      readonly config: SmartSuggestConfig
    }
  | {
      readonly ok: false
      readonly issues: readonly SmartSuggestConfigIssue[]
    }

const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
] as const

const providerIdPattern = /^[a-z][a-z0-9-]*$/
const tenantHeaderPattern = /^[a-z0-9-]+$/
const tenantIdPattern = /^[a-z0-9][a-z0-9_-]{0,63}$/

export function loadSmartSuggestConfig(
  env: SmartSuggestEnv
): SmartSuggestConfigResult {
  const issues: SmartSuggestConfigIssue[] = []
  const environment = parseRuntimeEnvironment(env.SMART_SUGGEST_ENV, issues)
  const allowedOrigins = parseAllowedOrigins(
    env.SMART_SUGGEST_ALLOWED_ORIGINS,
    issues
  )
  const defaultTenantId = parseDefaultTenantId(
    env.SMART_SUGGEST_DEFAULT_TENANT_ID,
    issues
  )
  const tenantHeader = parseTenantHeader(
    env.SMART_SUGGEST_TENANT_HEADER,
    issues
  )
  const providerPriority = parseProviderPriority(
    env.SMART_SUGGEST_PROVIDER_PRIORITY,
    issues
  )

  if (issues.length > 0) {
    return {
      ok: false,
      issues,
    }
  }

  return {
    ok: true,
    config: {
      serviceName: "smart-suggest",
      version: normalizeOptionalText(env.SMART_SUGGEST_VERSION) ?? "0.0.0",
      buildId: normalizeOptionalText(env.SMART_SUGGEST_BUILD_ID) ?? "local",
      environment,
      allowedOrigins,
      tenant: {
        defaultTenantId,
        tenantHeader,
      },
      providerPriority,
      bindings: {
        d1: Boolean(env.SMART_SUGGEST_DB),
        configKv: Boolean(env.SMART_SUGGEST_CONFIG),
        cacheKv: Boolean(env.SMART_SUGGEST_CACHE),
        providerCacheKv: Boolean(env.SMART_SUGGEST_PROVIDER_CACHE),
      },
      providerSecrets: {
        mapyApiKey: Boolean(
          normalizeOptionalText(env.SMART_SUGGEST_MAPY_API_KEY)
        ),
      },
    },
  }
}

function parseRuntimeEnvironment(
  value: string | undefined,
  issues: SmartSuggestConfigIssue[]
): SmartSuggestRuntimeEnvironment {
  const normalized = normalizeOptionalText(value) ?? "local"

  if (
    normalized === "local" ||
    normalized === "preview" ||
    normalized === "staging" ||
    normalized === "production" ||
    normalized === "test"
  ) {
    return normalized
  }

  issues.push({
    code: "invalid_environment",
    message:
      "SMART_SUGGEST_ENV must be local, preview, staging, production, or test.",
  })

  return "local"
}

function parseAllowedOrigins(
  value: string | undefined,
  issues: SmartSuggestConfigIssue[]
): readonly string[] {
  const origins = splitCommaList(value)

  if (origins.length === 0) {
    return defaultAllowedOrigins
  }

  const invalidOrigins = origins.filter(
    (origin) => origin !== "*" && !isValidHttpOrigin(origin)
  )

  if (invalidOrigins.length > 0) {
    issues.push({
      code: "invalid_origin",
      message: `SMART_SUGGEST_ALLOWED_ORIGINS must contain HTTP(S) origins or *. Invalid: ${invalidOrigins.join(", ")}`,
    })
  }

  return origins
}

function parseDefaultTenantId(
  value: string | undefined,
  issues: SmartSuggestConfigIssue[]
): string {
  const tenantId = normalizeOptionalText(value) ?? "default"

  if (!tenantIdPattern.test(tenantId)) {
    issues.push({
      code: "invalid_tenant_id",
      message:
        "SMART_SUGGEST_DEFAULT_TENANT_ID must be 1-64 lowercase letters, numbers, underscores, or hyphens.",
    })
  }

  return tenantId
}

function parseTenantHeader(
  value: string | undefined,
  issues: SmartSuggestConfigIssue[]
): string {
  const tenantHeader =
    normalizeOptionalText(value)?.toLowerCase() ?? "x-tenant-id"

  if (!tenantHeaderPattern.test(tenantHeader)) {
    issues.push({
      code: "invalid_tenant_header",
      message:
        "SMART_SUGGEST_TENANT_HEADER must be a lowercase HTTP header token.",
    })
  }

  return tenantHeader
}

function parseProviderPriority(
  value: string | undefined,
  issues: SmartSuggestConfigIssue[]
): readonly string[] {
  const providerIds = splitCommaList(value)

  for (const providerId of providerIds) {
    if (!providerIdPattern.test(providerId)) {
      issues.push({
        code: "invalid_provider_id",
        message:
          "SMART_SUGGEST_PROVIDER_PRIORITY must contain provider ids like owned-data or mapy.",
      })
    }
  }

  return providerIds
}

function splitCommaList(value: string | undefined): readonly string[] {
  const normalized = normalizeOptionalText(value)

  if (!normalized) {
    return []
  }

  return normalized
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim()

  return normalized && normalized.length > 0 ? normalized : undefined
}

function isValidHttpOrigin(value: string): boolean {
  try {
    const url = new URL(value)

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.origin === value
    )
  } catch {
    return false
  }
}
