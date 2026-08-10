import { sleep } from "@techsio/std/async"
import { z } from "zod"

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

const meiliKeySchema = z.object({
  actions: z.array(z.string()),
  description: z.string(),
  indexes: z.array(z.string()),
  key: z.string(),
  uid: z.string(),
})

type MeiliKey = z.infer<typeof meiliKeySchema>

const meiliErrorResponseSchema = z.object({
  code: z.string().optional(),
  detail: z.string().optional(),
  message: z.string().optional(),
})

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

const parseErrorMessage = (payload: unknown, fallback: string): string => {
  const result = meiliErrorResponseSchema.safeParse(payload)
  if (!result.success) {
    return fallback
  }
  const { code, detail, message } = result.data

  if (detail !== undefined && detail.trim().length > 0) {
    return detail
  }
  if (message !== undefined && message.trim().length > 0) {
    return message
  }
  if (code !== undefined && code.trim().length > 0) {
    return `${fallback} (${code})`
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

const parseMeiliKey = (value: unknown, errorMessage: string): MeiliKey => {
  const result = meiliKeySchema.safeParse(value)
  if (!result.success) {
    throw new Error(errorMessage, { cause: result.error })
  }

  return result.data
}

const matchesPermissions = (
  keyObject: MeiliKey,
  policy: PolicyDefinition,
): boolean =>
  keyObject.actions.toSorted().join(",") ===
    policy.actions.toSorted().join(",") &&
  keyObject.indexes.toSorted().join(",") === policy.indexes.toSorted().join(",")

const matchesPolicy = (
  keyObject: MeiliKey,
  policy: PolicyDefinition,
): boolean =>
  keyObject.uid === policy.uid &&
  matchesPermissions(keyObject, policy) &&
  keyObject.description === policy.description

const matchesDescription = (
  keyObject: MeiliKey,
  policy: PolicyDefinition,
): boolean => keyObject.description === policy.description

const getKeyByUid = async (
  input: RequestOptions & {
    masterKey: string
    uid: string
  },
): Promise<MeiliKey | null> => {
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

      return parseMeiliKey(value, `Failed to read key uid=${input.uid}.`)
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

const createKey = async (input: ReconcileKeyInput): Promise<MeiliKey> =>
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
    parse: (value) =>
      parseMeiliKey(value, `Failed to create key uid=${input.uid}.`),
    retryCount: input.retryCount,
    retryDelaySeconds: input.retryDelaySeconds,
    timeoutSeconds: input.timeoutSeconds,
    url: `${normalizeBaseUrl(input.meiliUrl)}/keys`,
  })

const updateKeyDescription = async (
  input: ReconcileKeyInput,
): Promise<MeiliKey> =>
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
    parse: (value) =>
      parseMeiliKey(value, `Failed to update key uid=${input.uid}.`),
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
  keyObject: MeiliKey
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
    backend_key: backend.keyObject.key,
    backend_uid: backend.keyObject.uid,
    backend_updated: backend.updated,
    frontend_created: frontend.created,
    frontend_env_var: frontendEnvVar,
    frontend_key: frontend.keyObject.key,
    frontend_uid: frontend.keyObject.uid,
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

  if (backend.key !== input.backendKey) {
    throw new Error(
      `Provided backend key does not match key stored under uid=${backendPolicy.uid}.`,
    )
  }

  if (frontend.key !== input.frontendKey) {
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
