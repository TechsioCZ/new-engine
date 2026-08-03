import { afterEach, expect, test, vi } from "vitest"

import { ZaneMeiliApiCredentialsProvisioner } from "./zane-meili-api-credentials"

const policy = {
  uid: "14f4c9c4-1a80-4e2f-8e79-19511d2c5ba5",
  description: "Backend search key",
  actions: ["search", "documents.add"],
  indexes: ["products", "categories", "brands"],
}

type StoredKey = typeof policy & {
  key: string
  expiresAt: null
}

type RecordedRequest = {
  method: string
  path: string
  body: Record<string, unknown> | null
}

function createProvisioner() {
  return new ZaneMeiliApiCredentialsProvisioner({
    authenticate: () => Promise.resolve({ cookies: new Map() }),
    getEnvironment: () =>
      Promise.resolve({
        is_preview: false,
        name: "production",
      }),
    getServiceDetails: () =>
      Promise.resolve({
        slug: "meilisearch",
        network_alias: "meilisearch",
        env_variables: [
          {
            key: "MEILI_MASTER_KEY",
            value: "master-key",
          },
        ],
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
      method,
      path: url.pathname,
      body,
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
        description: String(body["description"]),
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
        key: `key-${policy.uid}`,
        expiresAt: null,
      }
      return Response.json(storedKey)
    }

    return Response.json({ message: "Unexpected request" }, { status: 400 })
  }

  return {
    fetchMock: vi.fn(
      (
        input: Parameters<typeof fetch>[0],
        init?: Parameters<typeof fetch>[1]
      ) => Promise.resolve(handleRequest(input, init))
    ),
    getStoredKey: () => storedKey,
    requests,
  }
}

function provision(provisioner: ZaneMeiliApiCredentialsProvisioner) {
  return provisioner.provisionMeiliKeys({
    projectSlug: "new-engine",
    environmentName: "production",
    serviceSlug: "meilisearch",
    readinessPath: "/health",
    backendOutput: {
      envVar: "MEILISEARCH_API_KEY",
      policy,
    },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

test("updates only description when Meilisearch permissions match", async () => {
  const meili = createMeiliFetch({
    ...policy,
    description: "Outdated description",
    key: `key-${policy.uid}`,
    expiresAt: null,
  })
  vi.stubGlobal("fetch", meili.fetchMock)

  const result = await provision(createProvisioner())
  const writes = meili.requests.filter(({ method }) => method !== "GET")

  expect(result.backend_updated).toBe(true)
  expect(writes).toEqual([
    {
      method: "PATCH",
      path: `/keys/${policy.uid}`,
      body: {
        description: policy.description,
      },
    },
  ])
})

test("replaces the same UID when Meilisearch permissions differ", async () => {
  const originalKey = `key-${policy.uid}`
  const meili = createMeiliFetch({
    ...policy,
    indexes: ["products", "categories", "producers"],
    key: originalKey,
    expiresAt: null,
  })
  vi.stubGlobal("fetch", meili.fetchMock)

  const result = await provision(createProvisioner())
  const writes = meili.requests.filter(({ method }) => method !== "GET")

  expect(result.backend_updated).toBe(true)
  expect(writes).toEqual([
    {
      method: "DELETE",
      path: `/keys/${policy.uid}`,
      body: null,
    },
    {
      method: "POST",
      path: "/keys",
      body: {
        ...policy,
        expiresAt: null,
      },
    },
  ])
  expect(meili.getStoredKey()?.key).toBe(originalKey)
  expect(meili.getStoredKey()?.indexes).toEqual(policy.indexes)
})
