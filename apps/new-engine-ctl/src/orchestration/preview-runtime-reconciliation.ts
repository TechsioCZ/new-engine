import type {
  PreviewRuntimeSourceDefinition,
  StackInputs,
} from "../contracts/stack-inputs.js"
import {
  getPreviewServiceEnvDefinitions,
  getPreviewSharedEnvDefinitions,
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
