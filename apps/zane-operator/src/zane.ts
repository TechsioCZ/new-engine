import type { AppConfig } from "./config"
import { BadRequestError } from "./db"
import type { SearchCredentialsOutput, StackInputsConfig } from "./stack-inputs"

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
type Lane = "preview" | "main"
type ServiceType = "docker" | "git"
type JsonRecord = Record<string, unknown>
const ZANE_PRODUCTION_ENVIRONMENT_NAME = "production"

export interface ResolveEnvironmentInput {
  lane: Lane
  projectSlug: string
  environmentName: string
  expectedPreviewServiceSlugs: string[]
  excludedPreviewServiceSlugs: string[]
}

export interface ArchiveEnvironmentInput {
  projectSlug: string
  environmentName: string
}

export interface ProvisionPreviewMeiliKeysInput {
  projectSlug: string
  environmentName: string
  serviceSlug: string
}

export interface ResolveTargetInput {
  // Stable repo/manifest service identity used across CI payloads.
  service_id: string
  // Upstream Zane service slug used to resolve the actual target.
  service_slug: string
}

export interface EnvOverrideInput {
  // Stable repo/manifest service identity used across CI payloads.
  service_id: string
  // Upstream Zane service slug used for diagnostics.
  service_slug: string
  env: Record<string, string>
}

export interface VerifyDeploymentRef {
  // Stable repo/manifest service identity used across CI payloads.
  service_id: string
  // Upstream Zane service slug associated with the deployment ref.
  service_slug: string
  deployment_hash: string
}

export interface PersistedEnvRequirement {
  service_id: string
  service_slug: string
  env_keys: string[]
}

export interface VerifyDeployInput {
  lane: Lane
  projectSlug: string
  environmentName: string
  requestedServiceIds: string[]
  deployServiceIds: string[]
  triggeredServiceIds: string[]
  expectedEnvOverrides: EnvOverrideInput[]
  requiredPersistedEnv: PersistedEnvRequirement[]
  deployments: VerifyDeploymentRef[]
}

interface CheckedDeploymentResult {
  service_id: string
  service_slug: string
  deployment_hash: string
  status: string
  status_reason: string | null
}

interface ResolveEnvironmentWarning {
  code: "preview_excluded_services_present" | "preview_extra_services_present"
  message: string
  service_slugs: string[]
}

export interface ZaneEnvironment {
  id: string
  is_preview: boolean
  name: string
}

export interface ZaneServiceCard {
  id: string
  slug: string
  type: ServiceType
  status?: string
}

export interface ZaneEnvVariable {
  id: string
  key: string
  value: string
}

export interface ZaneServiceUrl {
  id: string
  domain: string
  base_path: string
}

export interface ZaneServiceDetails {
  id: string
  slug: string
  type: ServiceType
  commit_sha?: string | null
  deploy_token: string
  env_variables: ZaneEnvVariable[]
  urls: ZaneServiceUrl[]
  unapplied_changes?: Array<{ id: string }>
}

export interface ZaneResolvedCurrentDeployment {
  deployment_hash: string
  status: string
  commit_sha: string | null
  env: Record<string, string>
}

export interface ZaneResolvedTarget {
  // Stable repo/manifest service identity used across CI payloads.
  service_id: string
  // Upstream Zane service slug used to resolve the actual target.
  service_slug: string
  service_type: ServiceType
  configured_commit_sha?: string | null
  deploy_token: string
  deploy_url: string
  env_change_url: string
  details_url: string
  has_unapplied_changes?: boolean
  current_production_deployment?: ZaneResolvedCurrentDeployment | null
  active_deployment?: ZaneResolvedCurrentDeployment | null
}

export interface TriggeredDeployment {
  service_id: string
  service_slug: string
  service_type: ServiceType
  deployment_hash: string
  status: string
}

interface ZaneSession {
  cookies: Map<string, string>
}

interface CachedZaneSession {
  session: ZaneSession
  expiresAt: number
}

interface ZaneDeployment {
  hash: string
  is_current_production?: boolean
  commit_sha?: string | null
  status: string
  status_reason?: string | null
  service_snapshot?: {
    env_variables?: ZaneEnvVariable[]
  }
}

interface ZaneDeploymentListResponse {
  results?: ZaneDeployment[]
}

const SESSION_CACHE_TTL_MS = 10 * 60 * 1000
const cachedSessions = new Map<string, CachedZaneSession>()
const pendingSessionInitializations = new Map<string, Promise<ZaneSession>>()

interface ZaneEnvironmentWithVariables extends ZaneEnvironment {
  variables: Array<{
    id: string
    key: string
    value: string
  }>
}

function assertObject(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestError(`${label} must be a JSON object`)
  }

  return value as JsonRecord
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new BadRequestError(`${label} must be a string`)
  }

  const trimmed = value.trim()
  if (!trimmed) {
    throw new BadRequestError(`${label} cannot be empty`)
  }

  return trimmed
}

function assertOptionalString(value: unknown, label: string): string | undefined {
  if (value == null) {
    return undefined
  }

  return assertString(value, label)
}

function assertLane(value: unknown, label: string): Lane {
  const lane = assertString(value, label)
  if (lane !== "preview" && lane !== "main") {
    throw new BadRequestError(`${label} must be preview or main`)
  }

  return lane
}

function assertEnvironmentMatchesLane(environment: Pick<ZaneEnvironment, "name" | "is_preview">, lane: Lane): void {
  if (lane === "main" && environment.is_preview) {
    throw new UpstreamHttpError(
      409,
      "zane_environment_lane_mismatch",
      `Environment ${environment.name} is a preview environment and cannot be used for main lane operations`,
    )
  }

  if (lane === "preview" && !environment.is_preview) {
    throw new UpstreamHttpError(
      409,
      "zane_environment_lane_mismatch",
      `Environment ${environment.name} is not a preview environment and cannot be used for preview lane operations`,
    )
  }
}

function assertServiceType(value: unknown, label: string): ServiceType {
  const rawServiceType = assertString(value, label)

  switch (rawServiceType.toUpperCase()) {
    case "DOCKER":
    case "DOCKER_REGISTRY":
      return "docker"
    case "GIT":
    case "GIT_REPOSITORY":
      return "git"
    default:
      throw new BadRequestError(`${label} must be docker or git`)
  }
}

function assertStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new BadRequestError(`${label} must be an array`)
  }

  return value.map((item, index) => assertString(item, `${label}[${index}]`))
}

function assertStringMap(value: unknown, label: string): Record<string, string> {
  const record = assertObject(value, label)
  const result: Record<string, string> = {}

  for (const [key, rawValue] of Object.entries(record)) {
    result[assertString(key, `${label} key`)] = assertString(rawValue, `${label}.${key}`)
  }

  return result
}

function normalizeProjectSlugFromPayload(payload: JsonRecord): string {
  return assertString(payload.project_slug, "project_slug")
}

function normalizeResolveTargets(value: unknown, label: string): ResolveTargetInput[] {
  if (!Array.isArray(value)) {
    throw new BadRequestError(`${label} must be an array`)
  }

  return value.map((item, index) => {
    const object = assertObject(item, `${label}[${index}]`)
    return {
      service_id: assertString(object.service_id, `${label}[${index}].service_id`),
      service_slug: assertString(object.service_slug, `${label}[${index}].service_slug`),
    }
  })
}

