import { isRecord } from "@techsio/std/object"

import type { AppConfig } from "./config"
import { BadRequestError } from "./db"
import type {
  ArchiveEnvironmentInput,
  EnvOverrideInput,
  Lane,
  PreviewRuntimeValueSourceInput,
  ProvisionMedusaPublishableKeyInput,
  ProvisionMeiliKeysInput,
  ReadPreviewCommitStateInput,
  ResolveEnvironmentInput,
  ResolveTargetInput,
  RuntimeProviderOutputInput,
  RuntimeProviderRunInput,
  RuntimeProviderRunResult,
  ServiceType,
  SyncPreviewRandomOnceSecretsInput,
  SyncPreviewServiceEnvInput,
  SyncPreviewSharedEnvInput,
  TriggeredDeployment,
  VerifyDeployInput,
  WritePreviewCommitStateInput,
  ZaneEnvironment,
  ZaneEnvVariable,
  ZaneResolvedTarget,
  ZaneServiceCard,
  ZaneServiceDetails,
  ZaneServiceHealthcheck,
  ZaneServiceResourceLimits,
} from "./zane-contract"
import { ZaneDeployOps } from "./zane-deploy-ops"
import { ZaneDeployVerifier } from "./zane-deploy-verify"
import { computeEffectiveEnvVariables } from "./zane-effective-service-state"
import { buildServicePublicUrls } from "./zane-effective-service-urls"
import { ZaneEnvironmentManager } from "./zane-environments"
import { UpstreamHttpError } from "./zane-errors"
import { ZaneMedusaPublishableKeyProvisioner } from "./zane-medusa-publishable-key"
import { ZaneMeiliApiCredentialsProvisioner } from "./zane-meili-api-credentials"
import { ZaneUpstreamClient } from "./zane-upstream"
import type { HttpMethod, ZaneSession } from "./zane-upstream"

export type {
  ArchiveEnvironmentInput,
  EnvOverrideInput,
  Lane,
  ResolveEnvironmentInput,
  ResolveTargetInput,
  TriggeredDeployment,
  VerifyDeployInput,
  ZaneResolvedTarget,
  ZaneServiceCard,
  ZaneServiceDetails,
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
  variables: {
    id: string
    key: string
    value: string
  }[]
}

interface PreviewRuntimeSourceContext {
  session: ZaneSession
  projectSlug: string
  environmentName: string
  environment: ZaneEnvironmentWithVariables
  envByKey: Map<string, { id: string; key: string; value: string }>
  source: PreviewRuntimeValueSourceInput
  label: string
  serviceDetailsByRef: Map<string, ZaneServiceDetails>
}

const previewTargetCommitEnvKey = "ZANE_OPERATOR_PREVIEW_TARGET_COMMIT_SHA"
const previewLastDeployedCommitEnvKey =
  "ZANE_OPERATOR_PREVIEW_LAST_DEPLOYED_COMMIT_SHA"
const previewBaselineCompleteEnvKey = "ZANE_OPERATOR_PREVIEW_BASELINE_COMPLETE"

const assertString = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new UpstreamHttpError(
      502,
      "zane_payload_invalid",
      `${label} must be a non-empty string`,
    )
  }

  return value.trim()
}

const assertServiceType = (value: unknown, label: string): ServiceType => {
  const rawServiceType = assertString(value, label)

  switch (rawServiceType.toUpperCase()) {
    case "DOCKER":
    case "DOCKER_REGISTRY": {
      return "docker"
    }
    case "GIT":
    case "GIT_REPOSITORY": {
      return "git"
    }
    default: {
      throw new UpstreamHttpError(
        502,
        "zane_service_type_invalid",
        `${label} must be docker or git`,
      )
    }
  }
}

const assertObject = (
  value: unknown,
  label: string,
): Record<string, unknown> => {
  if (!isRecord(value)) {
    throw new UpstreamHttpError(
      502,
      "zane_payload_invalid",
      `${label} must be an object`,
    )
  }

  return value
}

const assertStringArrayInput = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value)) {
    throw new BadRequestError(`${label} must be an array`)
  }

  return value.map((item, index) => {
    if (typeof item !== "string" || !item.trim()) {
      throw new BadRequestError(`${label}[${index}] must be a non-empty string`)
    }

    return item.trim()
  })
}

const toMeiliProvisionOutputInput = (
  output: RuntimeProviderOutputInput,
  label: string,
): NonNullable<ProvisionMeiliKeysInput["backendOutput"]> => {
  if (output.policy.kind !== "meilisearch_key") {
    throw new BadRequestError(
      `${label}.policy.kind must be meilisearch_key for meili_api_credentials`,
    )
  }

  const { uid } = output.policy
  const { description } = output.policy
  if (typeof uid !== "string" || !uid.trim()) {
    throw new BadRequestError(`${label}.policy.uid must be a non-empty string`)
  }
  if (typeof description !== "string" || !description.trim()) {
    throw new BadRequestError(
      `${label}.policy.description must be a non-empty string`,
    )
  }

  return {
    envVar: output.envVar,
    policy: {
      actions: assertStringArrayInput(
        output.policy.actions,
        `${label}.policy.actions`,
      ),
      description: description.trim(),
      indexes: assertStringArrayInput(
        output.policy.indexes,
        `${label}.policy.indexes`,
      ),
      uid: uid.trim(),
    },
  }
}

