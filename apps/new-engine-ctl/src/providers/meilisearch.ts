import type {
  MeiliProvisionResponse,
  MeiliVerifyResponse,
} from "../contracts/meilisearch-keys.js"
import {
  meiliProvisionResponseSchema,
  meiliVerifyResponseSchema,
} from "../contracts/meilisearch-keys.js"
import {
  getRuntimeProviderTargetEnvVar,
  type StackInputs,
} from "../contracts/stack-inputs.js"

const BACKEND_UID = "2f2e1f59-7b5a-4f2f-9f28-7a9137f7e6c1"
const FRONTEND_UID = "3a6b6d2c-1e2f-4b8c-8d4f-0f7c2b9a1d55"
const BACKEND_DESCRIPTION = "backend-medusa"
const FRONTEND_DESCRIPTION = "frontend-medusa"
const BACKEND_ACTIONS = [
  "search",
  "documents.add",
  "documents.delete",
  "indexes.get",
  "indexes.create",
  "settings.update",
]
const FRONTEND_ACTIONS = ["search"]
const BACKEND_INDEXES = ["products", "categories", "producers"]
const FRONTEND_INDEXES = ["products", "categories", "producers"]
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

        throw new Error(`Meilisearch request failed (HTTP ${response.status})`)
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
  await waitForHealth({
    meiliUrl: input.meiliUrl,
    waitSeconds: input.waitSeconds,
    retryCount: input.retryCount,
    retryDelaySeconds: input.retryDelaySeconds,
  })

  const backend = await createOrUpdateKey({
    meiliUrl: input.meiliUrl,
    masterKey: input.masterKey,
    uid: BACKEND_UID,
    description: BACKEND_DESCRIPTION,
    actions: BACKEND_ACTIONS,
    indexes: BACKEND_INDEXES,
    retryCount: input.retryCount,
    retryDelaySeconds: input.retryDelaySeconds,
  })
  const frontend = await createOrUpdateKey({
    meiliUrl: input.meiliUrl,
    masterKey: input.masterKey,
    uid: FRONTEND_UID,
    description: FRONTEND_DESCRIPTION,
    actions: FRONTEND_ACTIONS,
    indexes: FRONTEND_INDEXES,
    retryCount: input.retryCount,
    retryDelaySeconds: input.retryDelaySeconds,
  })

  return meiliProvisionResponseSchema.parse({
    meili_url: normalizeBaseUrl(input.meiliUrl),
    backend_key: String(backend.keyObject.key ?? ""),
    frontend_key: String(frontend.keyObject.key ?? ""),
    backend_uid: String(backend.keyObject.uid ?? BACKEND_UID),
    frontend_uid: String(frontend.keyObject.uid ?? FRONTEND_UID),
    backend_created: backend.created,
    frontend_created: frontend.created,
    backend_updated: backend.updated,
    frontend_updated: frontend.updated,
    backend_env_var: getRuntimeProviderTargetEnvVar(
      input.stackInputs,
      input.providerId,
      "backend_key",
      "medusa-be"
    ),
    frontend_env_var: getRuntimeProviderTargetEnvVar(
      input.stackInputs,
      input.providerId,
      "frontend_key",
      "n1"
    ),
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
}): Promise<MeiliVerifyResponse> {
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
    uid: BACKEND_UID,
    waitSeconds: input.waitSeconds,
    retryCount: input.retryCount,
    retryDelaySeconds: input.retryDelaySeconds,
  })
  const frontend = await getKeyByUid({
    meiliUrl: input.meiliUrl,
    masterKey: input.masterKey,
    uid: FRONTEND_UID,
    waitSeconds: input.waitSeconds,
    retryCount: input.retryCount,
    retryDelaySeconds: input.retryDelaySeconds,
  })

  if (!backend) {
    throw new Error(
      `Backend key with expected uid=${BACKEND_UID} not found in Meilisearch.`
    )
  }

  if (!frontend) {
    throw new Error(
      `Frontend key with expected uid=${FRONTEND_UID} not found in Meilisearch.`
    )
  }

  if (
    !matchesPolicy(backend, {
      uid: BACKEND_UID,
      description: BACKEND_DESCRIPTION,
      actions: BACKEND_ACTIONS,
      indexes: BACKEND_INDEXES,
    })
  ) {
    throw new Error(
      `Backend key uid=${BACKEND_UID} does not match expected fixed policy.`
    )
  }

  if (
    !matchesPolicy(frontend, {
      uid: FRONTEND_UID,
      description: FRONTEND_DESCRIPTION,
      actions: FRONTEND_ACTIONS,
      indexes: FRONTEND_INDEXES,
    })
  ) {
    throw new Error(
      `Frontend key uid=${FRONTEND_UID} does not match expected fixed policy.`
    )
  }

  if (String(backend.key ?? "") !== input.backendKey) {
    throw new Error(
      `Provided backend key does not match key stored under uid=${BACKEND_UID}.`
    )
  }

  if (String(frontend.key ?? "") !== input.frontendKey) {
    throw new Error(
      `Provided frontend key does not match key stored under uid=${FRONTEND_UID}.`
    )
  }

  return meiliVerifyResponseSchema.parse({
    meili_url: normalizeBaseUrl(input.meiliUrl),
    backend_uid: BACKEND_UID,
    frontend_uid: FRONTEND_UID,
    backend_description: BACKEND_DESCRIPTION,
    frontend_description: FRONTEND_DESCRIPTION,
    backend_policy_actions: BACKEND_ACTIONS,
    backend_policy_indexes: BACKEND_INDEXES,
    frontend_policy_actions: FRONTEND_ACTIONS,
    frontend_policy_indexes: FRONTEND_INDEXES,
    result: "ok",
  })
}