function normalizeEnvOverrides(value: unknown, label: string): EnvOverrideInput[] {
  if (!Array.isArray(value)) {
    throw new BadRequestError(`${label} must be an array`)
  }

  return value.map((item, index) => {
    const object = assertObject(item, `${label}[${index}]`)
    return {
      service_id: assertString(object.service_id, `${label}[${index}].service_id`),
      service_slug: assertString(object.service_slug, `${label}[${index}].service_slug`),
      env: assertStringMap(object.env, `${label}[${index}].env`),
    }
  })
}

function normalizeDeployments(value: unknown, label: string): VerifyDeploymentRef[] {
  if (value == null) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new BadRequestError(`${label} must be an array`)
  }

  return value.map((item, index) => {
    const object = assertObject(item, `${label}[${index}]`)
    return {
      service_id: assertString(object.service_id, `${label}[${index}].service_id`),
      service_slug: assertString(object.service_slug, `${label}[${index}].service_slug`),
      deployment_hash: assertString(object.deployment_hash, `${label}[${index}].deployment_hash`),
    }
  })
}

function normalizePersistedEnvRequirements(value: unknown, label: string): PersistedEnvRequirement[] {
  if (value == null) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new BadRequestError(`${label} must be an array`)
  }

  return value.map((item, index) => {
    const object = assertObject(item, `${label}[${index}]`)
    return {
      service_id: assertString(object.service_id, `${label}[${index}].service_id`),
      service_slug: assertString(object.service_slug, `${label}[${index}].service_slug`),
      env_keys: assertStringArray(object.env_keys, `${label}[${index}].env_keys`),
    }
  })
}

function assertRepoServiceIdSubset(
  values: string[],
  allowed: Set<string>,
  label: string,
  parentLabel: string,
): void {
  for (const value of values) {
    if (!allowed.has(value)) {
      throw new BadRequestError(`${parentLabel} contains ${label} outside deploy_service_ids: ${value}`)
    }
  }
}

function buildVerifyServiceSlugByRepoId(
  expectedEnvOverrides: EnvOverrideInput[],
  requiredPersistedEnv: PersistedEnvRequirement[],
  deployments: VerifyDeploymentRef[],
): Map<string, string> {
  const mapping = new Map<string, string>()
  const register = (repoServiceId: string, upstreamServiceSlug: string, label: string): void => {
    const existing = mapping.get(repoServiceId)
    if (existing && existing !== upstreamServiceSlug) {
      throw new BadRequestError(
        `${label} maps repo service_id ${repoServiceId} to conflicting service_slug values: ${existing} vs ${upstreamServiceSlug}`,
      )
    }
    mapping.set(repoServiceId, upstreamServiceSlug)
  }

  for (const override of expectedEnvOverrides) {
    register(override.service_id, override.service_slug, "expected_env_overrides")
  }

  for (const requirement of requiredPersistedEnv) {
    register(requirement.service_id, requirement.service_slug, "required_persisted_env")
  }

  for (const deployment of deployments) {
    register(deployment.service_id, deployment.service_slug, "deployments")
  }

  return mapping
}

function normalizeServiceCards(payload: unknown): ZaneServiceCard[] {
  if (!Array.isArray(payload)) {
    throw new UpstreamHttpError(502, "zane_service_list_invalid", "ZaneOps service list response was not an array")
  }

  return payload.map((item, index) => {
    const object = assertObject(item, `service_list[${index}]`)
    return {
      id: assertString(object.id, `service_list[${index}].id`),
      slug: assertString(object.slug, `service_list[${index}].slug`),
      type: assertServiceType(object.type, `service_list[${index}].type`),
      status: typeof object.status === "string" ? object.status : undefined,
    }
  })
}

function buildServicePublicUrls(serviceDetails: ZaneServiceDetails): string[] {
  if (!Array.isArray(serviceDetails.urls)) {
    return []
  }

  return serviceDetails.urls
    .map((url, index) => {
      const domain = assertString(url.domain, `service.urls[${index}].domain`)
      const basePath = typeof url.base_path === "string" && url.base_path.trim() ? url.base_path.trim() : "/"
      return new URL(basePath.startsWith("/") ? basePath : `/${basePath}`, `https://${domain}`).toString()
    })
    .filter((value, index, array) => array.indexOf(value) === index)
}

function getServiceEnvValue(serviceDetails: ZaneServiceDetails, keys: string[]): string | null {
  const envVariables = Array.isArray(serviceDetails.env_variables) ? serviceDetails.env_variables : []
  const envByKey = new Map(envVariables.map((envVar) => [envVar.key, envVar.value]))
  for (const key of keys) {
    const value = envByKey.get(key)
    if (typeof value === "string" && value.trim()) {
      return value
    }
  }
  return null
}

function meiliKeyMatchesPolicy(
  keyObj: Record<string, unknown>,
  uid: string,
  description: string,
  actions: string[],
  indexes: string[],
): boolean {
  const keyUid = typeof keyObj.uid === "string" ? keyObj.uid : null
  const keyDescription = typeof keyObj.description === "string" ? keyObj.description : null
  const keyActions = Array.isArray(keyObj.actions) ? keyObj.actions.filter((item): item is string => typeof item === "string") : []
  const keyIndexes = Array.isArray(keyObj.indexes) ? keyObj.indexes.filter((item): item is string => typeof item === "string") : []

  return (
    keyUid === uid &&
    keyDescription === description &&
    JSON.stringify([...keyActions].sort()) === JSON.stringify([...actions].sort()) &&
    JSON.stringify([...keyIndexes].sort()) === JSON.stringify([...indexes].sort())
  )
}

function requireTargetEnvVar(output: SearchCredentialsOutput, serviceId: string, outputLabel: string): string {
  const target = output.targetEnvs.find((entry) => entry.serviceId === serviceId)
  if (!target) {
    throw new BadRequestError(`search_credentials.${outputLabel} is missing a target env for ${serviceId}`)
  }
  return target.envVar
}

function buildCookieHeader(cookies: Map<string, string>): string {
  return Array.from(cookies.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ")
}

function getSetCookieHeaders(headers: Headers): string[] {
  const withGetSetCookie = headers as Headers & {
    getSetCookie?: () => string[]
  }

  if (typeof withGetSetCookie.getSetCookie === "function") {
    return withGetSetCookie.getSetCookie()
  }

  const header = headers.get("set-cookie")
  return header ? [header] : []
}

function updateCookiesFromHeaders(cookies: Map<string, string>, headers: Headers): void {
  for (const headerValue of getSetCookieHeaders(headers)) {
    const cookiePair = headerValue.split(";", 1)[0]
    if (!cookiePair) {
      continue
    }

    const separatorIndex = cookiePair.indexOf("=")
    if (separatorIndex <= 0) {
      continue
    }

    const name = cookiePair.slice(0, separatorIndex).trim()
    const value = cookiePair.slice(separatorIndex + 1).trim()
    if (name) {
      cookies.set(name, value)
    }
  }
}

function parseErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback
  }

  const object = payload as Record<string, unknown>
  if (typeof object.detail === "string" && object.detail.trim()) {
    return object.detail
  }
  if (typeof object.message === "string" && object.message.trim()) {
    return object.message
  }

  if (Array.isArray(object.errors) && object.errors.length > 0) {
    const firstError = object.errors[0]
    if (firstError && typeof firstError === "object") {
      const firstErrorObject = firstError as Record<string, unknown>
      if (typeof firstErrorObject.detail === "string" && firstErrorObject.detail.trim()) {
        return firstErrorObject.detail
      }
      if (typeof firstErrorObject.message === "string" && firstErrorObject.message.trim()) {
        return firstErrorObject.message
      }
    }
  }

  return fallback
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export class UpstreamHttpError extends Error {
  readonly status: number
  readonly errorCode: string

  constructor(status: number, errorCode: string, message: string) {
    super(message)
    this.name = "UpstreamHttpError"
    this.status = status
    this.errorCode = errorCode
  }
}