const toMedusaPublishableKeyProvisionOutputInput = (
  output: RuntimeProviderOutputInput,
  label: string,
): ProvisionMedusaPublishableKeyInput["frontendOutput"] => {
  if (output.policy.kind !== "medusa_publishable_key") {
    throw new BadRequestError(
      `${label}.policy.kind must be medusa_publishable_key for medusa_publishable_key`,
    )
  }

  const { title } = output.policy
  if (
    title !== null &&
    title !== undefined &&
    (typeof title !== "string" || !title.trim())
  ) {
    throw new BadRequestError(
      `${label}.policy.title must be a non-empty string when provided`,
    )
  }

  return {
    envVar: output.envVar,
    policy:
      typeof title === "string" && title.trim() ? { title: title.trim() } : {},
  }
}

const normalizeServiceCards = (payload: unknown): ZaneServiceCard[] => {
  if (!Array.isArray(payload)) {
    throw new UpstreamHttpError(
      502,
      "zane_service_list_invalid",
      "ZaneOps service list response was not an array",
    )
  }

  return payload.map((item, index) => {
    const object = assertObject(item, `service_list[${index}]`)
    return {
      id: assertString(object.id, `service_list[${index}].id`),
      slug: assertString(object.slug, `service_list[${index}].slug`),
      type: assertServiceType(object.type, `service_list[${index}].type`),
      ...(typeof object.status === "string" ? { status: object.status } : {}),
    }
  })
}

const normalizeDockerfileBuilderOptions = (
  value: unknown,
):
  | NonNullable<ZaneServiceDetails["dockerfile_builder_options"]>
  | undefined => {
  if (!isRecord(value)) {
    return undefined
  }

  return {
    ...(typeof value.dockerfile_path === "string" ||
    value.dockerfile_path === null
      ? { dockerfile_path: value.dockerfile_path }
      : {}),
    ...(typeof value.build_context_dir === "string" ||
    value.build_context_dir === null
      ? { build_context_dir: value.build_context_dir }
      : {}),
    ...(typeof value.build_stage_target === "string" ||
    value.build_stage_target === null
      ? { build_stage_target: value.build_stage_target }
      : {}),
  }
}

const normalizeEnvVariables = (
  value: unknown,
): ZaneEnvVariable[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined
  }

  const variables: ZaneEnvVariable[] = []
  for (const entry of value) {
    if (
      isRecord(entry) &&
      typeof entry.id === "string" &&
      typeof entry.key === "string" &&
      typeof entry.value === "string"
    ) {
      variables.push({
        id: entry.id,
        key: entry.key,
        value: entry.value,
      })
    }
  }
  return variables
}

const normalizeServiceUrls = (value: unknown): ZaneServiceDetails["urls"] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.domain !== "string" ||
      typeof entry.base_path !== "string"
    ) {
      return []
    }

    return [
      {
        base_path: entry.base_path,
        domain: entry.domain,
        ...(typeof entry.id === "string" ? { id: entry.id } : {}),
        ...(typeof entry.strip_prefix === "boolean"
          ? { strip_prefix: entry.strip_prefix }
          : {}),
        ...(typeof entry.redirect_to === "string" || entry.redirect_to === null
          ? { redirect_to: entry.redirect_to }
          : {}),
        ...(typeof entry.associated_port === "number" ||
        entry.associated_port === null
          ? { associated_port: entry.associated_port }
          : {}),
      },
    ]
  })
}

const normalizeServiceVolumes = (
  value: unknown,
): NonNullable<ZaneServiceDetails["volumes"]> | undefined => {
  if (!Array.isArray(value)) {
    return undefined
  }

  return value.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.name !== "string" ||
      typeof entry.container_path !== "string" ||
      typeof entry.mode !== "string"
    ) {
      return []
    }

    return [
      {
        container_path: entry.container_path,
        mode: entry.mode,
        name: entry.name,
        ...(typeof entry.id === "string" ? { id: entry.id } : {}),
        ...(typeof entry.host_path === "string" || entry.host_path === null
          ? { host_path: entry.host_path }
          : {}),
      },
    ]
  })
}

const normalizeUnappliedChanges = (
  value: unknown,
): NonNullable<ZaneServiceDetails["unapplied_changes"]> | undefined => {
  if (!Array.isArray(value)) {
    return undefined
  }

  return value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.id !== "string") {
      return []
    }

    return [
      {
        id: entry.id,
        ...(typeof entry.type === "string" ? { type: entry.type } : {}),
        ...(typeof entry.field === "string" ? { field: entry.field } : {}),
        ...(typeof entry.item_id === "string" || entry.item_id === null
          ? { item_id: entry.item_id }
          : {}),
        ...(isRecord(entry.new_value) || entry.new_value === null
          ? { new_value: entry.new_value }
          : {}),
        ...(isRecord(entry.old_value) || entry.old_value === null
          ? { old_value: entry.old_value }
          : {}),
      },
    ]
  })
}

// The environment reference carries the variables that bootstrap-generated
// {{env.X}} references resolve against. Dropping it makes the Meilisearch and
// Medusa provisioners fall back to the literal placeholder as a credential.
const normalizeEnvironmentReference = (
  value: unknown,
): ZaneServiceDetails["environment"] | undefined => {
  if (value === null) {
    return null
  }

  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string"
  ) {
    return undefined
  }

  const variables = normalizeEnvVariables(value.variables)
  return {
    id: value.id,
    name: value.name,
    ...(variables === undefined ? {} : { variables }),
  }
}

const normalizeGitAppRef = (
  value: unknown,
): ZaneServiceDetails["git_app"] | undefined => {
  if (value === null) {
    return null
  }

  return isRecord(value) && typeof value.id === "string"
    ? { id: value.id }
    : undefined
}

const normalizeHealthcheck = (
  value: unknown,
): ZaneServiceHealthcheck | null | undefined => {
  if (value === null) {
    return null
  }
  if (!isRecord(value)) {
    return undefined
  }
  if (typeof value.type !== "string" || typeof value.value !== "string") {
    return undefined
  }
  if (
    typeof value.timeout_seconds !== "number" ||
    typeof value.interval_seconds !== "number"
  ) {
    return undefined
  }

  return {
    interval_seconds: value.interval_seconds,
    timeout_seconds: value.timeout_seconds,
    type: value.type,
    value: value.value,
    ...(typeof value.associated_port === "number" ||
    value.associated_port === null
      ? { associated_port: value.associated_port }
      : {}),
  }
}

