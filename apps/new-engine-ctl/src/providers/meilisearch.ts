import { sleep } from "@techsio/std/async"
import { isRecord } from "@techsio/std/object"

import type {
  MeiliProvisionResponse,
  MeiliVerifyResponse,
} from "../contracts/meilisearch-keys.js"
import {
  meiliProvisionResponseSchema,
  meiliVerifyResponseSchema,
} from "../contracts/meilisearch-keys.js"
import {
  getRuntimeProviderMeiliKeyPolicy,
  getRuntimeProviderTargetEnvVar,
} from "../contracts/stack-inputs.js"
import type { StackInputs } from "../contracts/stack-inputs.js"

const trailingSlashesPattern = /\/+$/u

interface RequestOptions {
  meiliUrl: string
  waitSeconds: number
  timeoutSeconds: number
  retryCount: number
  retryDelaySeconds: number
}

interface PolicyDefinition {
  uid: string
  description: string
  actions: string[]
  indexes: string[]
}

interface MeiliApiCredentialPolicies {
  backendPolicy: PolicyDefinition
  frontendPolicy: PolicyDefinition
  backendEnvVar: string
  frontendEnvVar: string
}

interface RequestJsonOptions<T> {
  url: string
  init: RequestInit
  parse: (value: unknown) => T
  timeoutSeconds: number
  retryCount: number
  retryDelaySeconds: number
}

const normalizeBaseUrl = (url: string): string =>
  url.replace(trailingSlashesPattern, "")

const fetchWithTimeout = async (
  url: string,
  init: RequestInit,
  timeoutSeconds: number,
): Promise<Response> => {
  const timeoutController = new AbortController()
  const controller = new AbortController()
  const requestSignal = init.signal
  const abortFromRequestSignal = () => {
    controller.abort()
  }
  const abortFromTimeout = () => {
    controller.abort()
  }

  if (requestSignal?.aborted === true) {
    controller.abort()
  } else {
    requestSignal?.addEventListener("abort", abortFromRequestSignal, {
      once: true,
    })
  }

  timeoutController.signal.addEventListener("abort", abortFromTimeout, {
    once: true,
  })

  const timeout = setTimeout(() => {
    timeoutController.abort()
  }, timeoutSeconds * 1000)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError" &&
      timeoutController.signal.aborted
    ) {
      throw new Error(
        `Meilisearch request timed out after ${timeoutSeconds}s: ${url}`,
        { cause: error },
      )
    }

    throw error
  } finally {
    clearTimeout(timeout)
    requestSignal?.removeEventListener("abort", abortFromRequestSignal)
    timeoutController.signal.removeEventListener("abort", abortFromTimeout)
  }
}

const resolveMeiliApiCredentialPolicies = (
  stackInputs: StackInputs,
  providerId: string,
): MeiliApiCredentialPolicies => ({
  backendEnvVar: getRuntimeProviderTargetEnvVar(
    stackInputs,
    providerId,
    "backend_key",
    "medusa-be",
  ),
  backendPolicy: getRuntimeProviderMeiliKeyPolicy(
    stackInputs,
    providerId,
    "backend_key",
  ),
  frontendEnvVar: getRuntimeProviderTargetEnvVar(
    stackInputs,
    providerId,
    "frontend_key",
    "n1",
  ),
  frontendPolicy: getRuntimeProviderMeiliKeyPolicy(
    stackInputs,
    providerId,
    "frontend_key",
  ),
})

