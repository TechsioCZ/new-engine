import type {
  MeiliProvisionResponse,
  MeiliVerifyResponse,
} from "../contracts/meilisearch-keys.js"
import {
  meiliProvisionResponseSchema,
  meiliVerifyResponseSchema,
} from "../contracts/meilisearch-keys.js"
import {
  getRuntimeProviderOutputPolicy,
  getRuntimeProviderTargetEnvVar,
  type RuntimeProviderPolicy,
  type StackInputs,
} from "../contracts/stack-inputs.js"

const trailingSlashesPattern = /\/+$/

type RequestOptions = {
  meiliUrl: string
  waitSeconds: number
  retryCount: number
  retryDelaySeconds: number
}

type PolicyDefinition = {
  uid: string
  description: string
  actions: string[]
  indexes: string[]
}

type MeiliApiCredentialPolicies = {
  backendPolicy: RuntimeProviderPolicy
  frontendPolicy: RuntimeProviderPolicy
  backendEnvVar: string
  frontendEnvVar: string
}

type RequestJsonOptions<T> = {
  url: string
  init: RequestInit
  parse: (value: unknown) => T
  retryCount: number
  retryDelaySeconds: number
}

function sleep(seconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000)
  })
}

function normalizeBaseUrl(url: string): string {
  return url.replace(trailingSlashesPattern, "")
}

function resolveMeiliApiCredentialPolicies(
  stackInputs: StackInputs,
  providerId: string
): MeiliApiCredentialPolicies {
  return {
    backendPolicy: getRuntimeProviderOutputPolicy(
      stackInputs,
      providerId,
      "backend_key"
    ),
    frontendPolicy: getRuntimeProviderOutputPolicy(
      stackInputs,
      providerId,
      "frontend_key"
    ),
    backendEnvVar: getRuntimeProviderTargetEnvVar(
      stackInputs,
      providerId,
      "backend_key",
      "medusa-be"
    ),
    frontendEnvVar: getRuntimeProviderTargetEnvVar(
      stackInputs,
      providerId,
      "frontend_key",
      "n1"
    ),
  }
}

