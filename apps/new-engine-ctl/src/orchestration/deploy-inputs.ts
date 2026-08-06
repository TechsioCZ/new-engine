import { readFile } from "node:fs/promises"

import { parse as parseYaml } from "yaml"

import { runtimeProviderOutputKey } from "../contracts/runtime-provider-outputs.js"
import type { RuntimeProviderOutputs } from "../contracts/runtime-provider-outputs.js"
import {
  getPreviewForbiddenServiceEnvDefinitions,
  getPreviewRandomOnceSecretDefinitions,
  listRuntimeProviderTargetsForServiceInLane,
  previewRandomOnceSecretPersistsToZaneEnv,
  stackInputsSchema,
} from "../contracts/stack-inputs.js"
import type { StackInputs } from "../contracts/stack-inputs.js"
import {
  getDeployableService,
  stackManifestSchema,
} from "../contracts/stack-manifest.js"
import type {
  DeployableService,
  Lane,
  StackManifest,
} from "../contracts/stack-manifest.js"
import type {
  EnvOverride,
  ForbiddenEnvRequirement,
  PreviewRandomOnceSecretInput,
  RequiredPersistedEnv,
} from "../contracts/verify.js"
import {
  buildPreviewRequiredServiceEnvKeys,
  buildPreviewRequiredSharedEnvKeys,
} from "./preview-runtime-reconciliation.js"

export interface DeployContracts {
  manifest: StackManifest
  stackInputs: StackInputs
}

export interface DeployEnvContext {
  lane: Lane
  previewDbName: string
  previewDbUser: string
  previewDbPassword: string
  previewRandomOnceSecrets: PreviewRandomOnceSecretInput[]
  runtimeProviderOutputs: RuntimeProviderOutputs
}

export interface RequiredSharedEnv {
  key: string
}

export const normalizeCsvToArray = (csv: string): string[] => {
  const values = csv
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  const seen = new Set<string>()
  const normalized: string[] = []

  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value)
      normalized.push(value)
    }
  }

  return normalized
}

