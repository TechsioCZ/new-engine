import type { AppConfig } from "./config"
import type {
  ArchiveEnvironmentInput,
  EnvOverrideInput,
  Lane,
  ProvisionPreviewMeiliKeysInput,
  ResolveEnvironmentInput,
  ResolveTargetInput,
  ServiceType,
  TriggeredDeployment,
  VerifyDeployInput,
  ZaneEnvironment,
  ZaneEnvVariable,
  ZaneResolvedTarget,
  ZaneServiceCard,
  ZaneServiceDetails,
} from "./zane-contract"
import { UpstreamHttpError } from "./zane-errors"
import {
  ZaneUpstreamClient,
  type HttpMethod,
  type ZaneSession,
} from "./zane-upstream"
import { ZaneDeployOps } from "./zane-deploy-ops"
import { ZaneDeployVerifier } from "./zane-deploy-verify"
import { ZaneEnvironmentManager } from "./zane-environments"
import { ZaneSearchCredentialsProvisioner } from "./zane-search-credentials"
export type {
  ArchiveEnvironmentInput,
  EnvOverrideInput,
  ForbiddenEnvRequirement,
  Lane,
  PersistedEnvRequirement,
  ProvisionPreviewMeiliKeysInput,
  ResolveEnvironmentInput,
  ResolveTargetInput,
  ServiceType,
  TriggeredDeployment,
  VerifyDeployInput,
  VerifyDeploymentRef,
  ZaneEnvironment,
  ZaneEnvVariable,
  ZaneResolvedCurrentDeployment,
  ZaneResolvedTarget,
  ZaneServiceCard,
  ZaneServiceDetails,
  ZaneServiceUrl,
} from "./zane-contract"

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

interface ZaneEnvironmentWithVariables extends ZaneEnvironment {
  variables: Array<{
    id: string
    key: string
    value: string
  }>
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new UpstreamHttpError(502, "zane_payload_invalid", `${label} must be a non-empty string`)
  }

  return value.trim()
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
      throw new UpstreamHttpError(502, "zane_service_type_invalid", `${label} must be docker or git`)
  }
}

function assertObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UpstreamHttpError(502, "zane_payload_invalid", `${label} must be an object`)
  }

  return value as Record<string, unknown>
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

export class ZaneClient {
  readonly #upstream: ZaneUpstreamClient

  constructor(config: AppConfig) {
    this.#upstream = new ZaneUpstreamClient(config)
  }

  private async authenticate(forceRefresh = false): Promise<ZaneSession> {
    return await this.#upstream.authenticate(forceRefresh)
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
    return await this.#upstream.request(session, method, path, payload, options)
  }

  private createEnvironmentManager(): ZaneEnvironmentManager {
    return new ZaneEnvironmentManager({
      baseUrl: this.#upstream.baseUrl,
      authenticate: async () => await this.authenticate(),
      buildHeaders: (session, method) => this.buildUpstreamHeaders(session, method),
      getEnvironment: async (session, projectSlug, environmentName) =>
        await this.getEnvironment(session, projectSlug, environmentName),
      listServiceCards: async (session, projectSlug, environmentName) =>
        await this.listServiceCards(session, projectSlug, environmentName),
      getServiceDetails: async (session, projectSlug, environmentName, serviceSlug) =>
        await this.getServiceDetails(session, projectSlug, environmentName, serviceSlug),
      request: async (session, method, path, payload, options) =>
        await this.request(session, method, path, payload, options),
    })
  }

  private createDeployOps(): ZaneDeployOps {
    return new ZaneDeployOps({
      baseUrl: this.#upstream.baseUrl,
      authenticate: async () => await this.authenticate(),
      buildHeaders: (_session, method) => this.buildUpstreamHeaders(undefined, method),
      listServiceCards: async (session, projectSlug, environmentName) =>
        await this.listServiceCards(session, projectSlug, environmentName),
      getServiceDetails: async (session, projectSlug, environmentName, serviceSlug) =>
        await this.getServiceDetails(session, projectSlug, environmentName, serviceSlug),
      getDeployment: async (session, projectSlug, environmentName, serviceSlug, deploymentHash) =>
        await this.getDeployment(session, projectSlug, environmentName, serviceSlug, deploymentHash),
      listDeployments: async (session, projectSlug, environmentName, serviceSlug) =>
        await this.listDeployments(session, projectSlug, environmentName, serviceSlug),
      request: async (session, method, path, payload, options) =>
        await this.request(session, method, path, payload, options),
    })
  }

  private createSearchCredentialsProvisioner(): ZaneSearchCredentialsProvisioner {
    return new ZaneSearchCredentialsProvisioner({
      authenticate: async () => await this.authenticate(),
      getEnvironment: async (session, projectSlug, environmentName) =>
        await this.getEnvironment(session, projectSlug, environmentName),
      getServiceDetails: async (session, projectSlug, environmentName, serviceSlug) =>
        await this.getServiceDetails(session, projectSlug, environmentName, serviceSlug),
    })
  }

  private createDeployVerifier(): ZaneDeployVerifier {
    return new ZaneDeployVerifier({
      authenticate: async () => await this.authenticate(),
      getEnvironment: async (session, projectSlug, environmentName) =>
        await this.getEnvironment(session, projectSlug, environmentName),
      listServiceCards: async (session, projectSlug, environmentName) =>
        await this.listServiceCards(session, projectSlug, environmentName),
      getDeployment: async (session, projectSlug, environmentName, serviceSlug, deploymentHash) =>
        await this.getDeployment(session, projectSlug, environmentName, serviceSlug, deploymentHash),
      listDeployments: async (session, projectSlug, environmentName, serviceSlug) =>
        await this.listDeployments(session, projectSlug, environmentName, serviceSlug),
    })
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
    warnings: Array<{
      code: "preview_excluded_services_present" | "preview_extra_services_present"
      message: string
      service_slugs: string[]
    }>
  }> {
    const manager = this.createEnvironmentManager()

    return await manager.resolveEnvironment(input)
  }

  async archiveEnvironment(input: ArchiveEnvironmentInput): Promise<{
    project_slug: string
    environment_name: string
    deleted: boolean
    noop: boolean
    noop_reason: string | null
  }> {
    const manager = this.createEnvironmentManager()

    return await manager.archiveEnvironment(input)
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
    const ops = this.createDeployOps()

    return await ops.resolveTargets(input)
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
    const ops = this.createDeployOps()

    return await ops.applyEnvOverrides(input)
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
    const ops = this.createDeployOps()

    return await ops.triggerDeploys(input)
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
    const provider = this.createSearchCredentialsProvisioner()

    return await provider.provisionPreviewMeiliKeys(input)
  }

  async verifyDeploy(input: VerifyDeployInput): Promise<{
    lane: Lane
    project_slug: string
    environment_name: string
    verified: boolean
    requested_service_ids: string[]
    deploy_service_ids: string[]
    triggered_service_ids: string[]
    checked_preview_cloned_service_slugs: string[]
    warning_only_preview_service_slugs: string[]
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
    const verifier = this.createDeployVerifier()

    return await verifier.verify(input)
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
    return this.#upstream.buildHeaders(session, method)
  }

  private async listServiceCards(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
  ): Promise<ZaneServiceCard[]> {
    const cardsPayload = await this.request<unknown>(
      session,
      "GET",
      `/api/projects/${encodeURIComponent(projectSlug)}/${encodeURIComponent(environmentName)}/service-list/`,
    )

    return normalizeServiceCards(cardsPayload ?? [])
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

}
