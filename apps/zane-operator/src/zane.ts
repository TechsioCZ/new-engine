import type { AppConfig } from "./config"
import { BadRequestError } from "./db"

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
type Lane = "preview" | "main"
type ServiceType = "docker" | "git"
type JsonRecord = Record<string, unknown>
const ZANE_PRODUCTION_ENVIRONMENT_NAME = "production"

export interface ResolveEnvironmentInput {
  lane: Lane
  projectSlug: string
  environmentName: string
}

export interface ArchiveEnvironmentInput {
  projectSlug: string
  environmentName: string
}

export interface ResolveTargetInput {
  service_id: string
  service_name: string
}

export interface EnvOverrideInput {
  service_id: string
  service_name: string
  env: Record<string, string>
}

export interface VerifyDeploymentRef {
  service_id: string
  service_name: string
  deployment_hash: string
}

export interface VerifyDeployInput {
  lane: Lane
  projectSlug: string
  environmentName: string
  requestedServiceIds: string[]
  deployServiceIds: string[]
  triggeredServiceIds: string[]
  expectedEnvOverrides: EnvOverrideInput[]
  deployments: VerifyDeploymentRef[]
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

export interface ZaneServiceDetails {
  id: string
  slug: string
  type: ServiceType
  deploy_token: string
  env_variables: ZaneEnvVariable[]
}

export interface ZaneResolvedTarget {
  service_id: string
  service_name: string
  target_id: string
  service_slug: string
  service_type: ServiceType
  deploy_token: string
  deploy_url: string
  env_change_url: string
  details_url: string
}

export interface TriggeredDeployment {
  service_id: string
  service_name: string
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
  status: string
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

function assertLane(value: unknown, label: string): Lane {
  const lane = assertString(value, label)
  if (lane !== "preview" && lane !== "main") {
    throw new BadRequestError(`${label} must be preview or main`)
  }

  return lane
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
      service_id: assertString(object.service_id ?? object.id, `${label}[${index}].service_id`),
      service_name: assertString(object.service_name, `${label}[${index}].service_name`),
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
      service_name: assertString(object.service_name, `${label}[${index}].service_name`),
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
      service_name: assertString(object.service_name, `${label}[${index}].service_name`),
      deployment_hash: assertString(object.deployment_hash, `${label}[${index}].deployment_hash`),
    }
  })
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

  constructor(config: AppConfig) {
    const deployConfig = requireZaneDeployConfig(config)
    this.#connectBaseUrl = deployConfig.connectBaseUrl
    this.#connectHostHeader = deployConfig.connectHostHeader
    this.#username = deployConfig.username
    this.#password = deployConfig.password
    this.#sessionCacheKey = `${this.#connectBaseUrl}\n${this.#username}`
  }

  static parseResolveEnvironmentInput(rawPayload: unknown): ResolveEnvironmentInput {
    const payload = assertObject(rawPayload, "request body")
    return {
      lane: assertLane(payload.lane, "lane"),
      projectSlug: normalizeProjectSlugFromPayload(payload),
      environmentName: assertString(payload.environment_name, "environment_name"),
    }
  }

  static parseArchiveEnvironmentInput(rawPayload: unknown): ArchiveEnvironmentInput {
    const payload = assertObject(rawPayload, "request body")
    return {
      projectSlug: normalizeProjectSlugFromPayload(payload),
      environmentName: assertString(payload.environment_name, "environment_name"),
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
  } {
    const payload = assertObject(rawPayload, "request body")
    return {
      projectSlug: normalizeProjectSlugFromPayload(payload),
      environmentName: assertString(payload.environment_name, "environment_name"),
      targets: ZaneClient.parseResolvedTargets(payload.targets),
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
        service_name: assertString(object.service_name, `targets[${index}].service_name`),
        target_id: assertString(object.target_id, `targets[${index}].target_id`),
        service_slug: assertString(object.service_slug, `targets[${index}].service_slug`),
        service_type: assertServiceType(object.service_type, `targets[${index}].service_type`),
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
  }> {
    const session = await this.authenticate()
    const existing = await this.getEnvironment(session, input.projectSlug, input.environmentName)

    if (existing) {
      return {
        lane: input.lane,
        project_slug: input.projectSlug,
        environment_id: existing.id,
        environment_name: existing.name,
        is_preview: existing.is_preview,
        created: false,
        cloned_from_environment: null,
      }
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

    return {
      lane: input.lane,
      project_slug: input.projectSlug,
      environment_id: cloned.id,
      environment_name: cloned.name,
      is_preview: cloned.is_preview,
      created: true,
      cloned_from_environment: ZANE_PRODUCTION_ENVIRONMENT_NAME,
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
        const card = cardBySlug.get(service.service_name)
        if (!card) {
          throw new UpstreamHttpError(
            404,
            "zane_service_not_found",
            `Service ${service.service_name} was not found in ${input.projectSlug}/${input.environmentName}`,
          )
        }

        const details = await this.getServiceDetails(session, input.projectSlug, input.environmentName, service.service_name)
        return {
          service_id: service.service_id,
          service_name: service.service_name,
          target_id: card.id,
          service_slug: details.slug,
          service_type: details.type,
          deploy_token: details.deploy_token,
          deploy_url:
            details.type === "docker"
              ? `/api/deploy-service/docker/${details.deploy_token}/`
              : `/api/deploy-service/git/${details.deploy_token}/`,
          env_change_url: `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(
            input.environmentName,
          )}/request-service-changes/${encodeURIComponent(details.slug)}/`,
          details_url: `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(
            input.environmentName,
          )}/service-details/${encodeURIComponent(details.slug)}/`,
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
      service_name: string
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
      service_name: string
      key: string
      change_type: "ADD" | "UPDATE" | "SKIP"
    }> = []

    for (const override of input.envOverrides) {
      const target = targetsByServiceId.get(override.service_id)
      if (!target) {
        throw new UpstreamHttpError(
          404,
          "zane_target_missing",
          `No resolved target found for service ${override.service_name} (${override.service_id})`,
        )
      }

      const serviceDetails = await this.getServiceDetails(session, input.projectSlug, input.environmentName, target.service_slug)
      const envByKey = new Map(serviceDetails.env_variables.map((envVar) => [envVar.key, envVar]))

      for (const [key, value] of Object.entries(override.env)) {
        const current = envByKey.get(key)
        if (current?.value === value) {
          appliedChanges.push({
            service_id: override.service_id,
            service_name: override.service_name,
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
          service_name: override.service_name,
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
            : { cleanup_queue: false, ignore_build_cache: false }

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
          service_name: target.service_name,
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

  async verifyDeploy(input: VerifyDeployInput): Promise<{
    lane: Lane
    project_slug: string
    environment_name: string
    verified: boolean
    requested_service_ids: string[]
    deploy_service_ids: string[]
    triggered_service_ids: string[]
    checked_env_override_service_ids: string[]
  }> {
    if (input.lane === "main" && input.expectedEnvOverrides.length > 0) {
      throw new UpstreamHttpError(409, "zane_verify_preview_only_override", "Main deploy must not apply preview-only env overrides")
    }

    const session = await this.authenticate()
    const environment = await this.getEnvironment(session, input.projectSlug, input.environmentName)
    if (!environment) {
      throw new UpstreamHttpError(
        404,
        "zane_environment_not_found",
        `Environment ${input.environmentName} does not exist in project ${input.projectSlug}`,
      )
    }

    const cardsPayload = await this.request<unknown>(
      session,
      "GET",
      `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(input.environmentName)}/service-list/`,
    )
    const services = normalizeServiceCards(cardsPayload ?? [])
    const availableServiceSlugs = new Set(services.map((service) => service.slug))

    for (const expectedOverride of input.expectedEnvOverrides) {
      if (!availableServiceSlugs.has(expectedOverride.service_name)) {
        throw new UpstreamHttpError(
          404,
          "zane_service_not_found",
          `Expected override target ${expectedOverride.service_name} was not found in ${input.projectSlug}/${input.environmentName}`,
        )
      }
    }

    for (const deploymentRef of input.deployments) {
      const deployment = await this.getDeployment(
        session,
        input.projectSlug,
        input.environmentName,
        deploymentRef.service_name,
        deploymentRef.deployment_hash,
      )

      const envVariables = new Map(
        (deployment.service_snapshot?.env_variables ?? []).map((envVar) => [envVar.key, envVar.value]),
      )

      const expectedOverride = input.expectedEnvOverrides.find(
        (candidate) => candidate.service_id === deploymentRef.service_id,
      )
      if (!expectedOverride) {
        continue
      }

      for (const [key, value] of Object.entries(expectedOverride.env)) {
        if (envVariables.get(key) !== value) {
          throw new UpstreamHttpError(
            409,
            "zane_verify_env_mismatch",
            `Deployment ${deployment.hash} for ${deploymentRef.service_name} is missing expected ${key} value`,
          )
        }
      }
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
    }
  }

  private async triggerDeployment(target: ZaneResolvedTarget, body: JsonRecord): Promise<void> {
    const response = await fetch(`${this.#connectBaseUrl}${target.deploy_url}`, {
      method: "PUT",
      headers: this.buildUpstreamHeaders(undefined, "PUT"),
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      let errorMessage = `ZaneOps deploy trigger failed for ${target.service_name} (HTTP ${response.status})`
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