const loadYamlContract = async <T>(
  path: string,
  parseContract: (value: unknown) => T,
): Promise<T> => {
  const raw = await readFile(path, "utf-8")
  let parsed: unknown

  try {
    parsed = parseYaml(raw)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to parse YAML at ${path}: ${message}`, {
      cause: error,
    })
  }

  return parseContract(parsed)
}

export const loadManifest = async (
  stackManifestPath: string,
): Promise<StackManifest> =>
  await loadYamlContract(stackManifestPath, (value) =>
    stackManifestSchema.parse(value),
  )

export const loadStackInputs = async (
  stackInputsPath: string,
): Promise<StackInputs> =>
  await loadYamlContract(stackInputsPath, (value) =>
    stackInputsSchema.parse(value),
  )

export const loadDeployContracts = async (
  stackManifestPath: string,
  stackInputsPath: string,
): Promise<DeployContracts> => {
  const [manifest, stackInputs] = await Promise.all([
    loadManifest(stackManifestPath),
    loadStackInputs(stackInputsPath),
  ])

  return {
    manifest,
    stackInputs,
  }
}

const appendPreviewRandomOnceEnv = (
  env: Record<string, string>,
  context: DeployEnvContext,
  serviceId: string,
): void => {
  for (const secret of context.previewRandomOnceSecrets) {
    if (previewRandomOnceSecretPersistsToZaneEnv(secret)) {
      continue
    }

    for (const target of secret.targets) {
      if (target.service_id === serviceId) {
        env[target.env_var] = secret.value
      }
    }
  }
}

const appendConfiguredRuntimeProviderEnv = (input: {
  env: Record<string, string>
  context: DeployEnvContext
  stackInputs: StackInputs
  serviceId: string
}): void => {
  for (const target of listRuntimeProviderTargetsForServiceInLane(
    input.stackInputs,
    input.context.lane,
    input.serviceId,
  )) {
    const outputValue =
      input.context.runtimeProviderOutputs[
        runtimeProviderOutputKey(target.provider_id, target.output_id)
      ]?.value ?? ""

    if (input.context.lane === "main" && !outputValue) {
      throw new Error(
        `Runtime provider output ${target.provider_id}.${target.output_id} is required for service ${input.serviceId}.`,
      )
    }

    if (outputValue) {
      input.env[target.env_var] = outputValue
    }
  }
}

const buildServiceEnvOverride = (
  service: DeployableService,
  contracts: DeployContracts,
  context: DeployEnvContext,
): EnvOverride | null => {
  const env: Record<string, string> = {}

  if (context.lane === "preview") {
    appendPreviewRandomOnceEnv(env, context, service.id)
  }

  appendConfiguredRuntimeProviderEnv({
    context,
    env,
    serviceId: service.id,
    stackInputs: contracts.stackInputs,
  })

  if (Object.keys(env).length === 0) {
    return null
  }

  return {
    env,
    service_id: service.id,
    service_slug: service.serviceSlug,
  }
}

export const buildExpectedEnvOverrides = (
  deployServiceIds: string[],
  contracts: DeployContracts,
  context: DeployEnvContext,
): EnvOverride[] =>
  deployServiceIds.flatMap((serviceId) => {
    const service = getDeployableService(contracts.manifest, serviceId)
    const override = buildServiceEnvOverride(service, contracts, context)

    return override ? [override] : []
  })

const addPersistedEnvKey = (
  envKeys: string[],
  seen: Set<string>,
  key: string,
): void => {
  if (key && !seen.has(key)) {
    seen.add(key)
    envKeys.push(key)
  }
}

const buildPersistedEnvKeysForService = (
  service: DeployableService,
  lane: Lane,
  contracts: DeployContracts,
): string[] => {
  const envKeys: string[] = []
  const seen = new Set<string>()
  const definitions = getPreviewRandomOnceSecretDefinitions(
    contracts.stackInputs,
  )

  for (const target of listRuntimeProviderTargetsForServiceInLane(
    contracts.stackInputs,
    lane,
    service.id,
  )) {
    addPersistedEnvKey(envKeys, seen, target.env_var)
  }

  if (lane === "preview") {
    for (const secret of definitions) {
      if (previewRandomOnceSecretPersistsToZaneEnv(secret)) {
        continue
      }

      for (const target of secret.targets) {
        if (target.service_id === service.id) {
          addPersistedEnvKey(envKeys, seen, target.env_var)
        }
      }
    }
  }

  return envKeys
}

export const buildRequiredPersistedEnv = (
  lane: Lane,
  deployServiceIds: string[],
  contracts: DeployContracts,
): RequiredPersistedEnv[] => {
  const persisted = deployServiceIds.flatMap((serviceId) => {
    const service = getDeployableService(contracts.manifest, serviceId)
    const envKeys = buildPersistedEnvKeysForService(service, lane, contracts)

    if (envKeys.length === 0) {
      return []
    }

    return [
      {
        env_keys: envKeys,
        service_id: service.id,
        service_slug: service.serviceSlug,
      },
    ]
  })

  if (lane !== "preview") {
    return persisted
  }

  const runtimeEnvRequirements = buildPreviewRequiredServiceEnvKeys({
    deployServiceIds,
    manifest: contracts.manifest,
    stackInputs: contracts.stackInputs,
  })
  const byServiceId = new Map(
    persisted.map((requirement) => [requirement.service_id, requirement]),
  )

  for (const runtimeRequirement of runtimeEnvRequirements) {
    const existing = byServiceId.get(runtimeRequirement.service_id)
    if (!existing) {
      persisted.push(runtimeRequirement)
      byServiceId.set(runtimeRequirement.service_id, runtimeRequirement)
      continue
    }

    existing.env_keys = normalizeCsvToArray(
      [...existing.env_keys, ...runtimeRequirement.env_keys].join(","),
    )
  }

  return persisted
}

export const buildRequiredSharedEnv = (
  lane: Lane,
  deployServiceIds: string[],
  contracts: DeployContracts,
): RequiredSharedEnv[] => {
  if (lane !== "preview") {
    return []
  }

  const envKeys: string[] = []
  const seen = new Set<string>()
  const randomOnceDefinitions = getPreviewRandomOnceSecretDefinitions(
    contracts.stackInputs,
  )

  for (const key of buildPreviewRequiredSharedEnvKeys({
    deployServiceIds,
    stackInputs: contracts.stackInputs,
  })) {
    addPersistedEnvKey(envKeys, seen, key)
  }

  const deployServiceIdSet = new Set(deployServiceIds)
  for (const secret of randomOnceDefinitions) {
    if (!previewRandomOnceSecretPersistsToZaneEnv(secret)) {
      continue
    }

    if (
      secret.persisted_env_var === undefined ||
      secret.persisted_env_var === ""
    ) {
      throw new Error(
        `Preview secret ${secret.secret_id} persists to zane_env but missing persisted_env_var.`,
      )
    }

    const isConsumedByDeploy = secret.targets.some((target) =>
      deployServiceIdSet.has(target.service_id),
    )

    if (isConsumedByDeploy) {
      addPersistedEnvKey(envKeys, seen, secret.persisted_env_var)
    }
  }

  return envKeys.map((key) => ({ key }))
}

export const buildForbiddenPreviewOnlyEnv = (
  lane: Lane,
  deployServiceIds: string[],
  contracts: DeployContracts,
): ForbiddenEnvRequirement[] => {
  if (lane !== "preview") {
    return []
  }

  const deployServiceIdSet = new Set(deployServiceIds)
  return getPreviewForbiddenServiceEnvDefinitions(
    contracts.stackInputs,
  ).flatMap((definition) => {
    if (!deployServiceIdSet.has(definition.service_id)) {
      return []
    }

    const service = getDeployableService(
      contracts.manifest,
      definition.service_id,
    )
    const envKeys = normalizeCsvToArray(definition.env_keys.join(","))
    if (envKeys.length === 0) {
      return []
    }

    return [
      {
        env_keys: envKeys,
        service_id: service.id,
        service_slug: service.serviceSlug,
      },
    ]
  })
}