function parseResponseBody(text: string, status: number): unknown {
  if (!text.trim()) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Meilisearch returned non-JSON response (HTTP ${status})`)
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
  if (typeof object.code === "string" && object.code.trim()) {
    return `${fallback} (${object.code})`
  }

  return fallback
}

async function requestJson<T>(options: RequestJsonOptions<T>): Promise<T> {
  let attempt = 0

  while (true) {
    try {
      const response = await fetch(options.url, options.init)
      const text = await response.text()
      const body = parseResponseBody(text, response.status)

      if (!response.ok) {
        if (response.status === 404) {
          return options.parse(null)
        }

        throw new Error(
          parseErrorMessage(
            body,
            `Meilisearch request failed (HTTP ${response.status})`
          )
        )
      }

      return options.parse(body)
    } catch (error) {
      if (attempt >= options.retryCount) {
        throw error
      }

      attempt += 1
      await sleep(options.retryDelaySeconds)
    }
  }
}

async function waitForHealth(input: RequestOptions): Promise<void> {
  const startedAt = Date.now()
  const baseUrl = normalizeBaseUrl(input.meiliUrl)

  while (true) {
    try {
      const response = await fetch(`${baseUrl}/health`, { method: "GET" })
      if (response.ok) {
        return
      }
    } catch {
      // keep polling until timeout
    }

    if (Date.now() - startedAt >= input.waitSeconds * 1000) {
      throw new Error(
        `Timed out waiting for Meilisearch health at ${baseUrl}/health`
      )
    }

    await sleep(2)
  }
}

function matchesPolicy(keyObject: unknown, policy: PolicyDefinition): boolean {
  if (!keyObject || typeof keyObject !== "object") {
    return false
  }

  const candidate = keyObject as Record<string, unknown>
  const candidateActions = Array.isArray(candidate.actions)
    ? candidate.actions.filter(
        (value): value is string => typeof value === "string"
      )
    : []
  const candidateIndexes = Array.isArray(candidate.indexes)
    ? candidate.indexes.filter(
        (value): value is string => typeof value === "string"
      )
    : []

  return (
    candidate.uid === policy.uid &&
    candidate.description === policy.description &&
    [...candidateActions].sort().join(",") ===
      [...policy.actions].sort().join(",") &&
    [...candidateIndexes].sort().join(",") ===
      [...policy.indexes].sort().join(",")
  )
}

async function getKeyByUid(
  input: RequestOptions & {
    masterKey: string
    uid: string
  }
): Promise<Record<string, unknown> | null> {
  const result = await requestJson({
    url: `${normalizeBaseUrl(input.meiliUrl)}/keys/${input.uid}`,
    init: {
      method: "GET",
      headers: {
        Authorization: `Bearer ${input.masterKey}`,
      },
    },
    parse: (value) => {
      if (value === null) {
        return null
      }

      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`Failed to read key uid=${input.uid}.`)
      }

      return value as Record<string, unknown>
    },
    retryCount: input.retryCount,
    retryDelaySeconds: input.retryDelaySeconds,
  })

  return result
}

async function createOrUpdateKey(input: {
  meiliUrl: string
  masterKey: string
  uid: string
  description: string
  actions: string[]
  indexes: string[]
  retryCount: number
  retryDelaySeconds: number
}): Promise<{
  keyObject: Record<string, unknown>
  created: boolean
  updated: boolean
}> {
  const policy: PolicyDefinition = {
    uid: input.uid,
    description: input.description,
    actions: input.actions,
    indexes: input.indexes,
  }

  const existing = await getKeyByUid({
    meiliUrl: input.meiliUrl,
    masterKey: input.masterKey,
    uid: input.uid,
    waitSeconds: 0,
    retryCount: input.retryCount,
    retryDelaySeconds: input.retryDelaySeconds,
  })

  if (!existing) {
    const created = await requestJson({
      url: `${normalizeBaseUrl(input.meiliUrl)}/keys`,
      init: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.masterKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: input.uid,
          description: input.description,
          actions: input.actions,
          indexes: input.indexes,
          expiresAt: null,
        }),
      },
      parse: (value) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          throw new Error(`Failed to create key uid=${input.uid}.`)
        }

        return value as Record<string, unknown>
      },
      retryCount: input.retryCount,
      retryDelaySeconds: input.retryDelaySeconds,
    })

    return {
      keyObject: created,
      created: true,
      updated: false,
    }
  }

  if (matchesPolicy(existing, policy)) {
    return {
      keyObject: existing,
      created: false,
      updated: false,
    }
  }

  const updated = await requestJson({
    url: `${normalizeBaseUrl(input.meiliUrl)}/keys/${input.uid}`,
    init: {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${input.masterKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description: input.description,
        actions: input.actions,
        indexes: input.indexes,
        expiresAt: null,
      }),
    },
    parse: (value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`Failed to update key uid=${input.uid}.`)
      }

      return value as Record<string, unknown>
    },
    retryCount: input.retryCount,
    retryDelaySeconds: input.retryDelaySeconds,
  })

  return {
    keyObject: updated,
    created: false,
    updated: true,
  }
}

export async function provisionMeiliKeys(input: {
  meiliUrl: string
  masterKey: string
  waitSeconds: number
  retryCount: number
  retryDelaySeconds: number
  stackInputs: StackInputs
  providerId: string
}): Promise<MeiliProvisionResponse> {
  const {
    backendPolicy,
    frontendPolicy,
    backendEnvVar,
    frontendEnvVar,
  } = resolveMeiliApiCredentialPolicies(input.stackInputs, input.providerId)

  await waitForHealth({
    meiliUrl: input.meiliUrl,
    waitSeconds: input.waitSeconds,
    retryCount: input.retryCount,
    retryDelaySeconds: input.retryDelaySeconds,
  })

  const backend = await createOrUpdateKey({
    meiliUrl: input.meiliUrl,
    masterKey: input.masterKey,
    uid: backendPolicy.uid,
    description: backendPolicy.description,
    actions: backendPolicy.actions,
    indexes: backendPolicy.indexes,
    retryCount: input.retryCount,
    retryDelaySeconds: input.retryDelaySeconds,
  })
  const frontend = await createOrUpdateKey({
    meiliUrl: input.meiliUrl,
    masterKey: input.masterKey,
    uid: frontendPolicy.uid,
    description: frontendPolicy.description,
    actions: frontendPolicy.actions,
    indexes: frontendPolicy.indexes,
    retryCount: input.retryCount,
    retryDelaySeconds: input.retryDelaySeconds,
  })

  return meiliProvisionResponseSchema.parse({
    meili_url: normalizeBaseUrl(input.meiliUrl),
    backend_key: String(backend.keyObject.key ?? ""),
    frontend_key: String(frontend.keyObject.key ?? ""),
    backend_uid: String(backend.keyObject.uid ?? backendPolicy.uid),
    frontend_uid: String(frontend.keyObject.uid ?? frontendPolicy.uid),
    backend_created: backend.created,
    frontend_created: frontend.created,
    backend_updated: backend.updated,
    frontend_updated: frontend.updated,
    backend_env_var: backendEnvVar,
    frontend_env_var: frontendEnvVar,
  })
}

export async function verifyMeiliKeys(input: {
  meiliUrl: string
  masterKey: string
  backendKey: string
  frontendKey: string
  waitSeconds: number
  retryCount: number
  retryDelaySeconds: number
  stackInputs: StackInputs
  providerId: string
}): Promise<MeiliVerifyResponse> {
  const { backendPolicy, frontendPolicy } = resolveMeiliApiCredentialPolicies(
    input.stackInputs,
    input.providerId
  )

  if (input.backendKey === input.masterKey) {
    throw new Error(
      "Backend key equals master key. This violates scoped-key policy."
    )
  }

  if (input.frontendKey === input.masterKey) {
    throw new Error(
      "Frontend key equals master key. This violates scoped-key policy."
    )
  }

  if (input.frontendKey === input.backendKey) {
    throw new Error(
      "Frontend key equals backend key. Frontend must use dedicated read-only key."
    )
  }

  await waitForHealth({
    meiliUrl: input.meiliUrl,
    waitSeconds: input.waitSeconds,
    retryCount: input.retryCount,
    retryDelaySeconds: input.retryDelaySeconds,
  })

  const backend = await getKeyByUid({
    meiliUrl: input.meiliUrl,
    masterKey: input.masterKey,
    uid: backendPolicy.uid,
    waitSeconds: input.waitSeconds,
    retryCount: input.retryCount,
    retryDelaySeconds: input.retryDelaySeconds,
  })
  const frontend = await getKeyByUid({
    meiliUrl: input.meiliUrl,
    masterKey: input.masterKey,
    uid: frontendPolicy.uid,
    waitSeconds: input.waitSeconds,
    retryCount: input.retryCount,
    retryDelaySeconds: input.retryDelaySeconds,
  })

  if (!backend) {
    throw new Error(
      `Backend key with expected uid=${backendPolicy.uid} not found in Meilisearch.`
    )
  }

  if (!frontend) {
    throw new Error(
      `Frontend key with expected uid=${frontendPolicy.uid} not found in Meilisearch.`
    )
  }

  if (
    !matchesPolicy(backend, backendPolicy)
  ) {
    throw new Error(
      `Backend key uid=${backendPolicy.uid} does not match the contract-owned policy.`
    )
  }

  if (
    !matchesPolicy(frontend, frontendPolicy)
  ) {
    throw new Error(
      `Frontend key uid=${frontendPolicy.uid} does not match the contract-owned policy.`
    )
  }

  if (String(backend.key ?? "") !== input.backendKey) {
    throw new Error(
      `Provided backend key does not match key stored under uid=${backendPolicy.uid}.`
    )
  }

  if (String(frontend.key ?? "") !== input.frontendKey) {
    throw new Error(
      `Provided frontend key does not match key stored under uid=${frontendPolicy.uid}.`
    )
  }

  return meiliVerifyResponseSchema.parse({
    meili_url: normalizeBaseUrl(input.meiliUrl),
    backend_uid: backendPolicy.uid,
    frontend_uid: frontendPolicy.uid,
    backend_description: backendPolicy.description,
    frontend_description: frontendPolicy.description,
    backend_policy_actions: backendPolicy.actions,
    backend_policy_indexes: backendPolicy.indexes,
    frontend_policy_actions: frontendPolicy.actions,
    frontend_policy_indexes: frontendPolicy.indexes,
    result: "ok",
  })
}