const parseResponseBody = (text: string, status: number): unknown => {
  if (!text.trim()) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Meilisearch returned non-JSON response (HTTP ${status})`)
  }
}

const isNonNullObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const parseErrorMessage = (payload: unknown, fallback: string): string => {
  if (!isNonNullObject(payload)) {
    return fallback
  }

  if (typeof payload["detail"] === "string" && payload["detail"].trim()) {
    return payload["detail"]
  }
  if (typeof payload["message"] === "string" && payload["message"].trim()) {
    return payload["message"]
  }
  if (typeof payload["code"] === "string" && payload["code"].trim()) {
    return `${fallback} (${payload["code"]})`
  }

  return fallback
}

const requestJson = async <T>(options: RequestJsonOptions<T>): Promise<T> => {
  const attempt = async (attemptNumber: number): Promise<T> => {
    try {
      const response = await fetchWithTimeout(
        options.url,
        options.init,
        options.timeoutSeconds,
      )
      const text = await response.text()
      const body = parseResponseBody(text, response.status)

      if (!response.ok) {
        if (response.status === 404) {
          return options.parse(null)
        }

        throw new Error(
          parseErrorMessage(
            body,
            `Meilisearch request failed (HTTP ${response.status})`,
          ),
        )
      }

      return options.parse(body)
    } catch (error) {
      if (attemptNumber >= options.retryCount) {
        throw error
      }

      await sleep(options.retryDelaySeconds * 1000)
      return await attempt(attemptNumber + 1)
    }
  }

  return await attempt(0)
}

const waitForHealth = async (input: RequestOptions): Promise<void> => {
  const startedAt = Date.now()
  const baseUrl = normalizeBaseUrl(input.meiliUrl)

  const poll = async (): Promise<void> => {
    try {
      const response = await fetchWithTimeout(
        `${baseUrl}/health`,
        { method: "GET" },
        input.timeoutSeconds,
      )
      if (response.ok) {
        return
      }
    } catch {
      // keep polling until timeout
    }

    if (Date.now() - startedAt >= input.waitSeconds * 1000) {
      throw new Error(
        `Timed out waiting for Meilisearch health at ${baseUrl}/health`,
      )
    }

    await sleep(2000)
    await poll()
  }

  await poll()
}

const readString = (value: unknown, fallback: string): string =>
  typeof value === "string" ? value : fallback

const readStringArray = (
  object: Record<string, unknown>,
  key: string,
): string[] => {
  const value = object[key]
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

const matchesPermissions = (
  keyObject: unknown,
  policy: PolicyDefinition,
): boolean => {
  if (!isNonNullObject(keyObject)) {
    return false
  }

  const candidateActions = readStringArray(keyObject, "actions")
  const candidateIndexes = readStringArray(keyObject, "indexes")

  return (
    candidateActions.toSorted().join(",") ===
      policy.actions.toSorted().join(",") &&
    candidateIndexes.toSorted().join(",") ===
      policy.indexes.toSorted().join(",")
  )
}

const matchesPolicy = (
  keyObject: unknown,
  policy: PolicyDefinition,
): boolean => {
  if (!isNonNullObject(keyObject)) {
    return false
  }

  return (
    keyObject["uid"] === policy.uid &&
    matchesPermissions(keyObject, policy) &&
    keyObject["description"] === policy.description
  )
}

const matchesDescription = (
  keyObject: Record<string, unknown>,
  policy: PolicyDefinition,
): boolean => keyObject["description"] === policy.description

const getKeyByUid = async (
  input: RequestOptions & {
    masterKey: string
    uid: string
  },
): Promise<Record<string, unknown> | null> => {
  const result = await requestJson({
    init: {
      headers: {
        Authorization: `Bearer ${input.masterKey}`,
      },
      method: "GET",
    },
    parse: (value) => {
      if (value === null) {
        return null
      }

      if (!isRecord(value)) {
        throw new Error(`Failed to read key uid=${input.uid}.`)
      }

      return value
    },
    retryCount: input.retryCount,
    retryDelaySeconds: input.retryDelaySeconds,
    timeoutSeconds: input.timeoutSeconds,
    url: `${normalizeBaseUrl(input.meiliUrl)}/keys/${input.uid}`,
  })

  return result
}

interface ReconcileKeyInput {
  meiliUrl: string
  masterKey: string
  uid: string
  description: string
  actions: string[]
  indexes: string[]
  timeoutSeconds: number
  retryCount: number
  retryDelaySeconds: number
}

const createKey = async (
  input: ReconcileKeyInput,
): Promise<Record<string, unknown>> =>
  await requestJson({
    init: {
      body: JSON.stringify({
        actions: input.actions,
        description: input.description,
        expiresAt: null,
        indexes: input.indexes,
        uid: input.uid,
      }),
      headers: {
        Authorization: `Bearer ${input.masterKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
    parse: (value) => {
      if (!isRecord(value)) {
        throw new Error(`Failed to create key uid=${input.uid}.`)
      }

      return value
    },
    retryCount: input.retryCount,
    retryDelaySeconds: input.retryDelaySeconds,
    timeoutSeconds: input.timeoutSeconds,
    url: `${normalizeBaseUrl(input.meiliUrl)}/keys`,
  })