const normalizeResourceLimits = (
  value: unknown,
): ZaneServiceResourceLimits | null | undefined => {
  if (value === null) {
    return null
  }
  if (!isRecord(value)) {
    return undefined
  }

  const { memory } = value
  let normalizedMemory: ZaneServiceResourceLimits["memory"] | undefined
  if (memory === null) {
    normalizedMemory = null
  } else if (isRecord(memory)) {
    normalizedMemory = {
      ...(typeof memory.unit === "string" ? { unit: memory.unit } : {}),
      ...(typeof memory.value === "number" || typeof memory.value === "string"
        ? { value: memory.value }
        : {}),
    }
  }

  return {
    ...(typeof value.cpus === "number" ||
    typeof value.cpus === "string" ||
    value.cpus === null
      ? { cpus: value.cpus }
      : {}),
    ...(normalizedMemory === undefined ? {} : { memory: normalizedMemory }),
  }
}

const normalizeServiceDetails = (
  payload: unknown,
  label: string,
): ZaneServiceDetails => {
  const object = assertObject(payload, label)
  const dockerfileBuilderOptions = normalizeDockerfileBuilderOptions(
    object.dockerfile_builder_options,
  )
  const environment = normalizeEnvironmentReference(object.environment)
  const gitApp = normalizeGitAppRef(object.git_app)
  const healthcheck = normalizeHealthcheck(object.healthcheck)
  const resourceLimits = normalizeResourceLimits(object.resource_limits)
  const systemEnvVariables = normalizeEnvVariables(object.system_env_variables)
  const unappliedChanges = normalizeUnappliedChanges(object.unapplied_changes)
  const volumes = normalizeServiceVolumes(object.volumes)

  return {
    deploy_token: assertString(object.deploy_token, `${label}.deploy_token`),
    env_variables: normalizeEnvVariables(object.env_variables) ?? [],
    global_network_alias:
      typeof object.global_network_alias === "string"
        ? object.global_network_alias
        : null,
    id: assertString(object.id, `${label}.id`),
    slug: assertString(object.slug, `${label}.slug`),
    type: assertServiceType(object.type, `${label}.type`),
    urls: normalizeServiceUrls(object.urls),
    ...(typeof object.network_alias === "string"
      ? { network_alias: object.network_alias }
      : {}),
    ...(typeof object.commit_sha === "string"
      ? { commit_sha: object.commit_sha }
      : {}),
    ...(typeof object.repository_url === "string"
      ? { repository_url: object.repository_url }
      : {}),
    ...(typeof object.branch_name === "string"
      ? { branch_name: object.branch_name }
      : {}),
    ...(typeof object.builder === "string" ? { builder: object.builder } : {}),
    ...(typeof object.command === "string" ? { command: object.command } : {}),
    ...(environment === undefined ? {} : { environment }),
    ...(systemEnvVariables === undefined
      ? {}
      : { system_env_variables: systemEnvVariables }),
    ...(volumes === undefined ? {} : { volumes }),
    ...(unappliedChanges === undefined
      ? {}
      : { unapplied_changes: unappliedChanges }),
    ...(dockerfileBuilderOptions === undefined
      ? {}
      : { dockerfile_builder_options: dockerfileBuilderOptions }),
    ...(gitApp === undefined ? {} : { git_app: gitApp }),
    ...(healthcheck === undefined ? {} : { healthcheck }),
    ...(resourceLimits === undefined
      ? {}
      : { resource_limits: resourceLimits }),
  }
}

