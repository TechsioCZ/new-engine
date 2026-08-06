import { sleep } from "@techsio/std/async"
import { afterEach, describe, expect, test, vi } from "vitest"
import { z } from "zod"

import { ZaneMeiliApiCredentialsProvisioner } from "./zane-meili-api-credentials"

const policy = {
  actions: ["search", "documents.add"],
  description: "Backend search key",
  indexes: ["products", "categories", "brands"],
  uid: "14f4c9c4-1a80-4e2f-8e79-19511d2c5ba5",
}

const requestBodySchema = z.record(z.string(), z.unknown())
const meiliPolicySchema = z.object({
  actions: z.array(z.string()),
  description: z.string(),
  indexes: z.array(z.string()),
  uid: z.string(),
})

type StoredKey = typeof policy & {
  key: string
  expiresAt: null
}

type FetchCall = (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) => Promise<Response>

interface RecordedRequest {
  method: string
  path: string
  body: Record<string, unknown> | null
}

const createProvisioner = () =>
  new ZaneMeiliApiCredentialsProvisioner({
    authenticate: async () => {
      await sleep(0)
      return { cookies: new Map() }
    },
    getEnvironment: async () => {
      await sleep(0)
      return {
        is_preview: false,
        name: "production",
      }
    },
    getServiceDetails: async () => {
      await sleep(0)
      return {
        env_variables: [
          {
            key: "MEILI_MASTER_KEY",
            value: "master-key",
          },
        ],
        network_alias: "meilisearch",
        slug: "meilisearch",
        urls: [],
      }
    },
  })

const parseRequestBody = (body: unknown): Record<string, unknown> | null => {
  if (typeof body !== "string") {
    return null
  }

  const parsed: unknown = JSON.parse(body)
  return requestBodySchema.parse(parsed)
}

const createMeiliFetch = (initialKey: StoredKey) => {
  let storedKey: StoredKey | null = initialKey
  const requests: RecordedRequest[] = []

  const handleRequest = (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ): Response => {
    const url = new URL(
      typeof input === "string" || input instanceof URL ? input : input.url,
    )
    const method = init?.method ?? "GET"
    const body = parseRequestBody(init?.body)

    requests.push({
      body,
      method,
      path: url.pathname,
    })

    if (url.pathname === "/health") {
      return Response.json({ status: "available" })
    }

    if (url.pathname === `/keys/${policy.uid}` && method === "GET") {
      return storedKey === null
        ? Response.json({ message: "Key not found" }, { status: 404 })
        : Response.json(storedKey)
    }

    if (url.pathname === `/keys/${policy.uid}` && method === "PATCH") {
      if (storedKey === null || body === null) {
        return Response.json({ message: "Key not found" }, { status: 404 })
      }

      const { description } = body
      storedKey = {
        ...storedKey,
        description: z.string().parse(description),
      }
      return Response.json(storedKey)
    }

    if (url.pathname === `/keys/${policy.uid}` && method === "DELETE") {
      storedKey = null
      return new Response(null, { status: 204 })
    }

    if (url.pathname === "/keys" && method === "POST" && body !== null) {
      storedKey = {
        ...meiliPolicySchema.parse(body),
        expiresAt: null,
        key: `key-${policy.uid}`,
      }
      return Response.json(storedKey)
    }

    return Response.json({ message: "Unexpected request" }, { status: 400 })
  }

  return {
    fetchMock: vi.fn<FetchCall>(async (input, init) => {
      await sleep(0)
      return handleRequest(input, init)
    }),
    getStoredKey: () => storedKey,
    requests,
  }
}

const provision = async (provisioner: ZaneMeiliApiCredentialsProvisioner) =>
  await provisioner.provisionMeiliKeys({
    backendOutput: {
      envVar: "MEILISEARCH_API_KEY",
      policy,
    },
    environmentName: "production",
    projectSlug: "new-engine",
    readinessPath: "/health",
    serviceSlug: "meilisearch",
  })

describe("Meili API credentials provisioner", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test("updates only description when Meilisearch permissions match", async () => {
    const meili = createMeiliFetch({
      ...policy,
      description: "Outdated description",
      expiresAt: null,
      key: `key-${policy.uid}`,
    })
    vi.stubGlobal("fetch", meili.fetchMock)

    const result = await provision(createProvisioner())
    const writes = meili.requests.filter(({ method }) => method !== "GET")

    expect(result.backend_updated).toBeTruthy()
    expect(writes).toStrictEqual([
      {
        body: {
          description: policy.description,
        },
        method: "PATCH",
        path: `/keys/${policy.uid}`,
      },
    ])
  })

  test("replaces the same UID when Meilisearch permissions differ", async () => {
    const originalKey = `key-${policy.uid}`
    const meili = createMeiliFetch({
      ...policy,
      expiresAt: null,
      indexes: ["products", "categories", "producers"],
      key: originalKey,
    })
    vi.stubGlobal("fetch", meili.fetchMock)

    const result = await provision(createProvisioner())
    const writes = meili.requests.filter(({ method }) => method !== "GET")

    expect(result.backend_updated).toBeTruthy()
    expect(writes).toStrictEqual([
      {
        body: null,
        method: "DELETE",
        path: `/keys/${policy.uid}`,
      },
      {
        body: {
          ...policy,
          expiresAt: null,
        },
        method: "POST",
        path: "/keys",
      },
    ])
    expect(meili.getStoredKey()?.key).toBe(originalKey)
    expect(meili.getStoredKey()?.indexes).toStrictEqual(policy.indexes)
  })
})
