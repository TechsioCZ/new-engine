import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  resetUrlRegistryForTests,
  setUrlRegistryForTests,
} from "@/lib/url-registry/factory"
import { InMemoryUrlRegistry } from "@/lib/url-registry/memory"
import { GET as getDetail } from "./[id]/route"
import { POST as createRecord, GET as listRecords } from "./route"
import { POST as changeSlug } from "./slug-change/route"
import { POST as syncRecord } from "./sync/route"
import { POST as tombstone } from "./tombstone/route"
import { POST as tombstoneAll } from "./tombstone-all/route"

const TOKEN = "integration-secret"
const jsonRequest = (path: string, body: unknown, authenticated = true) =>
  new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(authenticated ? { authorization: `Bearer ${TOKEN}` } : {}),
    },
    body: JSON.stringify(body),
  })

const entity = {
  market: "sk",
  kind: "page",
  slug: "o-nas",
  entityId: "payload-page-42",
  equivalenceKey: "page:payload-page-42",
  indexable: true,
} as const

describe("URL registry admin handlers", () => {
  let registry: InMemoryUrlRegistry

  beforeEach(() => {
    process.env.URL_REGISTRY_ADMIN_TOKEN = TOKEN
    registry = new InMemoryUrlRegistry()
    setUrlRegistryForTests(registry)
  })

  afterEach(() => {
    resetUrlRegistryForTests()
    process.env.URL_REGISTRY_ADMIN_TOKEN = undefined
  })

  it("requires bearer authentication on reads and writes", async () => {
    expect(
      (await listRecords(new Request("http://localhost/api/url-registry")))
        .status
    ).toBe(401)
    expect(
      (await createRecord(jsonRequest("/api/url-registry", entity, false)))
        .status
    ).toBe(401)
    expect(
      (await syncRecord(jsonRequest("/api/url-registry/sync", entity, false)))
        .status
    ).toBe(401)
  })

  it("creates, lists, and reads a stable Payload document ID", async () => {
    const created = await createRecord(jsonRequest("/api/url-registry", entity))
    expect(created.status).toBe(201)
    const createdBody = await created.json()
    expect(createdBody.record).toMatchObject({
      entityId: "payload-page-42",
      slug: "o-nas",
      status: "current",
    })

    const listed = await listRecords(
      new Request("http://localhost/api/url-registry?kind=page", {
        headers: { authorization: `Bearer ${TOKEN}` },
      })
    )
    expect((await listed.json()).records).toHaveLength(1)

    const detail = await getDetail(
      new Request("http://localhost/api/url-registry/id", {
        headers: { authorization: `Bearer ${TOKEN}` },
      }),
      { params: Promise.resolve({ id: createdBody.record.id }) }
    )
    expect(detail.status).toBe(200)
  })

  it("syncs a published record idempotently with a 200 response", async () => {
    const initial = await syncRecord(
      jsonRequest("/api/url-registry/sync", entity)
    )
    expect(initial.status).toBe(200)
    const initialBody = await initial.json()

    const updated = await syncRecord(
      jsonRequest("/api/url-registry/sync", {
        ...entity,
        equivalenceKey: "page:payload-page-42:published",
        indexable: false,
      })
    )
    expect(updated.status).toBe(200)
    expect((await updated.json()).record).toMatchObject({
      id: initialBody.record.id,
      equivalenceKey: "page:payload-page-42:published",
      indexable: false,
    })
  })

  it("changes slugs atomically without alias chains", async () => {
    await createRecord(jsonRequest("/api/url-registry", entity))
    for (const newSlug of ["o-nas-nove", "o-nas-final"]) {
      const response = await changeSlug(
        jsonRequest("/api/url-registry/slug-change", {
          market: entity.market,
          kind: entity.kind,
          entityId: entity.entityId,
          newSlug,
        })
      )
      expect(response.status).toBe(200)
    }

    const current = await registry.findByEntity("sk", "page", entity.entityId)
    expect(current).toMatchObject({ slug: "o-nas-final", status: "current" })
    const records = (await registry.list({ entityId: entity.entityId })).records
    expect(records).toHaveLength(3)
    expect(
      records
        .filter(({ status }) => status === "alias")
        .every(({ aliasOf }) => aliasOf === current?.id)
    ).toBe(true)
  })

  it("tombstones every published slug for an entity", async () => {
    await createRecord(jsonRequest("/api/url-registry", entity))
    await changeSlug(
      jsonRequest("/api/url-registry/slug-change", {
        market: "sk",
        kind: "page",
        entityId: entity.entityId,
        newSlug: "nova-stranka",
      })
    )
    const response = await tombstone(
      jsonRequest("/api/url-registry/tombstone", {
        market: "sk",
        kind: "page",
        entityId: entity.entityId,
      })
    )
    expect(response.status).toBe(200)
    for (const slug of ["o-nas", "nova-stranka"]) {
      await expect(registry.lookup("sk", "page", slug)).resolves.toMatchObject({
        type: "tombstone",
      })
    }
  })

  it("tombstones all markets through one authenticated operation", async () => {
    for (const market of ["sk", "cz", "hu", "ro"] as const) {
      await syncRecord(
        jsonRequest("/api/url-registry/sync", {
          ...entity,
          market,
          slug: `page-${market}`,
        })
      )
    }
    const response = await tombstoneAll(
      jsonRequest("/api/url-registry/tombstone-all", {
        kind: "page",
        entityId: entity.entityId,
      })
    )
    expect(response.status).toBe(200)
    expect((await response.json()).records).toHaveLength(4)
    for (const market of ["sk", "cz", "hu", "ro"] as const) {
      await expect(
        registry.lookup(market, "page", `page-${market}`)
      ).resolves.toMatchObject({ type: "tombstone" })
    }
  })

  it("returns conflicts and validates manual slugs", async () => {
    await createRecord(jsonRequest("/api/url-registry", entity))
    expect(
      (await createRecord(jsonRequest("/api/url-registry", entity))).status
    ).toBe(409)
    expect(
      (
        await changeSlug(
          jsonRequest("/api/url-registry/slug-change", {
            market: "sk",
            kind: "page",
            entityId: entity.entityId,
            newSlug: "_next",
          })
        )
      ).status
    ).toBe(400)
  })
})
