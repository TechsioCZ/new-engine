import { fileURLToPath } from "node:url"

import { afterEach, describe, expect, test, vi } from "vitest"

import {
  getRuntimeProviderMeiliKeyPolicy,
  type StackInputs,
  stackInputsSchema,
} from "../contracts/stack-inputs.js"
import { loadStackInputs } from "../orchestration/deploy-inputs.js"
import { provisionMeiliKeys } from "../providers/meilisearch.js"

const PROVIDER_ID = "meili_api_credentials"
const MEILI_URL = "http://meili.test"
const MASTER_KEY = "master-key"

const backendPolicy = {
  uid: "14f4c9c4-1a80-4e2f-8e79-19511d2c5ba5",
  description: "Backend search key",
  actions: ["search", "documents.add"],
  indexes: ["products", "categories", "brands"],
}

const frontendPolicy = {
  uid: "4b7f7f7e-8798-4b3f-8e73-c0f76f8b35d6",
  description: "Frontend search key",
  actions: ["search"],
  indexes: ["products", "categories", "brands"],
}

type KeyPolicy = typeof backendPolicy

type StoredKey = KeyPolicy & {
  key: string
  expiresAt: null
}

type RecordedRequest = {
  method: string
  path: string
  body: Record<string, unknown> | null
}

function createStackInputs(): StackInputs {
  return stackInputsSchema.parse({
    runtime_providers: {
      providers: [
        {
          provider_id: PROVIDER_ID,
          outputs: [
            {
              output_id: "backend_key",
              target_envs: [
                {
                  service_id: "medusa-be",
                  env_var: "MEILISEARCH_API_KEY",
                },
              ],
              policy: backendPolicy,
            },
            {
              output_id: "frontend_key",
              target_envs: [
                {
                  service_id: "n1",
                  env_var: "NEXT_PUBLIC_MEILISEARCH_API_KEY",
                },
              ],
              policy: frontendPolicy,
            },
          ],
        },
      ],
    },
  })
}

function createStoredKey(
  policy: KeyPolicy,
  overrides: Partial<StoredKey> = {}
): StoredKey {
  return {
    ...policy,
    key: `key-${policy.uid}`,
    expiresAt: null,
    ...overrides,
  }
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  })
}

function createMeiliFetch(initialKeys: StoredKey[]) {
  const keys = new Map(initialKeys.map((key) => [key.uid, key]))
  const requests: RecordedRequest[] = []

  const handleRequest = (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1]
  ): Response => {
    const url = new URL(
      typeof input === "string" || input instanceof URL ? input : input.url
    )
    const method = init?.method ?? "GET"
    const body =
      typeof init?.body === "string"
        ? (JSON.parse(init.body) as Record<string, unknown>)
        : null

    requests.push({
      method,
      path: url.pathname,
      body,
    })

    if (url.pathname === "/health") {
      return jsonResponse({ status: "available" })
    }

    if (url.pathname === "/keys" && method === "POST") {
      if (!body || typeof body["uid"] !== "string") {
        return jsonResponse({ message: "Missing key UID" }, 400)
      }

      const created = {
        ...(body as KeyPolicy),
        key: `key-${body["uid"]}`,
        expiresAt: null,
      }
      keys.set(created.uid, created)
      return jsonResponse(created)
    }

    const uid = decodeURIComponent(url.pathname.replace("/keys/", ""))
    const existing = keys.get(uid)

    if (method === "GET") {
      return existing
        ? jsonResponse(existing)
        : jsonResponse({ message: "Key not found" }, 404)
    }

    if (method === "PATCH") {
      if (!(existing && body)) {
        return jsonResponse({ message: "Key not found" }, 404)
      }

      const updated = {
        ...existing,
        description: String(body["description"]),
      }
      keys.set(uid, updated)
      return jsonResponse(updated)
    }

    if (method === "DELETE") {
      keys.delete(uid)
      return new Response(null, { status: 204 })
    }

    return jsonResponse({ message: "Unexpected request" }, 400)
  }
  const fetchMock = vi.fn<typeof fetch>((input, init) =>
    Promise.resolve(handleRequest(input, init))
  )

  return {
    fetchMock,
    keys,
    requests,
  }
}

async function provision(stackInputs = createStackInputs()) {
  return await provisionMeiliKeys({
    meiliUrl: MEILI_URL,
    masterKey: MASTER_KEY,
    waitSeconds: 0,
    timeoutSeconds: 1,
    retryCount: 0,
    retryDelaySeconds: 0,
    stackInputs,
    providerId: PROVIDER_ID,
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("Meilisearch key reconciliation", () => {
  test("reuses keys whose metadata and permissions match", async () => {
    const meili = createMeiliFetch([
      createStoredKey(backendPolicy, {
        actions: [...backendPolicy.actions].reverse(),
        indexes: [...backendPolicy.indexes].reverse(),
      }),
      createStoredKey(frontendPolicy),
    ])
    vi.stubGlobal("fetch", meili.fetchMock)

    const result = await provision()

    expect(result.backend_created).toBe(false)
    expect(result.backend_updated).toBe(false)
    expect(result.frontend_created).toBe(false)
    expect(result.frontend_updated).toBe(false)
    expect(meili.requests.filter(({ method }) => method !== "GET")).toEqual([])
  })

  test("patches only the description when permissions already match", async () => {
    const meili = createMeiliFetch([
      createStoredKey(backendPolicy, {
        description: "Outdated backend description",
      }),
      createStoredKey(frontendPolicy),
    ])
    vi.stubGlobal("fetch", meili.fetchMock)

    const result = await provision()
    const writes = meili.requests.filter(({ method }) => method !== "GET")

    expect(result.backend_created).toBe(false)
    expect(result.backend_updated).toBe(true)
    expect(writes).toEqual([
      {
        method: "PATCH",
        path: `/keys/${backendPolicy.uid}`,
        body: {
          description: backendPolicy.description,
        },
      },
    ])
  })

  test("replaces a key under the same UID when its permissions differ", async () => {
    const originalBackend = createStoredKey(backendPolicy, {
      indexes: ["products", "categories", "producers"],
    })
    const meili = createMeiliFetch([
      originalBackend,
      createStoredKey(frontendPolicy),
    ])
    vi.stubGlobal("fetch", meili.fetchMock)

    const result = await provision()
    const writes = meili.requests.filter(({ method }) => method !== "GET")

    expect(result.backend_created).toBe(false)
    expect(result.backend_updated).toBe(true)
    expect(writes).toEqual([
      {
        method: "DELETE",
        path: `/keys/${backendPolicy.uid}`,
        body: null,
      },
      {
        method: "POST",
        path: "/keys",
        body: {
          ...backendPolicy,
          expiresAt: null,
        },
      },
    ])
    expect(meili.keys.get(backendPolicy.uid)?.key).toBe(originalBackend.key)
    expect(meili.keys.get(backendPolicy.uid)?.indexes).toEqual(
      backendPolicy.indexes
    )
  })
})

test("configured Meilisearch policies authorize brands without producers", async () => {
  const stackInputsPath = fileURLToPath(
    new URL("../../config/stack-inputs.yaml", import.meta.url)
  )
  const stackInputs = await loadStackInputs(stackInputsPath)

  for (const outputId of ["backend_key", "frontend_key"]) {
    const policy = getRuntimeProviderMeiliKeyPolicy(
      stackInputs,
      PROVIDER_ID,
      outputId
    )
    expect(policy.indexes).toContain("brands")
    expect(policy.indexes).not.toContain("producers")
  }
})