function requireZaneDeployConfig(config: AppConfig): {
  baseUrl: string
  connectBaseUrl: string
  connectHostHeader: string | null
  username: string
  password: string
} {
  if (!config.zaneBaseUrl) {
    throw new BadRequestError("ZANE_BASE_URL is required for deploy orchestration")
  }
  if (!config.zaneUsername) {
    throw new BadRequestError("ZANE_USERNAME is required for deploy orchestration")
  }
  if (!config.zanePassword) {
    throw new BadRequestError("ZANE_PASSWORD is required for deploy orchestration")
  }

  return {
    baseUrl: config.zaneBaseUrl.replace(/\/+$/, ""),
    connectBaseUrl: (config.zaneConnectBaseUrl ?? config.zaneBaseUrl).replace(/\/+$/, ""),
    connectHostHeader: config.zaneConnectHostHeader,
    username: config.zaneUsername,
    password: config.zanePassword,
  }
}

export class ZaneClient {
  readonly #connectBaseUrl: string
  readonly #connectHostHeader: string | null
  readonly #username: string
  readonly #password: string
  readonly #sessionCacheKey: string
  readonly #stackInputs: StackInputsConfig

  constructor(config: AppConfig, stackInputs: StackInputsConfig) {
    const deployConfig = requireZaneDeployConfig(config)
    this.#connectBaseUrl = deployConfig.connectBaseUrl
    this.#connectHostHeader = deployConfig.connectHostHeader
    this.#username = deployConfig.username
    this.#password = deployConfig.password
    this.#sessionCacheKey = `${this.#connectBaseUrl}\n${this.#username}`
    this.#stackInputs = stackInputs
  }

  static parseResolveEnvironmentInput(rawPayload: unknown): ResolveEnvironmentInput {
    const payload = assertObject(rawPayload, "request body")
    return {
      lane: assertLane(payload.lane, "lane"),
      projectSlug: normalizeProjectSlugFromPayload(payload),
      environmentName: assertString(payload.environment_name, "environment_name"),
      expectedPreviewServiceSlugs: assertStringArray(
        payload.expected_preview_service_slugs ?? [],
        "expected_preview_service_slugs",
      ),
      excludedPreviewServiceSlugs: assertStringArray(
        payload.excluded_preview_service_slugs ?? [],
        "excluded_preview_service_slugs",
      ),
    }
  }

  static parseArchiveEnvironmentInput(rawPayload: unknown): ArchiveEnvironmentInput {
    const payload = assertObject(rawPayload, "request body")
    return {
      projectSlug: normalizeProjectSlugFromPayload(payload),
      environmentName: assertString(payload.environment_name, "environment_name"),
    }
  }

  static parseProvisionPreviewMeiliKeysInput(rawPayload: unknown): ProvisionPreviewMeiliKeysInput {
    const payload = assertObject(rawPayload, "request body")
    return {
      projectSlug: normalizeProjectSlugFromPayload(payload),
      environmentName: assertString(payload.environment_name, "environment_name"),
      serviceSlug: assertString(payload.service_slug, "service_slug"),
    }
  }

  static parseResolveTargetsInput(rawPayload: unknown): {
    lane: Lane
    projectSlug: string
    environmentName: string
    services: ResolveTargetInput[]
  } {
    const payload = assertObject(rawPayload, "request body")
    return {
      lane: assertLane(payload.lane, "lane"),
      projectSlug: normalizeProjectSlugFromPayload(payload),
      environmentName: assertString(payload.environment_name, "environment_name"),
      services: normalizeResolveTargets(payload.services, "services"),
    }
  }

  static parseApplyEnvOverridesInput(rawPayload: unknown): {
    projectSlug: string
    environmentName: string
    targets: ZaneResolvedTarget[]
    envOverrides: EnvOverrideInput[]
  } {
    const payload = assertObject(rawPayload, "request body")
    return {
      projectSlug: normalizeProjectSlugFromPayload(payload),
      environmentName: assertString(payload.environment_name, "environment_name"),
      targets: ZaneClient.parseResolvedTargets(payload.targets),
      envOverrides: normalizeEnvOverrides(payload.env_overrides, "env_overrides"),
    }
  }

  static parseTriggerInput(rawPayload: unknown): {
    projectSlug: string
    environmentName: string
    targets: ZaneResolvedTarget[]
    gitCommitSha?: string
  } {
    const payload = assertObject(rawPayload, "request body")
    return {
      projectSlug: normalizeProjectSlugFromPayload(payload),
      environmentName: assertString(payload.environment_name, "environment_name"),
      targets: ZaneClient.parseResolvedTargets(payload.targets),
      gitCommitSha: assertOptionalString(payload.git_commit_sha, "git_commit_sha"),
    }
  }

  static parseVerifyInput(rawPayload: unknown): VerifyDeployInput {
    const payload = assertObject(rawPayload, "request body")
    return {
      lane: assertLane(payload.lane, "lane"),
      projectSlug: normalizeProjectSlugFromPayload(payload),
      environmentName: assertString(payload.environment_name, "environment_name"),
      requestedServiceIds: assertStringArray(payload.requested_service_ids, "requested_service_ids"),
      deployServiceIds: assertStringArray(payload.deploy_service_ids, "deploy_service_ids"),
      triggeredServiceIds: assertStringArray(payload.triggered_service_ids, "triggered_service_ids"),
      expectedEnvOverrides: normalizeEnvOverrides(payload.expected_env_overrides ?? [], "expected_env_overrides"),
      requiredPersistedEnv: normalizePersistedEnvRequirements(
        payload.required_persisted_env ?? [],
        "required_persisted_env",
      ),
      deployments: normalizeDeployments(payload.deployments, "deployments"),
    }
  }

  private static parseResolvedTargets(value: unknown): ZaneResolvedTarget[] {
    if (!Array.isArray(value)) {
      throw new BadRequestError("targets must be an array")
    }

    return value.map((item, index) => {
      const object = assertObject(item, `targets[${index}]`)
      return {
        service_id: assertString(object.service_id, `targets[${index}].service_id`),
        service_slug: assertString(object.service_slug, `targets[${index}].service_slug`),
        service_type: assertServiceType(object.service_type, `targets[${index}].service_type`),
        configured_commit_sha: assertOptionalString(
          object.configured_commit_sha,
          `targets[${index}].configured_commit_sha`,
        ),
        deploy_token: assertString(object.deploy_token, `targets[${index}].deploy_token`),
        deploy_url: assertString(object.deploy_url, `targets[${index}].deploy_url`),
        env_change_url: assertString(object.env_change_url, `targets[${index}].env_change_url`),
        details_url: assertString(object.details_url, `targets[${index}].details_url`),
      }
    })
  }

