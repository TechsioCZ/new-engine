import { readFile } from "node:fs/promises"

import { parse as parseYaml } from "yaml"

import {
  getPreviewRandomOnceSecretDefinitions,
  getRuntimeProviderTargetEnvVar,
  type StackInputs,
  stackInputsSchema,
} from "../contracts/stack-inputs.js"
import {
  type DeployableService,
  getDeployableService,
  type Lane,
  type StackManifest,
  stackManifestSchema,
} from "../contracts/stack-manifest.js"
import type {
  EnvOverride,
  ForbiddenEnvRequirement,
  PreviewRandomOnceSecretInput,
  RequiredPersistedEnv,
} from "../contracts/verify.js"

export type MeiliApiCredentialEnvVars = {
  backend: string
  frontend: string
}

export type DeployContracts = {
  manifest: StackManifest
  stackInputs: StackInputs
}

export type DeployEnvContext = {
  lane: Lane
  previewDbName: string
  previewDbUser: string
  previewDbPassword: string
  previewRandomOnceSecrets: PreviewRandomOnceSecretInput[]
  meiliFrontendKey: string
  meiliFrontendEnvVar: string
  meiliBackendKey: string
  meiliApiCredentialEnvVars: MeiliApiCredentialEnvVars
}

export function normalizeCsvToArray(csv: string): string[] {
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

export function mergeCsvValues(existing: string, current: string): string {
  return normalizeCsvToArray(`${existing},${current}`).join(",")
}

async function loadYamlContract<T>(
  path: string,
  parseContract: (value: unknown) => T
): Promise<T> {
  const raw = await readFile(path, "utf8")
  let parsed: unknown

  try {
    parsed = parseYaml(raw)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to parse YAML at ${path}: ${message}`)
  }

  return parseContract(parsed)
}

export function loadManifest(
  stackManifestPath: string
): Promise<StackManifest> {
  return loadYamlContract(stackManifestPath, (value) =>
    stackManifestSchema.parse(value)
  )
}

export async function loadDeployContracts(
  stackManifestPath: string,
  stackInputsPath: string
): Promise<DeployContracts> {
  const manifest = await loadManifest(stackManifestPath)
  const stackInputs = await loadYamlContract(stackInputsPath, (value) =>
    stackInputsSchema.parse(value)
  )

  return {
    manifest,
    stackInputs,
  }
}

export function getMeiliApiCredentialEnvVars(
  stackInputs: StackInputs
): MeiliApiCredentialEnvVars {
  return {
    backend: getRuntimeProviderTargetEnvVar(
      stackInputs,
      "meili_api_credentials",
      "backend_key",
      "medusa-be"
    ),
    frontend: getRuntimeProviderTargetEnvVar(
      stackInputs,
      "meili_api_credentials",
      "frontend_key",
      "n1"
    ),
  }
}

function requirePreviewDbInputs(
  context: DeployEnvContext,
  serviceId: string
): void {
  if (!context.previewDbName) {
    throw new Error(`Preview DB name is required for service ${serviceId}.`)
  }

  if (!context.previewDbUser) {
    throw new Error(`Preview DB user is required for service ${serviceId}.`)
  }

  if (!context.previewDbPassword) {
    throw new Error(`Preview DB password is required for service ${serviceId}.`)
  }
}

function appendPreviewDbEnv(
  env: Record<string, string>,
  context: DeployEnvContext,
  serviceId: string
): void {
  requirePreviewDbInputs(context, serviceId)
  env.DC_MEDUSA_APP_DB_NAME = context.previewDbName
  env.DC_MEDUSA_APP_DB_USER = context.previewDbUser
  env.DC_MEDUSA_APP_DB_PASSWORD = context.previewDbPassword
}

function appendPreviewRandomOnceEnv(
  env: Record<string, string>,
  context: DeployEnvContext,
  serviceId: string
): void {
  for (const secret of context.previewRandomOnceSecrets) {
    for (const target of secret.targets) {
      if (target.service_id === serviceId) {
        env[target.env_var] = secret.value
      }
    }
  }
}

function appendMeiliFrontendEnv(
  env: Record<string, string>,
  context: DeployEnvContext,
  serviceId: string
): void {
  if (context.lane === "main" && !context.meiliFrontendKey) {
    throw new Error(`Frontend Meili key is required for service ${serviceId}.`)
  }

  if (context.meiliFrontendKey) {
    env[context.meiliFrontendEnvVar] = context.meiliFrontendKey
  }
}

function appendMeiliBackendEnv(
  env: Record<string, string>,
  context: DeployEnvContext,
  serviceId: string
): void {
  if (context.lane === "main" && !context.meiliBackendKey) {
    throw new Error(`Backend Meili key is required for service ${serviceId}.`)
  }

  if (context.meiliBackendKey) {
    env[context.meiliApiCredentialEnvVars.backend] = context.meiliBackendKey
  }
}

function buildServiceEnvOverride(
  service: DeployableService,
  context: DeployEnvContext
): EnvOverride | null {
  const env: Record<string, string> = {}

  if (context.lane === "preview" && service.consumes.preview_db) {
    appendPreviewDbEnv(env, context, service.id)
  }

  if (context.lane === "preview") {
    appendPreviewRandomOnceEnv(env, context, service.id)
  }

  if (service.consumes.meili_frontend_key) {
    appendMeiliFrontendEnv(env, context, service.id)
  }

  if (service.consumes.meili_backend_key) {
    appendMeiliBackendEnv(env, context, service.id)
  }

  if (Object.keys(env).length === 0) {
    return null
  }

  return {
    service_id: service.id,
    service_slug: service.serviceSlug,
    env,
  }
}

export function buildExpectedEnvOverrides(
  deployServiceIds: string[],
  contracts: DeployContracts,
  context: DeployEnvContext
): EnvOverride[] {
  return deployServiceIds.flatMap((serviceId) => {
    const service = getDeployableService(contracts.manifest, serviceId)
    const override = buildServiceEnvOverride(service, context)

    return override ? [override] : []
  })
}

function addPersistedEnvKey(
  envKeys: string[],
  seen: Set<string>,
  key: string
): void {
  if (key && !seen.has(key)) {
    seen.add(key)
    envKeys.push(key)
  }
}

function buildPersistedEnvKeysForService(
  service: DeployableService,
  lane: Lane,
  contracts: DeployContracts,
  meiliApiCredentialEnvVars: MeiliApiCredentialEnvVars
): string[] {
  const envKeys: string[] = []
  const seen = new Set<string>()
  const definitions = getPreviewRandomOnceSecretDefinitions(
    contracts.stackInputs
  )

  if (lane === "preview" && service.consumes.preview_db) {
    addPersistedEnvKey(envKeys, seen, "DC_MEDUSA_APP_DB_NAME")
    addPersistedEnvKey(envKeys, seen, "DC_MEDUSA_APP_DB_USER")
    addPersistedEnvKey(envKeys, seen, "DC_MEDUSA_APP_DB_PASSWORD")
  }

  if (service.consumes.meili_frontend_key) {
    addPersistedEnvKey(envKeys, seen, meiliApiCredentialEnvVars.frontend)
  }

  if (service.consumes.meili_backend_key) {
    addPersistedEnvKey(envKeys, seen, meiliApiCredentialEnvVars.backend)
  }

  if (lane === "preview") {
    for (const secret of definitions) {
      for (const target of secret.targets) {
        if (target.service_id === service.id) {
          addPersistedEnvKey(envKeys, seen, target.env_var)
        }
      }
    }
  }

  return envKeys
}

export function buildRequiredPersistedEnv(
  lane: Lane,
  deployServiceIds: string[],
  contracts: DeployContracts
): RequiredPersistedEnv[] {
  const meiliApiCredentialEnvVars = getMeiliApiCredentialEnvVars(
    contracts.stackInputs
  )

  return deployServiceIds.flatMap((serviceId) => {
    const service = getDeployableService(contracts.manifest, serviceId)
    const envKeys = buildPersistedEnvKeysForService(
      service,
      lane,
      contracts,
      meiliApiCredentialEnvVars
    )

    if (envKeys.length === 0) {
      return []
    }

    return [
      {
        service_id: service.id,
        service_slug: service.serviceSlug,
        env_keys: envKeys,
      },
    ]
  })
}

export function buildForbiddenPreviewOnlyEnv(
  lane: Lane,
  deployServiceIds: string[],
  contracts: DeployContracts
): ForbiddenEnvRequirement[] {
  if (lane !== "main") {
    return []
  }

  const randomOnceDefinitions = getPreviewRandomOnceSecretDefinitions(
    contracts.stackInputs
  )

  return deployServiceIds.flatMap((serviceId) => {
    const service = getDeployableService(contracts.manifest, serviceId)
    const envKeys: string[] = []
    const seen = new Set<string>()

    if (service.consumes.preview_db) {
      addPersistedEnvKey(envKeys, seen, "DC_MEDUSA_APP_DB_NAME")
      addPersistedEnvKey(envKeys, seen, "DC_MEDUSA_APP_DB_USER")
      addPersistedEnvKey(envKeys, seen, "DC_MEDUSA_APP_DB_PASSWORD")
    }

    for (const secret of randomOnceDefinitions) {
      for (const target of secret.targets) {
        if (target.service_id === service.id) {
          addPersistedEnvKey(envKeys, seen, target.env_var)
        }
      }
    }

    if (envKeys.length === 0) {
      return []
    }

    return [
      {
        service_id: service.id,
        service_slug: service.serviceSlug,
        env_keys: envKeys,
      },
    ]
  })
}
