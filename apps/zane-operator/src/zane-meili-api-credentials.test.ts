import { afterEach, expect, test, vi } from "vitest"

import { ZaneMeiliApiCredentialsProvisioner } from "./zane-meili-api-credentials"

const policy = {
  actions: ["search", "documents.add"],
  description: "Backend search key",
  indexes: ["products", "categories", "brands"],
  uid: "14f4c9c4-1a80-4e2f-8e79-19511d2c5ba5",
}

type StoredKey = typeof policy & {
  key: string
  expiresAt: null
}

interface RecordedRequest {
  method: string
  path: string
  body: Record<string, unknown> | null
}

function createProvisioner() {
  return new ZaneMeiliApiCredentialsProvisioner({
    authenticate: async () => Promise.resolve({ cookies: new Map() }),
    getEnvironment: async () =>
      Promise.resolve({
        is_preview: false,
        name: "production",
      }),
    getServiceDetails: async () =>
      Promise.resolve({
        env_variables: [
          {
            key: "MEILI_MASTER_KEY",
            value: "master-key",
          },
        ],
        network_alias: "meilisearch",
        slug: "meilisearch",
        urls: [],
      }),
  })
}

function createMeiliFetch(initialKey: StoredKey) {
  let storedKey: StoredKey | null = initialKey
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
      body,
      method,
      path: url.pathname,
    })

    if (url.pathname === "/health") {
      return Response.json({ status: "available" })
    }

    if (url.pathname === `/keys/${policy.uid}` && method === "GET") {
      return storedKey
        ? Response.json(storedKey)
        : Response.json({ message: "Key not found" }, { status: 404 })
    }

    if (url.pathname === `/keys/${policy.uid}` && method === "PATCH") {
      if (!(storedKey && body)) {
        return Response.json({ message: "Key not found" }, { status: 404 })
      }

      storedKey = {
        ...storedKey,
        description: String(body.description),
      }
      return Response.json(storedKey)
    }

    if (url.pathname === `/keys/${policy.uid}` && method === "DELETE") {
      storedKey = null
      return new Response(null, { status: 204 })
    }

    if (url.pathname === "/keys" && method === "POST" && body) {
      storedKey = {
        ...(body as typeof policy),
        expiresAt: null,
        key: `key-${policy.uid}`,
      }
      return Response.json(storedKey)
    }

    return Response.json({ message: "Unexpected request" }, { status: 400 })
  }

  return {
    fetchMock: vi.fn(
      async (
        input: Parameters<typeof fetch>[0],
        init?: Parameters<typeof fetch>[1]
      ) => Promise.resolve(handleRequest(input, init))
    ),
    getStoredKey: () => storedKey,
    requests,
  }
}

async function provision(provisioner: ZaneMeiliApiCredentialsProvisioner) {
  return provisioner.provisionMeiliKeys({
    backendOutput: {
      envVar: "MEILISEARCH_API_KEY",
      policy,
    },
    environmentName: "production",
    projectSlug: "new-engine",
    readinessPath: "/health",
    serviceSlug: "meilisearch",
  })
}

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