  private async authenticate(forceRefresh = false): Promise<ZaneSession> {
    if (!forceRefresh) {
      const cached = cachedSessions.get(this.#sessionCacheKey)
      if (cached && cached.expiresAt > Date.now()) {
        return cached.session
      }

      const pending = pendingSessionInitializations.get(this.#sessionCacheKey)
      if (pending) {
        return await pending
      }
    }

    const initialization = this.initializeSession()
    pendingSessionInitializations.set(this.#sessionCacheKey, initialization)

    try {
      const session = await initialization
      cachedSessions.set(this.#sessionCacheKey, {
        session,
        expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
      })
      return session
    } finally {
      pendingSessionInitializations.delete(this.#sessionCacheKey)
    }
  }

  private async initializeSession(): Promise<ZaneSession> {
    const session: ZaneSession = {
      cookies: new Map<string, string>(),
    }

    const csrfResponse = await fetch(`${this.#connectBaseUrl}/api/csrf/`, {
      method: "GET",
      headers: this.buildUpstreamHeaders(session, "GET"),
    })

    updateCookiesFromHeaders(session.cookies, csrfResponse.headers)
    if (!csrfResponse.ok) {
      throw new UpstreamHttpError(
        csrfResponse.status,
        "zane_csrf_failed",
        `Failed to initialize ZaneOps CSRF session (HTTP ${csrfResponse.status})`,
      )
    }

    const csrfToken = session.cookies.get("csrftoken")
    if (!csrfToken) {
      throw new UpstreamHttpError(502, "zane_csrf_missing", "ZaneOps did not issue a csrftoken cookie")
    }

    const loginResponse = await fetch(`${this.#connectBaseUrl}/api/auth/login/`, {
      method: "POST",
      headers: this.buildUpstreamHeaders(session, "POST"),
      body: JSON.stringify({
        username: this.#username,
        password: this.#password,
      }),
    })

    updateCookiesFromHeaders(session.cookies, loginResponse.headers)
    if (!loginResponse.ok) {
      let errorMessage = `ZaneOps login failed (HTTP ${loginResponse.status})`
      try {
        errorMessage = parseErrorMessage(await loginResponse.json(), errorMessage)
      } catch {
        // keep fallback message when upstream response is not JSON
      }
      throw new UpstreamHttpError(loginResponse.status, "zane_login_failed", errorMessage)
    }

    if (!session.cookies.get("sessionid")) {
      throw new UpstreamHttpError(502, "zane_session_missing", "ZaneOps login did not return a session cookie")
    }

    return session
  }

  private invalidateSessionCache(): void {
    cachedSessions.delete(this.#sessionCacheKey)
    pendingSessionInitializations.delete(this.#sessionCacheKey)
  }

  private async request<T>(
    session: ZaneSession,
    method: HttpMethod,
    path: string,
    payload?: unknown,
    options?: {
      allowNotFound?: boolean
      retryOnAuthFailure?: boolean
    },
  ): Promise<T | null> {
    const response = await fetch(`${this.#connectBaseUrl}${path}`, {
      method,
      headers: this.buildUpstreamHeaders(session, method),
      body: payload == null ? undefined : JSON.stringify(payload),
    })

    updateCookiesFromHeaders(session.cookies, response.headers)

    if (options?.allowNotFound && response.status === 404) {
      return null
    }

    if ((response.status === 401 || response.status === 403) && options?.retryOnAuthFailure !== false) {
      this.invalidateSessionCache()
      const freshSession = await this.authenticate(true)
      return await this.request(freshSession, method, path, payload, {
        ...options,
        retryOnAuthFailure: false,
      })
    }

    if (!response.ok) {
      let errorMessage = `ZaneOps request failed (HTTP ${response.status})`
      try {
        errorMessage = parseErrorMessage(await response.json(), errorMessage)
      } catch {
        // keep fallback message when upstream response is not JSON
      }
      throw new UpstreamHttpError(response.status, "zane_request_failed", errorMessage)
    }

    if (response.status === 204) {
      return null
    }

    return (await response.json()) as T
  }

  async resolveEnvironment(input: ResolveEnvironmentInput): Promise<{
    lane: Lane
    project_slug: string
    environment_id: string
    environment_name: string
    is_preview: boolean
    created: boolean
    cloned_from_environment: string | null
    ready: boolean
    expected_preview_service_slugs: string[]
    excluded_preview_service_slugs: string[]
    present_service_slugs: string[]
    missing_preview_service_slugs: string[]
    warnings: ResolveEnvironmentWarning[]
  }> {
    const session = await this.authenticate()
    const existing = await this.getEnvironment(session, input.projectSlug, input.environmentName)

    if (existing) {
      assertEnvironmentMatchesLane(existing, input.lane)
      return await this.buildResolvedEnvironmentState(session, input, existing, false, null)
    }

    if (input.lane !== "preview") {
      throw new UpstreamHttpError(
        404,
        "zane_environment_not_found",
        `Environment ${input.environmentName} does not exist in project ${input.projectSlug}`,
      )
    }

    const cloned = await this.request<ZaneEnvironmentWithVariables>(
      session,
      "POST",
      `/api/projects/${encodeURIComponent(input.projectSlug)}/clone-environment/${encodeURIComponent(
        ZANE_PRODUCTION_ENVIRONMENT_NAME,
      )}/`,
      {
        name: input.environmentName,
        deploy_after_clone: false,
      },
    )

    if (!cloned) {
      throw new UpstreamHttpError(502, "zane_clone_empty", "ZaneOps clone response was empty")
    }

    return await this.buildResolvedEnvironmentState(
      session,
      input,
      cloned,
      true,
      ZANE_PRODUCTION_ENVIRONMENT_NAME,
    )
  }

  private async buildResolvedEnvironmentState(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    environment: ZaneEnvironment,
    created: boolean,
    clonedFromEnvironment: string | null,
  ): Promise<{
    lane: Lane
    project_slug: string
    environment_id: string
    environment_name: string
    is_preview: boolean
    created: boolean
    cloned_from_environment: string | null
    ready: boolean
    expected_preview_service_slugs: string[]
    excluded_preview_service_slugs: string[]
    present_service_slugs: string[]
    missing_preview_service_slugs: string[]
    warnings: ResolveEnvironmentWarning[]
  }> {
    const cardsPayload = await this.request<unknown>(
      session,
      "GET",
      `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(environment.name)}/service-list/`,
    )
    const cards = normalizeServiceCards(cardsPayload ?? [])
    const presentServiceSlugs = [...new Set(cards.map((service) => service.slug))].sort()
    const expectedPreviewServiceSlugs = [...new Set(input.expectedPreviewServiceSlugs)].sort()
    const excludedPreviewServiceSlugs = [...new Set(input.excludedPreviewServiceSlugs)].sort()
    const presentSet = new Set(presentServiceSlugs)
    const expectedSet = new Set(expectedPreviewServiceSlugs)
    const excludedSet = new Set(excludedPreviewServiceSlugs)
    const missingPreviewServiceSlugs = expectedPreviewServiceSlugs.filter((slug) => !presentSet.has(slug))
    const warnings: ResolveEnvironmentWarning[] = []

    if (input.lane === "preview") {
      const excludedPresent = excludedPreviewServiceSlugs.filter((slug) => presentSet.has(slug))
      if (excludedPresent.length > 0) {
        warnings.push({
          code: "preview_excluded_services_present",
          message: `Preview environment ${environment.name} still contains non-cloned services: ${excludedPresent.join(", ")}`,
          service_slugs: excludedPresent,
        })
      }

      const extraPresent = presentServiceSlugs.filter((slug) => !expectedSet.has(slug) && !excludedSet.has(slug))
      if (extraPresent.length > 0) {
        warnings.push({
          code: "preview_extra_services_present",
          message: `Preview environment ${environment.name} contains additional services outside the managed preview clone set: ${extraPresent.join(", ")}`,
          service_slugs: extraPresent,
        })
      }
    }

    return {
      lane: input.lane,
      project_slug: input.projectSlug,
      environment_id: environment.id,
      environment_name: environment.name,
      is_preview: environment.is_preview,
      created,
      cloned_from_environment: clonedFromEnvironment,
      ready: missingPreviewServiceSlugs.length === 0,
      expected_preview_service_slugs: expectedPreviewServiceSlugs,
      excluded_preview_service_slugs: excludedPreviewServiceSlugs,
      present_service_slugs: presentServiceSlugs,
      missing_preview_service_slugs: missingPreviewServiceSlugs,
      warnings,
    }
  }

  async archiveEnvironment(input: ArchiveEnvironmentInput): Promise<{
    project_slug: string
    environment_name: string
    deleted: boolean
    noop: boolean
    noop_reason: string | null
  }> {
    const session = await this.authenticate()
    const response = await fetch(
      `${this.#connectBaseUrl}/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(input.environmentName)}/`,
      {
        method: "DELETE",
        headers: this.buildUpstreamHeaders(session, "DELETE"),
      },
    )

    updateCookiesFromHeaders(session.cookies, response.headers)

    if (response.status === 404) {
      return {
        project_slug: input.projectSlug,
        environment_name: input.environmentName,
        deleted: false,
        noop: true,
        noop_reason: "environment_not_found",
      }
    }

    if (!response.ok) {
      let errorMessage = `ZaneOps environment archive failed (HTTP ${response.status})`
      try {
        errorMessage = parseErrorMessage(await response.json(), errorMessage)
      } catch {
        // keep fallback message when upstream response is not JSON
      }
      throw new UpstreamHttpError(response.status, "zane_environment_archive_failed", errorMessage)
    }

    return {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      deleted: true,
      noop: false,
      noop_reason: null,
    }
  }

  async resolveTargets(input: {
    projectSlug: string
    environmentName: string
    services: ResolveTargetInput[]
  }): Promise<{
    project_slug: string
    environment_name: string
    services: ZaneResolvedTarget[]
  }> {
    const session = await this.authenticate()
    const cardsPayload = await this.request<unknown>(
      session,
      "GET",
      `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(input.environmentName)}/service-list/`,
    )
    const cards = normalizeServiceCards(cardsPayload ?? [])
    const cardBySlug = new Map(cards.map((service) => [service.slug, service]))

    const services = await Promise.all(
      input.services.map(async (service) => {
        const card = cardBySlug.get(service.service_slug)
        if (!card) {
          throw new UpstreamHttpError(
            404,
            "zane_service_not_found",
            `Service ${service.service_slug} was not found in ${input.projectSlug}/${input.environmentName}`,
          )
        }

        const details = await this.getServiceDetails(session, input.projectSlug, input.environmentName, service.service_slug)
        const deployments = await this.listDeployments(session, input.projectSlug, input.environmentName, details.slug)
        const currentProductionDeploymentSummary =
          deployments.find(
            (deployment) => deployment.is_current_production === true && deployment.status.toUpperCase() === "HEALTHY",
          ) ?? null
        const currentProductionDeployment = currentProductionDeploymentSummary
          ? await this.getDeployment(
              session,
              input.projectSlug,
              input.environmentName,
              details.slug,
              currentProductionDeploymentSummary.hash,
            )
          : null
        const activeDeploymentSummary =
          deployments.find((deployment) =>
            ["QUEUED", "PREPARING", "BUILDING", "STARTING", "RESTARTING"].includes(
              deployment.status.toUpperCase(),
            ),
          ) ?? null
        const activeDeployment = activeDeploymentSummary
          ? await this.getDeployment(
              session,
              input.projectSlug,
              input.environmentName,
              details.slug,
              activeDeploymentSummary.hash,
            )
          : null

        return {
          service_id: service.service_id,
          service_slug: details.slug,
          service_type: assertServiceType(details.type, `${service.service_slug}.service_type`),
          configured_commit_sha: details.commit_sha ?? null,
          deploy_token: details.deploy_token,
          deploy_url:
            assertServiceType(details.type, `${service.service_slug}.service_type`) === "docker"
              ? `/api/deploy-service/docker/${details.deploy_token}/`
              : `/api/deploy-service/git/${details.deploy_token}/`,
          env_change_url: `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(
            input.environmentName,
          )}/request-service-changes/${encodeURIComponent(details.slug)}/`,
          details_url: `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(
            input.environmentName,
          )}/service-details/${encodeURIComponent(details.slug)}/`,
          has_unapplied_changes: Array.isArray(details.unapplied_changes) && details.unapplied_changes.length > 0,
          current_production_deployment: currentProductionDeployment
            ? {
                deployment_hash: currentProductionDeployment.hash,
                status: currentProductionDeployment.status,
                commit_sha: currentProductionDeployment.commit_sha ?? null,
                env: Object.fromEntries(
                  (currentProductionDeployment.service_snapshot?.env_variables ?? []).map((envVar) => [
                    envVar.key,
                    envVar.value,
                  ]),
                ),
              }
            : null,
          active_deployment: activeDeployment
            ? {
                deployment_hash: activeDeployment.hash,
                status: activeDeployment.status,
                commit_sha: activeDeployment.commit_sha ?? null,
                env: Object.fromEntries(
                  (activeDeployment.service_snapshot?.env_variables ?? []).map((envVar) => [envVar.key, envVar.value]),
                ),
              }
            : null,
        } satisfies ZaneResolvedTarget
      }),
    )

    return {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      services,
    }
  }

  async applyEnvOverrides(input: {
    projectSlug: string
    environmentName: string
    targets: ZaneResolvedTarget[]
    envOverrides: EnvOverrideInput[]
  }): Promise<{
    project_slug: string
    environment_name: string
    noop: boolean
    applied_service_ids: string[]
    applied_changes: Array<{
      service_id: string
      service_slug: string
      key: string
      change_type: "ADD" | "UPDATE" | "SKIP"
    }>
  }> {
    if (input.envOverrides.length === 0) {
      return {
        project_slug: input.projectSlug,
        environment_name: input.environmentName,
        noop: true,
        applied_service_ids: [],
        applied_changes: [],
      }
    }

    const session = await this.authenticate()
    const targetsByServiceId = new Map(input.targets.map((target) => [target.service_id, target]))
    const appliedServiceIds = new Set<string>()
    const appliedChanges: Array<{
      service_id: string
      service_slug: string
      key: string
      change_type: "ADD" | "UPDATE" | "SKIP"
    }> = []

    for (const override of input.envOverrides) {
      const target = targetsByServiceId.get(override.service_id)
      if (!target) {
        throw new UpstreamHttpError(
          404,
          "zane_target_missing",
          `No resolved target found for service ${override.service_slug} (${override.service_id})`,
        )
      }

      const serviceDetails = await this.getServiceDetails(session, input.projectSlug, input.environmentName, target.service_slug)
      const envByKey = new Map(serviceDetails.env_variables.map((envVar) => [envVar.key, envVar]))

      for (const [key, value] of Object.entries(override.env)) {
        const current = envByKey.get(key)
        if (current?.value === value) {
          appliedChanges.push({
            service_id: override.service_id,
            service_slug: override.service_slug,
            key,
            change_type: "SKIP",
          })
          continue
        }

        const changeType: "ADD" | "UPDATE" = current ? "UPDATE" : "ADD"
        const requestBody: JsonRecord = {
          field: "env_variables",
          type: changeType,
          new_value: {
            key,
            value,
          },
        }

        if (current) {
          requestBody.item_id = current.id
        }

        await this.request(
          session,
          "PUT",
          `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(
            input.environmentName,
          )}/request-service-changes/${encodeURIComponent(target.service_slug)}/`,
          requestBody,
        )

        appliedServiceIds.add(override.service_id)
        appliedChanges.push({
          service_id: override.service_id,
          service_slug: override.service_slug,
          key,
          change_type: changeType,
        })
      }
    }

    return {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      noop: appliedServiceIds.size === 0,
      applied_service_ids: Array.from(appliedServiceIds),
      applied_changes: appliedChanges,
    }
  }

  async triggerDeploys(input: {
    projectSlug: string
    environmentName: string
    targets: ZaneResolvedTarget[]
    gitCommitSha?: string
  }): Promise<{
    project_slug: string
    environment_name: string
    triggered_service_ids: string[]
    services: TriggeredDeployment[]
  }> {
    const session = await this.authenticate()
    const deployments = await Promise.all(
      input.targets.map(async (target) => {
        const body =
          target.service_type === "docker"
            ? { cleanup_queue: false, commit_message: "CI selective deploy" }
            : {
                cleanup_queue: false,
                ignore_build_cache: false,
                ...(input.gitCommitSha ? { commit_sha: input.gitCommitSha } : {}),
              }

        const previousDeploymentHashes = new Set(
          (await this.listDeployments(session, input.projectSlug, input.environmentName, target.service_slug)).map(
            (deployment) => deployment.hash,
          ),
        )

        await this.triggerDeployment(target, body)
        const deployment = await this.findTriggeredDeployment(
          session,
          input.projectSlug,
          input.environmentName,
          target.service_slug,
          previousDeploymentHashes,
        )
        return {
          service_id: target.service_id,
          service_slug: target.service_slug,
          service_type: target.service_type,
          deployment_hash: deployment.hash,
          status: deployment.status,
        } satisfies TriggeredDeployment
      }),
    )

    return {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      triggered_service_ids: deployments.map((deployment) => deployment.service_id),
      services: deployments,
    }
  }

  async provisionPreviewMeiliKeys(input: ProvisionPreviewMeiliKeysInput): Promise<{
    project_slug: string
    environment_name: string
    service_slug: string
    meili_url: string
    backend_key: string
    backend_env_var: string
    backend_created: boolean
    backend_updated: boolean
    frontend_key: string
    frontend_env_var: string
    frontend_created: boolean
    frontend_updated: boolean
  }> {
    const provider = this.#stackInputs.searchCredentialsProvider
    const backendOutput = provider.outputs.backend
    const frontendOutput = provider.outputs.frontend
    const backendEnvVar = requireTargetEnvVar(backendOutput, "medusa-be", "backend_key")
    const frontendEnvVar = requireTargetEnvVar(frontendOutput, "n1", "frontend_key")
    const session = await this.authenticate()
    const environment = await this.getEnvironment(session, input.projectSlug, input.environmentName)
    if (!environment) {
      throw new UpstreamHttpError(
        404,
        "zane_environment_not_found",
        `Environment ${input.environmentName} does not exist in project ${input.projectSlug}`,
      )
    }
    assertEnvironmentMatchesLane(environment, "preview")

    const serviceDetails = await this.getServiceDetails(session, input.projectSlug, input.environmentName, input.serviceSlug)
    const serviceUrls = buildServicePublicUrls(serviceDetails)
    const meiliUrl = serviceUrls[0]
    if (!meiliUrl) {
      throw new UpstreamHttpError(
        409,
        "zane_meili_url_missing",
        `Service ${input.serviceSlug} does not expose a public URL in ${input.projectSlug}/${input.environmentName}`,
      )
    }

    const meiliMasterKey = getServiceEnvValue(serviceDetails, ["MEILI_MASTER_KEY", "MEILISEARCH_API_KEY"])
    if (!meiliMasterKey) {
      throw new UpstreamHttpError(
        409,
        "zane_meili_master_key_missing",
        `Service ${input.serviceSlug} does not expose a Meilisearch master key in ${input.projectSlug}/${input.environmentName}`,
      )
    }

    await this.waitForMeiliHealth(meiliUrl, provider.readinessPath)

    let backendKeyObj = await this.getMeiliKeyByUid(meiliUrl, meiliMasterKey, backendOutput.policy.uid)
    let backendCreated = false
    let backendUpdated = false
    if (!backendKeyObj) {
      backendKeyObj = await this.createMeiliKey(
        meiliUrl,
        meiliMasterKey,
        backendOutput.policy.uid,
        backendOutput.policy.description,
        backendOutput.policy.actions,
        backendOutput.policy.indexes,
      )
      backendCreated = true
    } else if (
      !meiliKeyMatchesPolicy(
        backendKeyObj,
        backendOutput.policy.uid,
        backendOutput.policy.description,
        backendOutput.policy.actions,
        backendOutput.policy.indexes,
      )
    ) {
      backendKeyObj = await this.updateMeiliKey(
        meiliUrl,
        meiliMasterKey,
        backendOutput.policy.uid,
        backendOutput.policy.description,
        backendOutput.policy.actions,
        backendOutput.policy.indexes,
      )
      backendUpdated = true
    }

    let frontendKeyObj = await this.getMeiliKeyByUid(meiliUrl, meiliMasterKey, frontendOutput.policy.uid)
    let frontendCreated = false
    let frontendUpdated = false
    if (!frontendKeyObj) {
      frontendKeyObj = await this.createMeiliKey(
        meiliUrl,
        meiliMasterKey,
        frontendOutput.policy.uid,
        frontendOutput.policy.description,
        frontendOutput.policy.actions,
        frontendOutput.policy.indexes,
      )
      frontendCreated = true
    } else if (
      !meiliKeyMatchesPolicy(
        frontendKeyObj,
        frontendOutput.policy.uid,
        frontendOutput.policy.description,
        frontendOutput.policy.actions,
        frontendOutput.policy.indexes,
      )
    ) {
      frontendKeyObj = await this.updateMeiliKey(
        meiliUrl,
        meiliMasterKey,
        frontendOutput.policy.uid,
        frontendOutput.policy.description,
        frontendOutput.policy.actions,
        frontendOutput.policy.indexes,
      )
      frontendUpdated = true
    }

    const backendKey = typeof backendKeyObj.key === "string" ? backendKeyObj.key : ""
    const frontendKey = typeof frontendKeyObj.key === "string" ? frontendKeyObj.key : ""
    if (!backendKey || !frontendKey) {
      throw new UpstreamHttpError(502, "zane_meili_key_missing", "Provisioned Meilisearch keys were missing key values")
    }

    return {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      service_slug: input.serviceSlug,
      meili_url: meiliUrl,
      backend_key: backendKey,
      backend_env_var: backendEnvVar,
      backend_created: backendCreated,
      backend_updated: backendUpdated,
      frontend_key: frontendKey,
      frontend_env_var: frontendEnvVar,
      frontend_created: frontendCreated,
      frontend_updated: frontendUpdated,
    }
  }

  async verifyDeploy(input: VerifyDeployInput): Promise<{
    lane: Lane
    project_slug: string
    environment_name: string
    verified: boolean
    requested_service_ids: string[]
    deploy_service_ids: string[]
    triggered_service_ids: string[]
    checked_env_override_service_ids: string[]
    checked_persisted_env_service_ids: string[]
    checked_deployment_service_ids: string[]
    checked_deployments: Array<{
      service_id: string
      service_slug: string
      deployment_hash: string
      status: string
      status_reason: string | null
    }>
  }> {
    const session = await this.authenticate()
    const environment = await this.getEnvironment(session, input.projectSlug, input.environmentName)
    if (!environment) {
      throw new UpstreamHttpError(
        404,
        "zane_environment_not_found",
        `Environment ${input.environmentName} does not exist in project ${input.projectSlug}`,
      )
    }
    assertEnvironmentMatchesLane(environment, input.lane)

    const cardsPayload = await this.request<unknown>(
      session,
      "GET",
      `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(input.environmentName)}/service-list/`,
    )
    const services = normalizeServiceCards(cardsPayload ?? [])
    const serviceCardBySlug = new Map(services.map((service) => [service.slug, service]))
    const deployRepoServiceIdSet = new Set(input.deployServiceIds)
    const verifyServiceSlugByRepoId = buildVerifyServiceSlugByRepoId(
      input.expectedEnvOverrides,
      input.requiredPersistedEnv,
      input.deployments,
    )

    assertRepoServiceIdSubset(
      input.requestedServiceIds,
      deployRepoServiceIdSet,
      "requested_service_id",
      "requested_service_ids",
    )
    assertRepoServiceIdSubset(
      input.triggeredServiceIds,
      deployRepoServiceIdSet,
      "triggered_service_id",
      "triggered_service_ids",
    )
    assertRepoServiceIdSubset(
      input.expectedEnvOverrides.map((item) => item.service_id),
      deployRepoServiceIdSet,
      "expected_env_override.service_id",
      "expected_env_overrides",
    )
    assertRepoServiceIdSubset(
      input.requiredPersistedEnv.map((item) => item.service_id),
      deployRepoServiceIdSet,
      "required_persisted_env.service_id",
      "required_persisted_env",
    )
    assertRepoServiceIdSubset(
      input.deployments.map((item) => item.service_id),
      deployRepoServiceIdSet,
      "deployment.service_id",
      "deployments",
    )

    const expectedOverrideByServiceId = new Map(input.expectedEnvOverrides.map((item) => [item.service_id, item]))
    const requiredPersistedEnvByServiceId = new Map(input.requiredPersistedEnv.map((item) => [item.service_id, item]))
    const deploymentRefByServiceId = new Map<string, VerifyDeploymentRef>()
    for (const deploymentRef of input.deployments) {
      if (deploymentRefByServiceId.has(deploymentRef.service_id)) {
        throw new BadRequestError(`deployments contains duplicate service_id: ${deploymentRef.service_id}`)
      }
      deploymentRefByServiceId.set(deploymentRef.service_id, deploymentRef)
    }

    for (const repoServiceId of input.deployServiceIds) {
      const upstreamServiceSlug = verifyServiceSlugByRepoId.get(repoServiceId) ?? repoServiceId
      if (!serviceCardBySlug.has(upstreamServiceSlug)) {
        throw new UpstreamHttpError(
          404,
          "zane_service_not_found",
          `Expected deploy target ${repoServiceId} (resolved as ${upstreamServiceSlug}) was not found in ${input.projectSlug}/${input.environmentName}`,
        )
      }
    }

    const checkedDeployments: CheckedDeploymentResult[] = []
    const checkedServiceIds = new Set<string>()

    for (const repoServiceId of input.deployServiceIds) {
      const upstreamServiceSlug = verifyServiceSlugByRepoId.get(repoServiceId) ?? repoServiceId
      const serviceCard = serviceCardBySlug.get(upstreamServiceSlug)
      if (!serviceCard) {
        continue
      }

      const expectedOverride = expectedOverrideByServiceId.get(repoServiceId)
      const persistedEnvRequirement = requiredPersistedEnvByServiceId.get(repoServiceId)
      const deploymentRef = deploymentRefByServiceId.get(repoServiceId)

      let deployment: ZaneDeployment
      let checkedServiceSlug = serviceCard.slug

      if (deploymentRef) {
        deployment = await this.getDeployment(
          session,
          input.projectSlug,
          input.environmentName,
          serviceCard.slug,
          deploymentRef.deployment_hash,
        )
        checkedServiceSlug = deploymentRef.service_slug
      } else if (input.lane === "main") {
        const deployments = await this.listDeployments(session, input.projectSlug, input.environmentName, serviceCard.slug)
        const currentHealthy = deployments.find(
          (candidate) =>
            candidate.is_current_production === true && (candidate.status ?? "").toUpperCase() === "HEALTHY",
        )
        if (!currentHealthy) {
          throw new UpstreamHttpError(
            409,
            "zane_verify_deployment_missing",
            `No checked deployment or current healthy production deployment was found for ${serviceCard.slug}`,
          )
        }
        deployment = currentHealthy
      } else {
        throw new UpstreamHttpError(
          409,
          "zane_verify_deployment_missing",
          `No checked deployment was provided for ${serviceCard.slug}`,
        )
      }

      checkedServiceIds.add(repoServiceId)
      checkedDeployments.push({
        service_id: repoServiceId,
        service_slug: checkedServiceSlug,
        deployment_hash: deployment.hash,
        status: deployment.status,
        status_reason: deployment.status_reason ?? null,
      })

      if (!expectedOverride) {
        if (!persistedEnvRequirement) {
          continue
        }
      }

      const envVariables = new Map(
        (deployment.service_snapshot?.env_variables ?? []).map((envVar) => [envVar.key, envVar.value]),
      )

      if (expectedOverride) {
        for (const [key, value] of Object.entries(expectedOverride.env)) {
          if (envVariables.get(key) !== value) {
            throw new UpstreamHttpError(
              409,
              "zane_verify_env_mismatch",
              `Deployment ${deployment.hash} for ${checkedServiceSlug} is missing expected ${key} value`,
            )
          }
        }
      }

      if (persistedEnvRequirement) {
        for (const key of persistedEnvRequirement.env_keys) {
          const value = envVariables.get(key)
          if (typeof value !== "string" || value.length === 0) {
            throw new UpstreamHttpError(
              409,
              "zane_verify_persisted_env_missing",
              `Deployment ${deployment.hash} for ${checkedServiceSlug} is missing required persisted env key ${key}`,
            )
          }
        }
      }
    }

    if (input.deployServiceIds.length > 0 && checkedDeployments.length === 0) {
      throw new UpstreamHttpError(
        409,
        "zane_verify_no_deployments_checked",
        "Deploy verification did not check any deployments for the requested deploy_service_ids",
      )
    }

    if (checkedServiceIds.size !== deployRepoServiceIdSet.size) {
      const uncheckedServiceIds = input.deployServiceIds.filter((serviceId) => !checkedServiceIds.has(serviceId))
      throw new UpstreamHttpError(
        409,
        "zane_verify_service_coverage_incomplete",
        `Deploy verification did not cover all deploy_service_ids: ${uncheckedServiceIds.join(", ")}`,
      )
    }

    return {
      lane: input.lane,
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      verified: true,
      requested_service_ids: input.requestedServiceIds,
      deploy_service_ids: input.deployServiceIds,
      triggered_service_ids: input.triggeredServiceIds,
      checked_env_override_service_ids: input.expectedEnvOverrides.map((item) => item.service_id),
      checked_persisted_env_service_ids: input.requiredPersistedEnv.map((item) => item.service_id),
      checked_deployment_service_ids: checkedDeployments.map((item) => item.service_id),
      checked_deployments: checkedDeployments,
    }
  }

  private async triggerDeployment(target: ZaneResolvedTarget, body: JsonRecord): Promise<void> {
    const response = await fetch(`${this.#connectBaseUrl}${target.deploy_url}`, {
      method: "PUT",
      headers: this.buildUpstreamHeaders(undefined, "PUT"),
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      let errorMessage = `ZaneOps deploy trigger failed for ${target.service_slug} (HTTP ${response.status})`
      try {
        errorMessage = parseErrorMessage(await response.json(), errorMessage)
      } catch {
        // keep fallback message when upstream response is not JSON
      }
      throw new UpstreamHttpError(response.status, "zane_deploy_failed", errorMessage)
    }
  }

  private async getEnvironment(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
  ): Promise<ZaneEnvironmentWithVariables | null> {
    return await this.request<ZaneEnvironmentWithVariables>(
      session,
      "GET",
      `/api/projects/${encodeURIComponent(projectSlug)}/environment-details/${encodeURIComponent(environmentName)}/`,
      undefined,
      { allowNotFound: true },
    )
  }

  private buildUpstreamHeaders(session: ZaneSession | undefined, method: HttpMethod): Record<string, string> {
    const csrfToken = session?.cookies.get("csrftoken")
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    }

    if (session) {
      const cookieHeader = buildCookieHeader(session.cookies)
      if (cookieHeader) {
        headers.Cookie = cookieHeader
      }
    }

    if (method !== "GET" && csrfToken) {
      headers["X-CSRFToken"] = csrfToken
    }

    if (this.#connectHostHeader) {
      headers.Host = this.#connectHostHeader
    }

    return headers
  }

  private async getServiceDetails(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
    serviceSlug: string,
  ): Promise<ZaneServiceDetails> {
    const details = await this.request<ZaneServiceDetails>(
      session,
      "GET",
      `/api/projects/${encodeURIComponent(projectSlug)}/${encodeURIComponent(
        environmentName,
      )}/service-details/${encodeURIComponent(serviceSlug)}/`,
    )

    if (!details) {
      throw new UpstreamHttpError(
        404,
        "zane_service_not_found",
        `Service ${serviceSlug} was not found in ${projectSlug}/${environmentName}`,
      )
    }

    return details
  }

  private async waitForMeiliHealth(meiliUrl: string, healthPath: string): Promise<void> {
    const normalizedHealthPath = healthPath.startsWith("/") ? healthPath : `/${healthPath}`
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const response = await fetch(`${meiliUrl.replace(/\/+$/, "")}${normalizedHealthPath}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }).catch(() => null)

      if (response?.ok) {
        return
      }

      await sleep(2_000)
    }

    throw new UpstreamHttpError(
      504,
      "zane_meili_unhealthy",
      `Timed out waiting for Meilisearch health at ${meiliUrl}${normalizedHealthPath}`,
    )
  }

  private async getMeiliKeyByUid(
    meiliUrl: string,
    masterKey: string,
    uid: string,
  ): Promise<Record<string, unknown> | null> {
    const response = await fetch(`${meiliUrl.replace(/\/+$/, "")}/keys/${encodeURIComponent(uid)}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${masterKey}`,
      },
    })

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      let errorMessage = `Meilisearch key lookup failed for ${uid} (HTTP ${response.status})`
      try {
        errorMessage = parseErrorMessage(await response.json(), errorMessage)
      } catch {
        // keep fallback
      }
      throw new UpstreamHttpError(response.status, "zane_meili_key_lookup_failed", errorMessage)
    }

    return assertObject(await response.json(), `meili key ${uid}`)
  }

  private async createMeiliKey(
    meiliUrl: string,
    masterKey: string,
    uid: string,
    description: string,
    actions: string[],
    indexes: string[],
  ): Promise<Record<string, unknown>> {
    return await this.writeMeiliKey(meiliUrl, masterKey, "POST", "/keys", {
      uid,
      description,
      actions,
      indexes,
      expiresAt: null,
    })
  }

  private async updateMeiliKey(
    meiliUrl: string,
    masterKey: string,
    uid: string,
    description: string,
    actions: string[],
    indexes: string[],
  ): Promise<Record<string, unknown>> {
    return await this.writeMeiliKey(meiliUrl, masterKey, "PATCH", `/keys/${encodeURIComponent(uid)}`, {
      description,
      actions,
      indexes,
      expiresAt: null,
    })
  }

  private async writeMeiliKey(
    meiliUrl: string,
    masterKey: string,
    method: "POST" | "PATCH",
    path: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${meiliUrl.replace(/\/+$/, "")}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${masterKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      let errorMessage = `Meilisearch key ${method === "POST" ? "create" : "update"} failed (HTTP ${response.status})`
      try {
        errorMessage = parseErrorMessage(await response.json(), errorMessage)
      } catch {
        // keep fallback
      }
      throw new UpstreamHttpError(response.status, "zane_meili_key_write_failed", errorMessage)
    }

    return assertObject(await response.json(), "meili key response")
  }

  private async getDeployment(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
    serviceSlug: string,
    deploymentHash: string,
  ): Promise<ZaneDeployment> {
    const deployment = await this.request<ZaneDeployment>(
      session,
      "GET",
      `/api/projects/${encodeURIComponent(projectSlug)}/${encodeURIComponent(
        environmentName,
      )}/service-details/${encodeURIComponent(serviceSlug)}/deployments/${encodeURIComponent(deploymentHash)}/`,
    )

    if (!deployment) {
      throw new UpstreamHttpError(
        404,
        "zane_deployment_not_found",
        `Deployment ${deploymentHash} was not found for ${projectSlug}/${environmentName}/${serviceSlug}`,
      )
    }

    return deployment
  }

  private async listDeployments(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
    serviceSlug: string,
  ): Promise<ZaneDeployment[]> {
    const payload = await this.request<ZaneDeploymentListResponse>(
      session,
      "GET",
      `/api/projects/${encodeURIComponent(projectSlug)}/${encodeURIComponent(
        environmentName,
      )}/service-details/${encodeURIComponent(serviceSlug)}/deployments/`,
    )

    return Array.isArray(payload?.results) ? payload.results : []
  }

  private async findTriggeredDeployment(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
    serviceSlug: string,
    previousDeploymentHashes: Set<string>,
  ): Promise<ZaneDeployment> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const deployments = await this.listDeployments(session, projectSlug, environmentName, serviceSlug)
      const triggered = deployments.find((deployment) => !previousDeploymentHashes.has(deployment.hash))
      if (triggered) {
        return triggered
      }

      await sleep(500)
    }

    throw new UpstreamHttpError(
      502,
      "zane_deploy_not_observed",
      `Triggered deployment for ${serviceSlug} was not visible in deployment history`,
    )
  }
}
