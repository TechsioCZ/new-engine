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
import type { PreviewSharedEnvVariableInput } from "../contracts/preview-shared-env.js"

export type PreviewRuntimeContext = {
  sourceEnvironmentName: string
  previewDbName: string
  previewDbUser: string
  previewDbPassword: string
}

export type PreviewServiceEnvSyncService = {
  service_id: string
  service_slug: string
  env: Array<{
    env_var: string
    source: PreviewSharedEnvVariableInput["source"]
  }>
}

export type ServiceReconciliationLane = "preview" | "main"

export type PreviewServiceSpecSyncService = {
  service_id: string
  service_slug: string
  git_source?: {
    sync_from_source: boolean
  }
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

function resolveSourceEnvironmentName(
  source: PreviewRuntimeSourceDefinition,
  context: PreviewRuntimeContext
): string | undefined {
  return source.environment_scope === "source"
    ? context.sourceEnvironmentName
    : undefined
}

function requireServiceSlug(
  manifest: StackManifest,
  serviceId: string,
  label: string
): string {
  return getDeployableService(manifest, serviceId).serviceSlug
}

function buildResolvedSource(input: {
  manifest: StackManifest
  source: PreviewRuntimeSourceDefinition
  context: PreviewRuntimeContext
}): PreviewSharedEnvVariableInput["source"] {
  const { manifest, source, context } = input

  switch (source.kind) {
    case "prepare_preview_db_name":
      return {
        kind: "literal",
        value: context.previewDbName,
      }
    case "prepare_preview_db_user":
      return {
        kind: "literal",
        value: context.previewDbUser,
      }
    case "prepare_preview_db_password":
      return {
        kind: "literal",
        value: context.previewDbPassword,
      }
    case "service_network_alias":
    case "service_global_network_alias":
    case "service_public_origin":
      return {
        kind: source.kind,
        service_slug: requireServiceSlug(
          manifest,
          source.service_id ?? "",
          `preview runtime source ${source.kind}`
        ),
        source_environment_name: resolveSourceEnvironmentName(source, context),
      }
    case "service_internal_origin":
      return {
        kind: source.kind,
        service_slug: requireServiceSlug(
          manifest,
          source.service_id ?? "",
          `preview runtime source ${source.kind}`
        ),
        source_environment_name: resolveSourceEnvironmentName(source, context),
        port: source.port,
        trailing_slash: source.trailing_slash,
      }
    case "service_internal_bucket_url":
      return {
        kind: source.kind,
        service_slug: requireServiceSlug(
          manifest,
          source.service_id ?? "",
          `preview runtime source ${source.kind}`
        ),
        source_environment_name: resolveSourceEnvironmentName(source, context),
        port: source.port,
        bucket_shared_env_key: source.bucket_shared_env_key,
      }
    default:
      throw new Error(`Unsupported preview runtime source kind: ${source.kind}`)
  }
}

function resolveLaneBuildStageTarget(
  definition: ServiceReconciliationDefinition,
  lane: ServiceReconciliationLane
): string | null | undefined {
  const buildStageTargets = definition.builder.build_stage_target_by_lane
  return lane === "preview" ? buildStageTargets.preview : buildStageTargets.main
}

export function buildPreviewSharedEnvSyncVariables(input: {
  stackInputs: StackInputs
  manifest: StackManifest
  context: PreviewRuntimeContext
}): PreviewSharedEnvVariableInput[] {
  return getPreviewSharedEnvDefinitions(input.stackInputs).map((definition) => ({
    key: definition.key,
    source: buildResolvedSource({
      manifest: input.manifest,
      source: definition.source,
      context: input.context,
    }),
  }))
}

export function buildPreviewRequiredSharedEnvKeys(input: {
  stackInputs: StackInputs
  deployServiceIds: string[]
}): string[] {
  const keys: string[] = []
  const seen = new Set<string>()

  for (const definition of getPreviewSharedEnvDefinitions(input.stackInputs)) {
    const isConsumed = definition.consumed_by_service_ids.some((serviceId) =>
      input.deployServiceIds.includes(serviceId)
    )
    if (!isConsumed || seen.has(definition.key)) {
      continue
    }

    seen.add(definition.key)
    keys.push(definition.key)
  }

  return keys
}

export function buildPreviewServiceEnvSyncServices(input: {
  stackInputs: StackInputs
  manifest: StackManifest
  deployServiceIds: string[]
  context: PreviewRuntimeContext
}): PreviewServiceEnvSyncService[] {
  const grouped = new Map<string, PreviewServiceEnvSyncService>()

  for (const definition of getPreviewServiceEnvDefinitions(input.stackInputs)) {
    if (!input.deployServiceIds.includes(definition.service_id)) {
      continue
    }

    const targetSlug = requireServiceSlug(
      input.manifest,
      definition.service_id,
      `preview service env ${definition.service_id}.${definition.env_var}`
    )
    const existing =
      grouped.get(definition.service_id) ??
      {
        service_id: definition.service_id,
        service_slug: targetSlug,
        env: [],
      }

    existing.env.push({
      env_var: definition.env_var,
      source: buildResolvedSource({
        manifest: input.manifest,
        source: definition.source,
        context: input.context,
      }),
    })
    grouped.set(definition.service_id, existing)
  }

  return [...grouped.values()]
}

export function buildPreviewRequiredServiceEnvKeys(input: {
  stackInputs: StackInputs
  manifest: StackManifest
  deployServiceIds: string[]
}): Array<{
  service_id: string
  service_slug: string
  env_keys: string[]
}> {
  const grouped = new Map<
    string,
    { service_id: string; service_slug: string; env_keys: string[]; seen: Set<string> }
  >()

  for (const definition of getPreviewServiceEnvDefinitions(input.stackInputs)) {
    if (!input.deployServiceIds.includes(definition.service_id)) {
      continue
    }

    const existing =
      grouped.get(definition.service_id) ??
      {
        service_id: definition.service_id,
        service_slug: requireServiceSlug(
          input.manifest,
          definition.service_id,
          `preview service env ${definition.service_id}.${definition.env_var}`
        ),
        env_keys: [],
        seen: new Set<string>(),
      }

    if (!existing.seen.has(definition.env_var)) {
      existing.seen.add(definition.env_var)
      existing.env_keys.push(definition.env_var)
    }

    grouped.set(definition.service_id, existing)
  }

  return [...grouped.values()].map(({ seen: _seen, ...value }) => value)
}

export function buildServiceReconciliationSpecs(input: {
  stackInputs: StackInputs
  manifest: StackManifest
  lane: ServiceReconciliationLane
  serviceIds: string[]
}): PreviewServiceSpecSyncService[] {
  const definitionByServiceId = new Map(
    getServiceReconciliationDefinitions(input.stackInputs).map((definition) => [
      definition.service_id,
      definition,
    ])
  )

  return [...new Set(input.serviceIds)].map((serviceId) => {
    const definition =
      definitionByServiceId.get(serviceId) ?? {
        service_id: serviceId,
        git_source: {
          sync_from_source: true,
        },
        builder: {
          sync_from_source: true,
          build_stage_target_by_lane: {},
        },
        healthcheck: {
          sync_from_source: true,
        },
        resource_limits: {
          sync_from_source: true,
        },
      }
    const serviceSpec: PreviewServiceSpecSyncService = {
      service_id: serviceId,
      service_slug: requireServiceSlug(
        input.manifest,
        serviceId,
        `service reconciliation ${serviceId}`
      ),
    }

    if (definition.git_source.sync_from_source) {
      serviceSpec.git_source = {
        sync_from_source: true,
      }
    }

    if (definition.builder.sync_from_source) {
      const buildStageTarget = resolveLaneBuildStageTarget(
        definition,
        input.lane
      )
      serviceSpec.builder =
        typeof buildStageTarget !== "undefined"
          ? {
              sync_from_source: true,
              build_stage_target: buildStageTarget,
            }
          : {
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