const updateKeyDescription = async (
  input: ReconcileKeyInput,
): Promise<Record<string, unknown>> =>
  await requestJson({
    init: {
      body: JSON.stringify({
        description: input.description,
      }),
      headers: {
        Authorization: `Bearer ${input.masterKey}`,
        "Content-Type": "application/json",
      },
      method: "PATCH",
    },
    parse: (value) => {
      if (!isRecord(value)) {
        throw new Error(`Failed to update key uid=${input.uid}.`)
      }

      return value
    },
    retryCount: input.retryCount,
    retryDelaySeconds: input.retryDelaySeconds,
    timeoutSeconds: input.timeoutSeconds,
    url: `${normalizeBaseUrl(input.meiliUrl)}/keys/${input.uid}`,
  })

const deleteKey = async (input: ReconcileKeyInput): Promise<void> => {
  await requestJson({
    init: {
      headers: {
        Authorization: `Bearer ${input.masterKey}`,
      },
      method: "DELETE",
    },
    parse: () => null,
    retryCount: input.retryCount,
    retryDelaySeconds: input.retryDelaySeconds,
    timeoutSeconds: input.timeoutSeconds,
    url: `${normalizeBaseUrl(input.meiliUrl)}/keys/${input.uid}`,
  })
}

const createOrUpdateKey = async (
  input: ReconcileKeyInput,
): Promise<{
  keyObject: Record<string, unknown>
  created: boolean
  updated: boolean
}> => {
  const policy: PolicyDefinition = {
    actions: input.actions,
    description: input.description,
    indexes: input.indexes,
    uid: input.uid,
  }

  const existing = await getKeyByUid({
    masterKey: input.masterKey,
    meiliUrl: input.meiliUrl,
    retryCount: input.retryCount,
    retryDelaySeconds: input.retryDelaySeconds,
    timeoutSeconds: input.timeoutSeconds,
    uid: input.uid,
    waitSeconds: 0,
  })

  if (!existing) {
    const created = await createKey(input)

    return {
      created: true,
      keyObject: created,
      updated: false,
    }
  }

  if (!matchesPermissions(existing, policy)) {
    await deleteKey(input)
    const replacement = await createKey(input)

    return {
      created: false,
      keyObject: replacement,
      updated: true,
    }
  }

  if (matchesDescription(existing, policy)) {
    return {
      created: false,
      keyObject: existing,
      updated: false,
    }
  }

  const updated = await updateKeyDescription(input)

  return {
    created: false,
    keyObject: updated,
    updated: true,
  }
}

export const provisionMeiliKeys = async (input: {
  meiliUrl: string
  masterKey: string
  waitSeconds: number
  timeoutSeconds: number
  retryCount: number
  retryDelaySeconds: number
  stackInputs: StackInputs
  providerId: string
}): Promise<MeiliProvisionResponse> => {
  const { backendPolicy, frontendPolicy, backendEnvVar, frontendEnvVar } =
    resolveMeiliApiCredentialPolicies(input.stackInputs, input.providerId)

  await waitForHealth({
    meiliUrl: input.meiliUrl,
    retryCount: input.retryCount,
    retryDelaySeconds: input.retryDelaySeconds,
    timeoutSeconds: input.timeoutSeconds,
    waitSeconds: input.waitSeconds,
  })

  const [backend, frontend] = await Promise.all([
    createOrUpdateKey({
      actions: backendPolicy.actions,
      description: backendPolicy.description,
      indexes: backendPolicy.indexes,
      masterKey: input.masterKey,
      meiliUrl: input.meiliUrl,
      retryCount: input.retryCount,
      retryDelaySeconds: input.retryDelaySeconds,
      timeoutSeconds: input.timeoutSeconds,
      uid: backendPolicy.uid,
    }),
    createOrUpdateKey({
      actions: frontendPolicy.actions,
      description: frontendPolicy.description,
      indexes: frontendPolicy.indexes,
      masterKey: input.masterKey,
      meiliUrl: input.meiliUrl,
      retryCount: input.retryCount,
      retryDelaySeconds: input.retryDelaySeconds,
      timeoutSeconds: input.timeoutSeconds,
      uid: frontendPolicy.uid,
    }),
  ])

  return meiliProvisionResponseSchema.parse({
    backend_created: backend.created,
    backend_env_var: backendEnvVar,
    backend_key: readString(backend.keyObject["key"], ""),
    backend_uid: readString(backend.keyObject["uid"], backendPolicy.uid),
    backend_updated: backend.updated,
    frontend_created: frontend.created,
    frontend_env_var: frontendEnvVar,
    frontend_key: readString(frontend.keyObject["key"], ""),
    frontend_uid: readString(frontend.keyObject["uid"], frontendPolicy.uid),
    frontend_updated: frontend.updated,
    meili_url: normalizeBaseUrl(input.meiliUrl),
  })
}

