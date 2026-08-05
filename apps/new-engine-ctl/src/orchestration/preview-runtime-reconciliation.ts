import type { PreviewSharedEnvVariableInput } from "../contracts/preview-shared-env.js"
import type {
  PreviewRuntimeSourceDefinition,
  ServiceReconciliationDefinition,
  StackInputs,
} from "../contracts/stack-inputs.js"
import {
  getPreviewServiceEnvDefinitions,
  getPreviewSharedEnvDefinitions,
  getServiceReconciliationDefinitions,
} from "../contracts/stack-inputs.js"
import type { StackManifest } from "../contracts/stack-manifest.js"
import { getDeployableService } from "../contracts/stack-manifest.js"

export interface PreviewRuntimeContext {
  sourceEnvironmentName: string
  previewDbName: string
  previewDbUser: string
  previewDbPassword: string
}

export interface PreviewServiceEnvSyncService {
  service_id: string
  service_slug: string
  env: {
    env_var: string
    source: PreviewSharedEnvVariableInput["source"]
  }[]
}

export type ServiceReconciliationLane = "preview" | "main"

export interface PreviewServiceSpecSyncService {
  service_id: string
  service_slug: string
  git_source?:
    | {
        sync_from_source: boolean
        branch_name?: string
        commit_sha?: string
      }
    | undefined
  builder?: {
    sync_from_source: boolean
    build_stage_target?: string | null
  }
  healthcheck?: {
    sync_from_source: boolean
  }
  resource_limits?: {
    sync_from_source: boolean
  }
}

const buildPreviewGitSourceSpec = (input: {
  lane: ServiceReconciliationLane
  previewGitBranch?: string
}): PreviewServiceSpecSyncService["git_source"] => ({
  sync_from_source: true,
  ...(input.lane === "preview" && input.previewGitBranch !== undefined
    ? { branch_name: input.previewGitBranch }
    : {}),
})

const resolveSourceEnvironmentName = (
  source: PreviewRuntimeSourceDefinition,
  context: PreviewRuntimeContext,
): string | undefined =>
  source.environment_scope === "source"
    ? context.sourceEnvironmentName
    : undefined

