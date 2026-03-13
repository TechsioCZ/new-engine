import { parse as parseYaml } from "yaml"

type JsonRecord = Record<string, unknown>

export interface RuntimeProviderTargetEnv {
  serviceId: string
  envVar: string
}

export interface SearchCredentialsPolicy {
  uid: string
  description: string
  actions: string[]
  indexes: string[]
}

export interface SearchCredentialsOutput {
  outputId: "backend_key" | "frontend_key"
  targetEnvs: RuntimeProviderTargetEnv[]
  policy: SearchCredentialsPolicy
}

export interface SearchCredentialsProviderConfig {
  providerId: "search_credentials"
  sourceServiceId: string
  readinessPath: string
  outputs: {
    backend: SearchCredentialsOutput
    frontend: SearchCredentialsOutput
  }
}

export interface StackInputsConfig {
  searchCredentialsProvider: SearchCredentialsProviderConfig
  hasReservedMedusaPublishableKey: boolean
}

const DEFAULT_STACK_INPUTS_URL = new URL("../../../config/stack-inputs.yaml", import.meta.url)

function assertObject(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
  return value as JsonRecord
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`)
  }
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error(`${label} cannot be empty`)
  }
  return trimmed
}

function assertStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`)
  }
  return value.map((entry, index) => assertString(entry, `${label}[${index}]`))
}

function assertTargetEnvs(value: unknown, label: string): RuntimeProviderTargetEnv[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`)
  }

  return value.map((entry, index) => {
    const object = assertObject(entry, `${label}[${index}]`)
    return {
      serviceId: assertString(object.service_id, `${label}[${index}].service_id`),
      envVar: assertString(object.env_var, `${label}[${index}].env_var`),
    }
  })
}

function parseSearchCredentialsOutput(value: unknown, label: string, expectedOutputId: "backend_key" | "frontend_key"): SearchCredentialsOutput {
  const object = assertObject(value, label)
  const outputId = assertString(object.output_id, `${label}.output_id`)
  if (outputId !== expectedOutputId) {
    throw new Error(`${label}.output_id must be ${expectedOutputId}`)
  }

  const policyObject = assertObject(object.policy, `${label}.policy`)

  return {
    outputId,
    targetEnvs: assertTargetEnvs(object.target_envs, `${label}.target_envs`),
    policy: {
      uid: assertString(policyObject.uid, `${label}.policy.uid`),
      description: assertString(policyObject.description, `${label}.policy.description`),
      actions: assertStringArray(policyObject.actions, `${label}.policy.actions`),
      indexes: assertStringArray(policyObject.indexes, `${label}.policy.indexes`),
    },
  }
}

function parseSearchCredentialsProvider(provider: unknown): SearchCredentialsProviderConfig {
  const object = assertObject(provider, "runtime provider search_credentials")

  if (assertString(object.provider_id, "search_credentials.provider_id") !== "search_credentials") {
    throw new Error("search_credentials provider_id mismatch")
  }

  if (assertString(object.status ?? "active", "search_credentials.status") !== "active") {
    throw new Error("search_credentials provider must be active")
  }

  const readinessObject = assertObject(object.readiness, "search_credentials.readiness")
  if (assertString(readinessObject.kind, "search_credentials.readiness.kind") !== "http_health") {
    throw new Error("search_credentials.readiness.kind must be http_health")
  }

  const outputs = Array.isArray(object.outputs) ? object.outputs : []
  const backendOutput = outputs.find((entry) => {
    const record = assertObject(entry, "search_credentials.outputs[]")
    return record.output_id === "backend_key"
  })
  const frontendOutput = outputs.find((entry) => {
    const record = assertObject(entry, "search_credentials.outputs[]")
    return record.output_id === "frontend_key"
  })

  if (!backendOutput || !frontendOutput) {
    throw new Error("search_credentials provider must define backend_key and frontend_key outputs")
  }

  return {
    providerId: "search_credentials",
    sourceServiceId: assertString(object.source_service_id, "search_credentials.source_service_id"),
    readinessPath: assertString(readinessObject.path, "search_credentials.readiness.path"),
    outputs: {
      backend: parseSearchCredentialsOutput(backendOutput, "search_credentials.outputs.backend_key", "backend_key"),
      frontend: parseSearchCredentialsOutput(frontendOutput, "search_credentials.outputs.frontend_key", "frontend_key"),
    },
  }
}

function hasReservedMedusaPublishableKeyProvider(value: unknown): boolean {
  if (!Array.isArray(value)) {
    return false
  }

  return value.some((entry) => {
    const object = assertObject(entry, "runtime provider")
    return object.provider_id === "medusa_publishable_key" && (object.status ?? "active") === "reserved"
  })
}

export async function loadStackInputs(env: Record<string, string | undefined> = process.env): Promise<StackInputsConfig> {
  const overridePath = env.STACK_INPUTS_PATH?.trim()
  const fileHandle = overridePath ? Bun.file(overridePath) : Bun.file(DEFAULT_STACK_INPUTS_URL)
  const rawText = await fileHandle.text()
  const parsed = parseYaml(rawText)
  const document = assertObject(parsed, "stack inputs")
  const runtimeProvidersObject = assertObject(document.runtime_providers, "runtime_providers")
  const providers = runtimeProvidersObject.providers

  if (!Array.isArray(providers)) {
    throw new Error("runtime_providers.providers must be an array")
  }

  const searchCredentialsProvider = providers.find((provider) => {
    const object = assertObject(provider, "runtime provider")
    return object.provider_id === "search_credentials"
  })

  if (!searchCredentialsProvider) {
    throw new Error("Missing active runtime provider: search_credentials")
  }

  return {
    searchCredentialsProvider: parseSearchCredentialsProvider(searchCredentialsProvider),
    hasReservedMedusaPublishableKey: hasReservedMedusaPublishableKeyProvider(providers),
  }
}