export const verifyMeiliKeys = async (input: {
  meiliUrl: string
  masterKey: string
  backendKey: string
  frontendKey: string
  waitSeconds: number
  timeoutSeconds: number
  retryCount: number
  retryDelaySeconds: number
  stackInputs: StackInputs
  providerId: string
}): Promise<MeiliVerifyResponse> => {
  const { backendPolicy, frontendPolicy } = resolveMeiliApiCredentialPolicies(
    input.stackInputs,
    input.providerId,
  )

  if (input.backendKey === input.masterKey) {
    throw new Error(
      "Backend key equals master key. This violates scoped-key policy.",
    )
  }

  if (input.frontendKey === input.masterKey) {
    throw new Error(
      "Frontend key equals master key. This violates scoped-key policy.",
    )
  }

  if (input.frontendKey === input.backendKey) {
    throw new Error(
      "Frontend key equals backend key. Frontend must use dedicated read-only key.",
    )
  }

  await waitForHealth({
    meiliUrl: input.meiliUrl,
    retryCount: input.retryCount,
    retryDelaySeconds: input.retryDelaySeconds,
    timeoutSeconds: input.timeoutSeconds,
    waitSeconds: input.waitSeconds,
  })

  const [backend, frontend] = await Promise.all([
    getKeyByUid({
      masterKey: input.masterKey,
      meiliUrl: input.meiliUrl,
      retryCount: input.retryCount,
      retryDelaySeconds: input.retryDelaySeconds,
      timeoutSeconds: input.timeoutSeconds,
      uid: backendPolicy.uid,
      waitSeconds: input.waitSeconds,
    }),
    getKeyByUid({
      masterKey: input.masterKey,
      meiliUrl: input.meiliUrl,
      retryCount: input.retryCount,
      retryDelaySeconds: input.retryDelaySeconds,
      timeoutSeconds: input.timeoutSeconds,
      uid: frontendPolicy.uid,
      waitSeconds: input.waitSeconds,
    }),
  ])

  if (!backend) {
    throw new Error(
      `Backend key with expected uid=${backendPolicy.uid} not found in Meilisearch.`,
    )
  }

  if (!frontend) {
    throw new Error(
      `Frontend key with expected uid=${frontendPolicy.uid} not found in Meilisearch.`,
    )
  }

  if (!matchesPolicy(backend, backendPolicy)) {
    throw new Error(
      `Backend key uid=${backendPolicy.uid} does not match the contract-owned policy.`,
    )
  }

  if (!matchesPolicy(frontend, frontendPolicy)) {
    throw new Error(
      `Frontend key uid=${frontendPolicy.uid} does not match the contract-owned policy.`,
    )
  }

  if (readString(backend["key"], "") !== input.backendKey) {
    throw new Error(
      `Provided backend key does not match key stored under uid=${backendPolicy.uid}.`,
    )
  }

  if (readString(frontend["key"], "") !== input.frontendKey) {
    throw new Error(
      `Provided frontend key does not match key stored under uid=${frontendPolicy.uid}.`,
    )
  }

  return meiliVerifyResponseSchema.parse({
    backend_description: backendPolicy.description,
    backend_policy_actions: backendPolicy.actions,
    backend_policy_indexes: backendPolicy.indexes,
    backend_uid: backendPolicy.uid,
    frontend_description: frontendPolicy.description,
    frontend_policy_actions: frontendPolicy.actions,
    frontend_policy_indexes: frontendPolicy.indexes,
    frontend_uid: frontendPolicy.uid,
    meili_url: normalizeBaseUrl(input.meiliUrl),
    result: "ok",
  })
}