const previewRandomOnceSecretPersistsToZaneEnv = (secret: {
  persistTo?: string
}): boolean => (secret.persistTo ?? "zane_env") === "zane_env"

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
      authenticate: async () => await this.authenticate(),
      baseUrl: this.#upstream.baseUrl,
      buildHeaders: (session, method) =>
        this.buildUpstreamHeaders(session, method),
      getEnvironment: async (session, projectSlug, environmentName) =>
        await this.getEnvironment(session, projectSlug, environmentName),
      getServiceDetails: async (
        session,
        projectSlug,
        environmentName,
        serviceSlug,
      ) =>
        await this.getServiceDetails(
          session,
          projectSlug,
          environmentName,
          serviceSlug,
        ),
      listServiceCards: async (session, projectSlug, environmentName) =>
        await this.listServiceCards(session, projectSlug, environmentName),
      request: async (session, method, path, payload, options) =>
        await this.request(session, method, path, payload, options),
    })
  }

  private createDeployOps(): ZaneDeployOps {
    return new ZaneDeployOps({
      authenticate: async () => await this.authenticate(),
      baseUrl: this.#upstream.baseUrl,
      buildHeaders: (_session, method) =>
        this.buildUpstreamHeaders(undefined, method),
      getDeployment: async (
        session,
        projectSlug,
        environmentName,
        serviceSlug,
        deploymentHash,
      ) =>
        await this.getDeployment(
          session,
          projectSlug,
          environmentName,
          serviceSlug,
          deploymentHash,
        ),
      getServiceDetails: async (
        session,
        projectSlug,
        environmentName,
        serviceSlug,
      ) =>
        await this.getServiceDetails(
          session,
          projectSlug,
          environmentName,
          serviceSlug,
        ),
      listDeployments: async (
        session,
        projectSlug,
        environmentName,
        serviceSlug,
      ) =>
        await this.listDeployments(
          session,
          projectSlug,
          environmentName,
          serviceSlug,
        ),
      listServiceCards: async (session, projectSlug, environmentName) =>
        await this.listServiceCards(session, projectSlug, environmentName),
      request: async (session, method, path, payload, options) =>
        await this.request(session, method, path, payload, options),
    })
  }

  private createMeiliApiCredentialsProvisioner(): ZaneMeiliApiCredentialsProvisioner {
    return new ZaneMeiliApiCredentialsProvisioner({
      authenticate: async () => await this.authenticate(),
      getEnvironment: async (session, projectSlug, environmentName) =>
        await this.getEnvironment(session, projectSlug, environmentName),
      getServiceDetails: async (
        session,
        projectSlug,
        environmentName,
        serviceSlug,
      ) =>
        await this.getServiceDetails(
          session,
          projectSlug,
          environmentName,
          serviceSlug,
        ),
    })
  }

  private createMedusaPublishableKeyProvisioner(): ZaneMedusaPublishableKeyProvisioner {
    return new ZaneMedusaPublishableKeyProvisioner({
      authenticate: async () => await this.authenticate(),
      getEnvironment: async (session, projectSlug, environmentName) =>
        await this.getEnvironment(session, projectSlug, environmentName),
      getServiceDetails: async (
        session,
        projectSlug,
        environmentName,
        serviceSlug,
      ) =>
        await this.getServiceDetails(
          session,
          projectSlug,
          environmentName,
          serviceSlug,
        ),
    })
  }

  private createDeployVerifier(): ZaneDeployVerifier {
    return new ZaneDeployVerifier({
      authenticate: async () => await this.authenticate(),
      getDeployment: async (
        session,
        projectSlug,
        environmentName,
        serviceSlug,
        deploymentHash,
      ) =>
        await this.getDeployment(
          session,
          projectSlug,
          environmentName,
          serviceSlug,
          deploymentHash,
        ),
      getEnvironment: async (session, projectSlug, environmentName) =>
        await this.getEnvironment(session, projectSlug, environmentName),
      listDeployments: async (
        session,
        projectSlug,
        environmentName,
        serviceSlug,
      ) =>
        await this.listDeployments(
          session,
          projectSlug,
          environmentName,
          serviceSlug,
        ),
      listServiceCards: async (session, projectSlug, environmentName) =>
        await this.listServiceCards(session, projectSlug, environmentName),
    })
  }

  async resolveEnvironment(input: ResolveEnvironmentInput): Promise<{
    lane: Lane
    project_slug: string
    environment_id: string
    environment_name: string
    is_preview: boolean
    created: boolean
    baseline_complete: boolean
    cloned_from_environment: string | null
    ready: boolean
    expected_preview_service_slugs: string[]
    excluded_preview_service_slugs: string[]
    present_service_slugs: string[]
    missing_preview_service_slugs: string[]
    warnings: {
      code:
        | "preview_excluded_services_present"
        | "preview_extra_services_present"
      message: string
      service_slugs: string[]
    }[]
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

  async readPreviewCommitState(input: ReadPreviewCommitStateInput): Promise<{
    project_slug: string
    environment_name: string
    environment_exists: boolean
    baseline_complete: boolean
    target_commit_sha: string | null
    last_deployed_commit_sha: string | null
  }> {
    const session = await this.authenticate()
    const environment = await this.getEnvironment(
      session,
      input.projectSlug,
      input.environmentName,
    )

    return {
      baseline_complete:
        ZaneClient.getSharedEnvironmentVariable(
          environment,
          previewBaselineCompleteEnvKey,
        ) === "true",
      environment_exists: environment !== null,
      environment_name: input.environmentName,
      last_deployed_commit_sha:
        ZaneClient.getSharedEnvironmentVariable(
          environment,
          previewLastDeployedCommitEnvKey,
        ) ?? null,
      project_slug: input.projectSlug,
      target_commit_sha:
        ZaneClient.getSharedEnvironmentVariable(
          environment,
          previewTargetCommitEnvKey,
        ) ?? null,
    }
  }

  async writePreviewCommitState(input: WritePreviewCommitStateInput): Promise<{
    project_slug: string
    environment_name: string
    environment_exists: boolean
    baseline_complete: boolean
    target_commit_sha: string | null
    last_deployed_commit_sha: string | null
  }> {
    const session = await this.authenticate()
    const environment = await this.getEnvironment(
      session,
      input.projectSlug,
      input.environmentName,
    )

    if (!environment) {
      throw new UpstreamHttpError(
        404,
        "zane_environment_not_found",
        `Environment ${input.projectSlug}/${input.environmentName} was not found`,
      )
    }

    const envByKey = new Map(
      environment.variables.map((variable) => [variable.key, variable]),
    )

    const [targetCommitSha, lastDeployedCommitSha, baselineComplete] =
      await Promise.all([
        this.upsertSharedEnvironmentVariable({
          envByKey,
          environmentName: input.environmentName,
          key: previewTargetCommitEnvKey,
          projectSlug: input.projectSlug,
          session,
          value: input.targetCommitSha,
        }),
        this.upsertSharedEnvironmentVariable({
          envByKey,
          environmentName: input.environmentName,
          key: previewLastDeployedCommitEnvKey,
          projectSlug: input.projectSlug,
          session,
          value: input.lastDeployedCommitSha,
        }),
        this.upsertSharedEnvironmentVariable({
          envByKey,
          environmentName: input.environmentName,
          key: previewBaselineCompleteEnvKey,
          projectSlug: input.projectSlug,
          session,
          value:
            typeof input.baselineComplete === "boolean"
              ? String(input.baselineComplete)
              : undefined,
        }),
      ])

    return {
      baseline_complete:
        (baselineComplete ??
          ZaneClient.getSharedEnvironmentVariable(
            environment,
            previewBaselineCompleteEnvKey,
          )) === "true",
      environment_exists: true,
      environment_name: input.environmentName,
      last_deployed_commit_sha:
        lastDeployedCommitSha ??
        ZaneClient.getSharedEnvironmentVariable(
          environment,
          previewLastDeployedCommitEnvKey,
        ) ??
        null,
      project_slug: input.projectSlug,
      target_commit_sha:
        targetCommitSha ??
        ZaneClient.getSharedEnvironmentVariable(
          environment,
          previewTargetCommitEnvKey,
        ) ??
        null,
    }
  }

  async syncPreviewRandomOnceSecrets(
    input: SyncPreviewRandomOnceSecretsInput,
  ): Promise<{
    project_slug: string
    environment_name: string
    environment_exists: boolean
    secrets: {
      secret_id: string
      value: string
    }[]
    missing_secret_ids: string[]
  }> {
    const session = await this.authenticate()
    const environment = await this.getEnvironment(
      session,
      input.projectSlug,
      input.environmentName,
    )

    if (!environment) {
      throw new UpstreamHttpError(
        404,
        "zane_environment_not_found",
        `Environment ${input.projectSlug}/${input.environmentName} was not found`,
      )
    }

    const envByKey = new Map(
      environment.variables.map((variable) => [variable.key, variable]),
    )
    const serviceDetailsBySlug = new Map<string, ZaneServiceDetails>()
    const results = await Promise.all(
      input.secrets.map(
        async (secret) =>
          await this.resolvePreviewRandomOnceSecret({
            envByKey,
            environment,
            environmentName: input.environmentName,
            projectSlug: input.projectSlug,
            secret,
            serviceDetailsBySlug,
            session,
          }),
      ),
    )
    const secrets = results.flatMap((result) =>
      result.secret === undefined ? [] : [result.secret],
    )
    const missingSecretIds = results.flatMap((result) =>
      result.missingSecretId === undefined ? [] : [result.missingSecretId],
    )

    return {
      environment_exists: true,
      environment_name: input.environmentName,
      missing_secret_ids: missingSecretIds,
      project_slug: input.projectSlug,
      secrets,
    }
  }

  private async resolvePreviewRandomOnceSecret(input: {
    session: ZaneSession
    projectSlug: string
    environmentName: string
    environment: ZaneEnvironmentWithVariables
    envByKey: Map<string, { id: string; key: string; value: string }>
    serviceDetailsBySlug: Map<string, ZaneServiceDetails>
    secret: SyncPreviewRandomOnceSecretsInput["secrets"][number]
  }): Promise<{
    secret?: { secret_id: string; value: string }
    missingSecretId?: string
  }> {
    if (previewRandomOnceSecretPersistsToZaneEnv(input.secret)) {
      return await this.resolveZaneEnvPreviewRandomOnceSecret(input)
    }

    if (input.secret.value !== undefined && input.secret.value !== "") {
      return {
        secret: {
          secret_id: input.secret.secretId,
          value: input.secret.value,
        },
      }
    }

    const targetValues = await Promise.all(
      input.secret.targets.map(async (target) => {
        let serviceDetails = input.serviceDetailsBySlug.get(target.serviceSlug)
        if (serviceDetails === undefined) {
          serviceDetails = await this.getServiceDetails(
            input.session,
            input.projectSlug,
            input.environmentName,
            target.serviceSlug,
          )
          input.serviceDetailsBySlug.set(target.serviceSlug, serviceDetails)
        }

        return computeEffectiveEnvVariables(serviceDetails).find(
          (envVar) => envVar.key === target.envVar,
        )?.value
      }),
    )
    const resolvedValues = new Set(
      targetValues.filter(
        (value): value is string => value !== undefined && value !== "",
      ),
    )

    if (resolvedValues.size > 1) {
      throw new UpstreamHttpError(
        409,
        "preview_secret_conflict",
        `Preview secret ${input.secret.secretId} has conflicting persisted target values in ${input.environmentName}`,
      )
    }

    const [existingValue] = resolvedValues
    return existingValue === undefined
      ? { missingSecretId: input.secret.secretId }
      : {
          secret: {
            secret_id: input.secret.secretId,
            value: existingValue,
          },
        }
  }

  private async resolveZaneEnvPreviewRandomOnceSecret(input: {
    session: ZaneSession
    projectSlug: string
    environmentName: string
    environment: ZaneEnvironmentWithVariables
    envByKey: Map<string, { id: string; key: string; value: string }>
    secret: SyncPreviewRandomOnceSecretsInput["secrets"][number]
  }): Promise<{
    secret?: { secret_id: string; value: string }
    missingSecretId?: string
  }> {
    const { persistedEnvVar } = input.secret
    if (persistedEnvVar === undefined || persistedEnvVar === "") {
      throw new UpstreamHttpError(
        400,
        "preview_secret_persisted_env_missing",
        `Preview secret ${input.secret.secretId} is missing persisted_env_var`,
      )
    }

    if (input.secret.value !== undefined && input.secret.value !== "") {
      const persisted = await this.syncResolvedPreviewSharedVariables({
        envByKey: input.envByKey,
        environment: input.environment,
        environmentName: input.environmentName,
        projectSlug: input.projectSlug,
        session: input.session,
        variables: [
          {
            key: persistedEnvVar,
            source: { kind: "literal", value: input.secret.value },
          },
        ],
      })
      const [persistedVariable] = persisted
      if (persistedVariable === undefined || persistedVariable.value === "") {
        throw new UpstreamHttpError(
          500,
          "preview_secret_write_failed",
          `Failed to persist preview random-once secret ${input.secret.secretId} to ${persistedEnvVar}`,
        )
      }

      return {
        secret: {
          secret_id: input.secret.secretId,
          value: persistedVariable.value,
        },
      }
    }

    const existingSharedValue = input.envByKey.get(persistedEnvVar)?.value
    return existingSharedValue === undefined || existingSharedValue === ""
      ? { missingSecretId: input.secret.secretId }
      : {
          secret: {
            secret_id: input.secret.secretId,
            value: existingSharedValue,
          },
        }
  }

  async syncPreviewSharedEnv(input: SyncPreviewSharedEnvInput): Promise<{
    project_slug: string
    environment_name: string
    environment_exists: boolean
    variables: {
      key: string
      value: string
    }[]
  }> {
    const session = await this.authenticate()
    const environment = await this.getEnvironment(
      session,
      input.projectSlug,
      input.environmentName,
    )

    if (!environment) {
      throw new UpstreamHttpError(
        404,
        "zane_environment_not_found",
        `Environment ${input.projectSlug}/${input.environmentName} was not found`,
      )
    }

    const envByKey = new Map(
      environment.variables.map((variable) => [variable.key, variable]),
    )
    const variables = await this.syncResolvedPreviewSharedVariables({
      envByKey,
      environment,
      environmentName: input.environmentName,
      projectSlug: input.projectSlug,
      session,
      variables: input.variables,
    })

    return {
      environment_exists: true,
      environment_name: input.environmentName,
      project_slug: input.projectSlug,
      variables,
    }
  }

  async syncPreviewServiceEnv(input: SyncPreviewServiceEnvInput): Promise<{
    project_slug: string
    environment_name: string
    noop: boolean
    applied_service_ids: string[]
    applied_changes: {
      service_id: string
      service_slug: string
      key: string
      change_type: "ADD" | "UPDATE" | "SKIP"
    }[]
  }> {
    const session = await this.authenticate()
    const environment = await this.getEnvironment(
      session,
      input.projectSlug,
      input.environmentName,
    )

    if (!environment) {
      throw new UpstreamHttpError(
        404,
        "zane_environment_not_found",
        `Environment ${input.projectSlug}/${input.environmentName} was not found`,
      )
    }

    const envByKey = new Map(
      environment.variables.map((variable) => [variable.key, variable]),
    )
    const serviceDetailsByRef = new Map<string, ZaneServiceDetails>()
    const envOverrides = await Promise.all(
      input.services.map(async (service) => ({
        env: Object.fromEntries(
          await Promise.all(
            service.env.map(async (envVar): Promise<[string, string]> => [
              envVar.env_var,
              await this.resolvePreviewRuntimeValueSource({
                envByKey,
                environment,
                environmentName: input.environmentName,
                label: `${service.service_slug}.${envVar.env_var}`,
                projectSlug: input.projectSlug,
                serviceDetailsByRef,
                session,
                source: envVar.source,
              }),
            ]),
          ),
        ),
        service_id: service.service_id,
        service_slug: service.service_slug,
      })),
    )

    const ops = this.createDeployOps()
    const targets = await ops.resolveTargets({
      environmentName: input.environmentName,
      projectSlug: input.projectSlug,
      services: input.services.map((service) => ({
        service_id: service.service_id,
        service_slug: service.service_slug,
      })),
    })

    return await ops.applyEnvOverrides({
      envOverrides,
      environmentName: input.environmentName,
      projectSlug: input.projectSlug,
      targets: targets.services,
    })
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
    applied_changes: {
      service_id: string
      service_slug: string
      key: string
      change_type: "ADD" | "UPDATE" | "SKIP"
    }[]
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

  async cancelDeployment(input: {
    projectSlug: string
    environmentName: string
    serviceSlug: string
    deploymentHash: string
  }): Promise<{
    project_slug: string
    environment_name: string
    service_slug: string
    deployment_hash: string
    cancelled: boolean
  }> {
    const ops = this.createDeployOps()

    return await ops.cancelDeployment(input)
  }

  async runRuntimeProvider(
    input: RuntimeProviderRunInput,
  ): Promise<RuntimeProviderRunResult> {
    switch (input.providerId) {
      case "meili_api_credentials": {
        const provider = this.createMeiliApiCredentialsProvisioner()
        const backendOutput = input.outputs.find(
          (candidate) => candidate.outputId === "backend_key",
        )
        const frontendOutput = input.outputs.find(
          (candidate) => candidate.outputId === "frontend_key",
        )
        if (!(backendOutput || frontendOutput)) {
          throw new BadRequestError(
            "Runtime provider meili_api_credentials requires at least one requested output.",
          )
        }

        const provisionInput: ProvisionMeiliKeysInput = {
          environmentName: input.environmentName,
          projectSlug: input.projectSlug,
          readinessPath: input.readinessPath,
          serviceSlug: input.serviceSlug,
          ...(backendOutput
            ? {
                backendOutput: toMeiliProvisionOutputInput(
                  backendOutput,
                  "outputs[backend_key]",
                ),
              }
            : {}),
          ...(frontendOutput
            ? {
                frontendOutput: toMeiliProvisionOutputInput(
                  frontendOutput,
                  "outputs[frontend_key]",
                ),
              }
            : {}),
        }
        const result = await provider.provisionMeiliKeys(provisionInput)

        return {
          environment_name: result.environment_name,
          outputs: [
            ...(backendOutput
              ? [
                  {
                    created: result.backend_created,
                    env_var: result.backend_env_var,
                    output_id: "backend_key",
                    updated: result.backend_updated,
                    value: result.backend_key,
                  },
                ]
              : []),
            ...(frontendOutput
              ? [
                  {
                    created: result.frontend_created,
                    env_var: result.frontend_env_var,
                    output_id: "frontend_key",
                    updated: result.frontend_updated,
                    value: result.frontend_key,
                  },
                ]
              : []),
          ],
          project_slug: result.project_slug,
          provider_id: input.providerId,
          service_slug: result.service_slug,
          source_url: result.meili_url,
        }
      }
      case "medusa_publishable_key": {
        const provider = this.createMedusaPublishableKeyProvisioner()
        const frontendOutput = input.outputs.find(
          (candidate) => candidate.outputId === "frontend_key",
        )
        if (!frontendOutput) {
          throw new BadRequestError(
            "Runtime provider medusa_publishable_key requires frontend_key output.",
          )
        }

        const result = await provider.provisionPublishableKey({
          environmentName: input.environmentName,
          frontendOutput: toMedusaPublishableKeyProvisionOutputInput(
            frontendOutput,
            "outputs[frontend_key]",
          ),
          projectSlug: input.projectSlug,
          readinessPath: input.readinessPath,
          serviceSlug: input.serviceSlug,
        })

        return {
          environment_name: result.environment_name,
          outputs: [
            {
              created: result.frontend_created,
              env_var: result.frontend_env_var,
              output_id: "frontend_key",
              updated: result.frontend_updated,
              value: result.frontend_key,
            },
          ],
          project_slug: result.project_slug,
          provider_id: input.providerId,
          service_slug: result.service_slug,
          source_url: result.medusa_url,
        }
      }
      default: {
        throw new BadRequestError(
          `Unsupported runtime provider: ${input.providerId}`,
        )
      }
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
    checked_preview_cloned_service_slugs: string[]
    warning_only_preview_service_slugs: string[]
    checked_env_override_service_ids: string[]
    checked_persisted_env_service_ids: string[]
    checked_deployment_service_ids: string[]
    checked_deployments: {
      service_id: string
      service_slug: string
      deployment_hash: string
      status: string
      status_reason: string | null
    }[]
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

  private static getSharedEnvironmentVariable(
    environment: ZaneEnvironmentWithVariables | null,
    key: string,
  ): string | undefined {
    return environment?.variables.find((variable) => variable.key === key)
      ?.value
  }

  private async upsertSharedEnvironmentVariable(input: {
    session: ZaneSession
    projectSlug: string
    environmentName: string
    envByKey: Map<string, { id: string; key: string; value: string }>
    key: string
    value: string | undefined
  }): Promise<string | undefined> {
    if (input.value === undefined) {
      return undefined
    }

    const existing = input.envByKey.get(input.key)
    if (existing !== undefined && existing.value === input.value) {
      return existing.value
    }

    const payload = {
      key: input.key,
      value: input.value,
    }

    if (existing !== undefined) {
      await this.request(
        input.session,
        "PATCH",
        `/api/projects/${encodeURIComponent(
          input.projectSlug,
        )}/${encodeURIComponent(input.environmentName)}/variables/${encodeURIComponent(existing.id)}/`,
        payload,
      )
      input.envByKey.set(input.key, {
        ...existing,
        value: input.value,
      })
      return input.value
    }

    const created = await this.request<{
      id?: string
      key?: string
      value?: string
    }>(
      input.session,
      "POST",
      `/api/projects/${encodeURIComponent(
        input.projectSlug,
      )}/${encodeURIComponent(input.environmentName)}/variables/`,
      payload,
    )

    if (created?.id !== undefined && created.id !== "") {
      input.envByKey.set(input.key, {
        id: created.id,
        key: input.key,
        value: input.value,
      })
    }

    return input.value
  }

  private async syncResolvedPreviewSharedVariables(input: {
    session: ZaneSession
    projectSlug: string
    environmentName: string
    environment: ZaneEnvironmentWithVariables
    envByKey: Map<string, { id: string; key: string; value: string }>
    variables: SyncPreviewSharedEnvInput["variables"]
  }): Promise<{ key: string; value: string }[]> {
    const serviceDetailsByRef = new Map<string, ZaneServiceDetails>()
    return await Promise.all(
      input.variables.map(async (variable) => {
        const resolvedValue = await this.resolvePreviewSharedVariableValue({
          envByKey: input.envByKey,
          environment: input.environment,
          environmentName: input.environmentName,
          label: variable.key,
          projectSlug: input.projectSlug,
          serviceDetailsByRef,
          session: input.session,
          source: variable.source,
        })

        const persistedValue = await this.upsertSharedEnvironmentVariable({
          envByKey: input.envByKey,
          environmentName: input.environmentName,
          key: variable.key,
          projectSlug: input.projectSlug,
          session: input.session,
          value: resolvedValue,
        })

        if (persistedValue === undefined || persistedValue === "") {
          throw new UpstreamHttpError(
            500,
            "preview_shared_env_write_failed",
            `Failed to persist preview shared env ${variable.key}`,
          )
        }

        return { key: variable.key, value: persistedValue }
      }),
    )
  }

  private async resolvePreviewSharedVariableValue(input: {
    session: ZaneSession
    projectSlug: string
    environmentName: string
    environment: ZaneEnvironmentWithVariables
    envByKey: Map<string, { id: string; key: string; value: string }>
    source: PreviewRuntimeValueSourceInput
    label: string
    serviceDetailsByRef: Map<string, ZaneServiceDetails>
  }): Promise<string> {
    return await this.resolvePreviewRuntimeValueSource(input)
  }

  private async resolvePreviewRuntimeValueSource(
    input: PreviewRuntimeSourceContext,
  ): Promise<string> {
    if (input.source.kind === "literal") {
      if (input.source.value === undefined || input.source.value === "") {
        throw new UpstreamHttpError(
          400,
          "preview_runtime_value_missing",
          `Preview runtime source ${input.label} requires an explicit value`,
        )
      }
      return input.source.value
    }

    const serviceDetails =
      await this.getCachedPreviewRuntimeServiceDetails(input)
    switch (input.source.kind) {
      case "service_network_alias": {
        return ZaneClient.requirePreviewRuntimeValue(
          input,
          serviceDetails,
          serviceDetails.network_alias?.trim(),
        )
      }
      case "service_global_network_alias": {
        return ZaneClient.requirePreviewRuntimeValue(
          input,
          serviceDetails,
          serviceDetails.global_network_alias?.trim(),
        )
      }
      case "service_public_origin": {
        const [publicUrl] = buildServicePublicUrls(serviceDetails)
        return new URL(
          ZaneClient.requirePreviewRuntimeValue(
            input,
            serviceDetails,
            publicUrl,
          ),
        ).origin
      }
      case "service_internal_origin": {
        return ZaneClient.buildPreviewInternalOrigin(input, serviceDetails)
      }
      case "service_internal_bucket_url": {
        return ZaneClient.buildPreviewInternalBucketUrl(input, serviceDetails)
      }
      default: {
        throw new UpstreamHttpError(
          400,
          "preview_runtime_source_invalid",
          "Unsupported preview runtime source",
        )
      }
    }
  }

  private static requirePreviewRuntimeValue(
    input: PreviewRuntimeSourceContext,
    serviceDetails: ZaneServiceDetails,
    value: string | undefined,
  ): string {
    if (value === undefined || value === "") {
      throw ZaneClient.createPreviewRuntimeSourceMissingError(
        input,
        serviceDetails.slug,
      )
    }
    return value
  }

  private static buildPreviewInternalOrigin(
    input: PreviewRuntimeSourceContext,
    serviceDetails: ZaneServiceDetails,
  ): string {
    const alias = serviceDetails.network_alias?.trim()
    const { port } = input.source
    if (
      alias === undefined ||
      alias === "" ||
      port === undefined ||
      port === 0
    ) {
      throw ZaneClient.createPreviewRuntimeSourceMissingError(
        input,
        serviceDetails.slug,
      )
    }

    const origin = new URL(`http://${alias}:${port}`)
      .toString()
      .replace(/\/$/u, "")
    return input.source.trailingSlash === true ? `${origin}/` : origin
  }

  private static buildPreviewInternalBucketUrl(
    input: PreviewRuntimeSourceContext,
    serviceDetails: ZaneServiceDetails,
  ): string {
    const alias = serviceDetails.network_alias?.trim()
    const { port } = input.source
    const bucketSharedEnvKey = input.source.bucketSharedEnvKey?.trim()
    const hasAlias = alias !== undefined && alias !== ""
    const hasPort = port !== undefined && port !== 0
    const hasBucketSharedEnvKey =
      bucketSharedEnvKey !== undefined && bucketSharedEnvKey !== ""
    if (!(hasAlias && hasPort && hasBucketSharedEnvKey)) {
      throw ZaneClient.createPreviewRuntimeSourceMissingError(
        input,
        serviceDetails.slug,
      )
    }

    const bucketName = input.envByKey.get(bucketSharedEnvKey)?.value.trim()
    if (bucketName === undefined || bucketName === "") {
      throw new UpstreamHttpError(
        409,
        "preview_runtime_bucket_missing",
        `Could not resolve ${input.label} because ${bucketSharedEnvKey} is missing in ${input.projectSlug}/${input.environment.name}`,
      )
    }

    return new URL(
      `/${encodeURIComponent(bucketName)}`,
      `http://${alias}:${port}`,
    ).toString()
  }

  private async getCachedPreviewRuntimeServiceDetails(
    input: PreviewRuntimeSourceContext,
  ): Promise<ZaneServiceDetails> {
    const serviceSlug = input.source.serviceSlug?.trim()
    if (serviceSlug === undefined || serviceSlug === "") {
      throw new UpstreamHttpError(
        400,
        "preview_runtime_service_missing",
        `Preview runtime source ${input.label} requires service_slug`,
      )
    }

    const sourceEnvironmentName =
      input.source.sourceEnvironmentName ?? input.environmentName
    const cacheKey = `${sourceEnvironmentName}/${serviceSlug}`
    const cached = input.serviceDetailsByRef.get(cacheKey)
    if (cached !== undefined) {
      return cached
    }

    const serviceDetails = await this.getServiceDetails(
      input.session,
      input.projectSlug,
      sourceEnvironmentName,
      serviceSlug,
    )
    input.serviceDetailsByRef.set(cacheKey, serviceDetails)
    return serviceDetails
  }

  private static createPreviewRuntimeSourceMissingError(
    input: PreviewRuntimeSourceContext,
    serviceSlug: string,
  ): UpstreamHttpError {
    const sourceEnvironmentName =
      input.source.sourceEnvironmentName ?? input.environmentName

    return new UpstreamHttpError(
      409,
      "preview_runtime_source_missing",
      `Could not resolve ${input.label} from ${input.projectSlug}/${sourceEnvironmentName}/${serviceSlug} using ${input.source.kind}`,
    )
  }

  private buildUpstreamHeaders(
    session: ZaneSession | undefined,
    method: HttpMethod,
  ): Record<string, string> {
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
    const detailsPayload = await this.request<unknown>(
      session,
      "GET",
      `/api/projects/${encodeURIComponent(projectSlug)}/${encodeURIComponent(
        environmentName,
      )}/service-details/${encodeURIComponent(serviceSlug)}/`,
    )

    if (detailsPayload === null) {
      throw new UpstreamHttpError(
        404,
        "zane_service_not_found",
        `Service ${serviceSlug} was not found in ${projectSlug}/${environmentName}`,
      )
    }

    return normalizeServiceDetails(
      detailsPayload,
      `${projectSlug}/${environmentName}/${serviceSlug}.service_details`,
    )
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
