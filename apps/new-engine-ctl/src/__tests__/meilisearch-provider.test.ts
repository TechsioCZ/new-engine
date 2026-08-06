import { fileURLToPath } from "node:url"

import { afterEach, describe, expect, test, vi } from "vitest"
import { z } from "zod"

import {
  getRuntimeProviderMeiliKeyPolicy,
  stackInputsSchema,
} from "../contracts/stack-inputs.js"
import type { StackInputs } from "../contracts/stack-inputs.js"
import { loadStackInputs } from "../orchestration/deploy-inputs.js"
import { provisionMeiliKeys } from "../providers/meilisearch.js"

const PROVIDER_ID = "meili_api_credentials"
const MEILI_URL = "http://meili.test"
const MASTER_KEY = "master-key"

const backendPolicy = {
  actions: ["search", "documents.add"],
  description: "Backend search key",
  indexes: ["products", "categories", "brands"],
  uid: "14f4c9c4-1a80-4e2f-8e79-19511d2c5ba5",
}

const frontendPolicy = {
  actions: ["search"],
  description: "Frontend search key",
  indexes: ["products", "categories", "brands"],
  uid: "4b7f7f7e-8798-4b3f-8e73-c0f76f8b35d6",
}

const keyPolicySchema = z.object({
  actions: z.array(z.string()),
  description: z.string(),
  indexes: z.array(z.string()),
  uid: z.string(),
})
const requestBodySchema = z.record(z.string(), z.unknown())
type KeyPolicy = z.infer<typeof keyPolicySchema>

type StoredKey = KeyPolicy & {
  key: string
  expiresAt: null
}

interface RecordedRequest {
  method: string
  path: string
  body: Record<string, unknown> | null
}

const createStoredKey = (
  policy: KeyPolicy,
  overrides: Partial<StoredKey> = {},
): StoredKey => ({
  ...policy,
  expiresAt: null,
  key: `key-${policy.uid}`,
  ...overrides,
})

const jsonResponse = (value: unknown, status = 200): Response =>
  Response.json(value, { status })

describe("meilisearch-provider", () => {
  const createStackInputs = (): StackInputs =>
    stackInputsSchema.parse({
      runtime_providers: {
        providers: [
          {
            outputs: [
              {
                output_id: "backend_key",
                policy: backendPolicy,
                target_envs: [
                  {
                    env_var: "MEILISEARCH_API_KEY",
                    service_id: "medusa-be",
                  },
                ],
              },
              {
                output_id: "frontend_key",
                policy: frontendPolicy,
                target_envs: [
                  {
                    env_var: "NEXT_PUBLIC_MEILISEARCH_API_KEY",
                    service_id: "n1",
                  },
                ],
              },
            ],
            provider_id: PROVIDER_ID,
          },
        ],
      },
    })

  const createMeiliFetch = (initialKeys: StoredKey[]) => {
    const keys = new Map(initialKeys.map((key) => [key.uid, key]))
    const requests: RecordedRequest[] = []

    const handleRequest = async (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ): Promise<Response> => {
      const url = new URL(
        typeof input === "string" || input instanceof URL ? input : input.url,
      )
      const method = init?.method ?? "GET"
      const body =
        typeof init?.body === "string"
          ? requestBodySchema.parse(await new Response(init.body).json())
          : null

      requests.push({
        body,
        method,
        path: url.pathname,
      })

      if (url.pathname === "/health") {
        return jsonResponse({ status: "available" })
      }

      if (url.pathname === "/keys" && method === "POST") {
        if (!body || typeof body.uid !== "string") {
          return jsonResponse({ message: "Missing key UID" }, 400)
        }

        const created = {
          ...keyPolicySchema.parse(body),
          expiresAt: null,
          key: `key-${body.uid}`,
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
          description: String(body.description),
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
    const fetchMock = vi.fn<typeof fetch>(handleRequest)

    return {
      fetchMock,
      keys,
      requests,
    }
  }

  const provision = async (stackInputs = createStackInputs()) =>
    await provisionMeiliKeys({
      masterKey: MASTER_KEY,
      meiliUrl: MEILI_URL,
      providerId: PROVIDER_ID,
      retryCount: 0,
      retryDelaySeconds: 0,
      stackInputs,
      timeoutSeconds: 1,
      waitSeconds: 0,
    })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe("Meilisearch key reconciliation", () => {
    test("reuses keys whose metadata and permissions match", async () => {
      const meili = createMeiliFetch([
        createStoredKey(backendPolicy, {
          actions: [...backendPolicy.actions].toReversed(),
          indexes: [...backendPolicy.indexes].toReversed(),
        }),
        createStoredKey(frontendPolicy),
      ])
      vi.stubGlobal("fetch", meili.fetchMock)

      const result = await provision()

      expect(result.backend_created).toBeFalsy()
      expect(result.backend_updated).toBeFalsy()
      expect(result.frontend_created).toBeFalsy()
      expect(result.frontend_updated).toBeFalsy()
      expect(
        meili.requests.filter(({ method }) => method !== "GET"),
      ).toStrictEqual([])
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

      expect(result.backend_created).toBeFalsy()
      expect(result.backend_updated).toBeTruthy()
      expect(writes).toStrictEqual([
        {
          body: {
            description: backendPolicy.description,
          },
          method: "PATCH",
          path: `/keys/${backendPolicy.uid}`,
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

      expect(result.backend_created).toBeFalsy()
      expect(result.backend_updated).toBeTruthy()
      expect(writes).toStrictEqual([
        {
          body: null,
          method: "DELETE",
          path: `/keys/${backendPolicy.uid}`,
        },
        {
          body: {
            ...backendPolicy,
            expiresAt: null,
          },
          method: "POST",
          path: "/keys",
        },
      ])
      expect(meili.keys.get(backendPolicy.uid)?.key).toBe(originalBackend.key)
      expect(meili.keys.get(backendPolicy.uid)?.indexes).toStrictEqual(
        backendPolicy.indexes,
      )
    })
  })

  test("configured Meilisearch policies authorize brands without producers", async () => {
    const stackInputsPath = fileURLToPath(
      new URL("../../config/stack-inputs.yaml", import.meta.url),
    )
    const stackInputs = await loadStackInputs(stackInputsPath)

    for (const outputId of ["backend_key", "frontend_key"]) {
      const policy = getRuntimeProviderMeiliKeyPolicy(
        stackInputs,
        PROVIDER_ID,
        outputId,
      )
      expect(policy.indexes).toContain("brands")
      expect(policy.indexes).not.toContain("producers")
    }
  })
})