const requireServiceSlug = (
  manifest: StackManifest,
  serviceId: string,
  label: string,
): string => {
  try {
    return getDeployableService(manifest, serviceId).serviceSlug
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Unable to resolve ${label}: ${message}`, { cause: error })
  }
}

const buildResolvedSource = (input: {
  manifest: StackManifest
  source: PreviewRuntimeSourceDefinition
  context: PreviewRuntimeContext
}): PreviewSharedEnvVariableInput["source"] => {
  const { manifest, source, context } = input

  switch (source.kind) {
    case "prepare_preview_db_name": {
      return {
        kind: "literal",
        value: context.previewDbName,
      }
    }
    case "prepare_preview_db_user": {
      return {
        kind: "literal",
        value: context.previewDbUser,
      }
    }
    case "prepare_preview_db_password": {
      return {
        kind: "literal",
        value: context.previewDbPassword,
      }
    }
    case "service_network_alias":
    case "service_global_network_alias":
    case "service_public_origin": {
      return {
        kind: source.kind,
        service_slug: requireServiceSlug(
          manifest,
          source.service_id ?? "",
          `preview runtime source ${source.kind}`,
        ),
        source_environment_name: resolveSourceEnvironmentName(source, context),
      }
    }
    case "service_internal_origin": {
      return {
        kind: source.kind,
        port: source.port,
        service_slug: requireServiceSlug(
          manifest,
          source.service_id ?? "",
          `preview runtime source ${source.kind}`,
        ),
        source_environment_name: resolveSourceEnvironmentName(source, context),
        trailing_slash: source.trailing_slash,
      }
    }
    case "service_internal_bucket_url": {
      return {
        bucket_shared_env_key: source.bucket_shared_env_key,
        kind: source.kind,
        port: source.port,
        service_slug: requireServiceSlug(
          manifest,
          source.service_id ?? "",
          `preview runtime source ${source.kind}`,
        ),
        source_environment_name: resolveSourceEnvironmentName(source, context),
      }
    }
    default: {
      throw new Error(`Unsupported preview runtime source kind: ${source.kind}`)
    }
  }
}

const requireNonEmptyLiteralSource = (input: {
  label: string
  source: PreviewSharedEnvVariableInput["source"]
}): PreviewSharedEnvVariableInput["source"] => {
  if (input.source.kind === "literal" && input.source.value.length === 0) {
    throw new Error(`${input.label} resolved to an empty literal value.`)
  }

  return input.source
}

const resolveLaneBuildStageTarget = (
  definition: ServiceReconciliationDefinition,
  lane: ServiceReconciliationLane,
): string | null | undefined => {
  const buildStageTargets = definition.builder.build_stage_target_by_lane
  return lane === "preview" ? buildStageTargets.preview : buildStageTargets.main
}

export const buildPreviewSharedEnvSyncVariables = (input: {
  stackInputs: StackInputs
  manifest: StackManifest
  deployServiceIds: string[]
  context: PreviewRuntimeContext
}): PreviewSharedEnvVariableInput[] => {
  const deployServiceIds = new Set(input.deployServiceIds)
  const variables: PreviewSharedEnvVariableInput[] = []

  for (const definition of getPreviewSharedEnvDefinitions(input.stackInputs)) {
    const isConsumed = definition.consumed_by_service_ids.some((serviceId) =>
      deployServiceIds.has(serviceId),
    )
    if (!isConsumed) {
      continue
    }

    const source = buildResolvedSource({
      context: input.context,
      manifest: input.manifest,
      source: definition.source,
    })
    variables.push({
      key: definition.key,
      source: requireNonEmptyLiteralSource({
        label: `preview shared env ${definition.key}`,
        source,
      }),
    })
  }

  return variables
}

export const buildPreviewRequiredSharedEnvKeys = (input: {
  stackInputs: StackInputs
  deployServiceIds: string[]
}): string[] => {
  const keys: string[] = []
  const seen = new Set<string>()
  const deployServiceIds = new Set(input.deployServiceIds)

  for (const definition of getPreviewSharedEnvDefinitions(input.stackInputs)) {
    const isConsumed = definition.consumed_by_service_ids.some((serviceId) =>
      deployServiceIds.has(serviceId),
    )
    if (!isConsumed || seen.has(definition.key)) {
      continue
    }

    seen.add(definition.key)
    keys.push(definition.key)
  }

  return keys
}

export const buildPreviewServiceEnvSyncServices = (input: {
  stackInputs: StackInputs
  manifest: StackManifest
  deployServiceIds: string[]
  context: PreviewRuntimeContext
}): PreviewServiceEnvSyncService[] => {
  const grouped = new Map<string, PreviewServiceEnvSyncService>()
  const deployServiceIds = new Set(input.deployServiceIds)

  for (const definition of getPreviewServiceEnvDefinitions(input.stackInputs)) {
    if (!deployServiceIds.has(definition.service_id)) {
      continue
    }

    const targetSlug = requireServiceSlug(
      input.manifest,
      definition.service_id,
      `preview service env ${definition.service_id}.${definition.env_var}`,
    )
    const existing = grouped.get(definition.service_id) ?? {
      env: [],
      service_id: definition.service_id,
      service_slug: targetSlug,
    }

    const source = buildResolvedSource({
      context: input.context,
      manifest: input.manifest,
      source: definition.source,
    })

    existing.env.push({
      env_var: definition.env_var,
      source: requireNonEmptyLiteralSource({
        label: `preview service env ${definition.service_id}.${definition.env_var}`,
        source,
      }),
    })
    grouped.set(definition.service_id, existing)
  }

  return [...grouped.values()]
}

export const buildPreviewRequiredServiceEnvKeys = (input: {
  stackInputs: StackInputs
  manifest: StackManifest
  deployServiceIds: string[]
}): {
  service_id: string
  service_slug: string
  env_keys: string[]
}[] => {
  const grouped = new Map<
    string,
    {
      service_id: string
      service_slug: string
      env_keys: string[]
      seen: Set<string>
    }
  >()
  const deployServiceIds = new Set(input.deployServiceIds)

  for (const definition of getPreviewServiceEnvDefinitions(input.stackInputs)) {
    if (!deployServiceIds.has(definition.service_id)) {
      continue
    }

    const existing = grouped.get(definition.service_id) ?? {
      env_keys: [],
      seen: new Set<string>(),
      service_id: definition.service_id,
      service_slug: requireServiceSlug(
        input.manifest,
        definition.service_id,
        `preview service env ${definition.service_id}.${definition.env_var}`,
      ),
    }

    if (!existing.seen.has(definition.env_var)) {
      existing.seen.add(definition.env_var)
      existing.env_keys.push(definition.env_var)
    }

    grouped.set(definition.service_id, existing)
  }

  return [...grouped.values()].map(({ seen: _seen, ...value }) => value)
}

export const buildServiceReconciliationSpecs = (input: {
  stackInputs: StackInputs
  manifest: StackManifest
  lane: ServiceReconciliationLane
  serviceIds: string[]
  previewGitBranch?: string
}): PreviewServiceSpecSyncService[] => {
  const definitionByServiceId = new Map(
    getServiceReconciliationDefinitions(input.stackInputs).map((definition) => [
      definition.service_id,
      definition,
    ]),
  )

  return [...new Set(input.serviceIds)].map((serviceId) => {
    const definition = definitionByServiceId.get(serviceId) ?? {
      builder: {
        build_stage_target_by_lane: {},
        sync_from_source: true,
      },
      git_source: {
        sync_from_source: true,
      },
      healthcheck: {
        sync_from_source: true,
      },
      resource_limits: {
        sync_from_source: true,
      },
      service_id: serviceId,
    }
    const serviceSpec: PreviewServiceSpecSyncService = {
      service_id: serviceId,
      service_slug: requireServiceSlug(
        input.manifest,
        serviceId,
        `service reconciliation ${serviceId}`,
      ),
    }

    if (definition.git_source.sync_from_source) {
      serviceSpec.git_source = buildPreviewGitSourceSpec(input)
    }

    if (definition.builder.sync_from_source) {
      const buildStageTarget = resolveLaneBuildStageTarget(
        definition,
        input.lane,
      )
      serviceSpec.builder =
        buildStageTarget === undefined
          ? {
              sync_from_source: true,
            }
          : {
              build_stage_target: buildStageTarget,
              sync_from_source: true,
            }
    }

    if (definition.healthcheck.sync_from_source) {
      serviceSpec.healthcheck = {
        sync_from_source: true,
      }
    }

    if (definition.resource_limits.sync_from_source) {
      serviceSpec.resource_limits = {
        sync_from_source: true,
      }
    }

    return serviceSpec
  })
}
