import { describe, expect, it } from "vitest"
import type { UrlRecord } from "@/lib/url/types"
import { InMemoryUrlRegistry } from "./memory"

const record = (overrides: Partial<UrlRecord> = {}): UrlRecord => ({
  id: "current-1",
  market: "sk",
  kind: "product",
  slug: "caj",
  entityId: "prod_1",
  equivalenceKey: "product:prod_1",
  indexable: true,
  status: "current",
  aliasOf: null,
  updatedAt: new Date("2026-08-05T00:00:00Z"),
  ...overrides,
})

describe("InMemoryUrlRegistry", () => {
  it("classifies current, alias, tombstone, and missing lookups", async () => {
    const registry = new InMemoryUrlRegistry([
      record(),
      record({
        id: "alias-1",
        slug: "stary-caj",
        status: "alias",
        aliasOf: "current-1",
      }),
      record({
        id: "gone-1",
        entityId: "prod_gone",
        equivalenceKey: "product:prod_gone",
        slug: "prec",
        status: "tombstone",
      }),
    ])

    await expect(
      registry.lookup("sk", "product", "caj")
    ).resolves.toMatchObject({
      type: "current",
      record: { id: "current-1" },
    })
    await expect(
      registry.lookup("sk", "product", "stary-caj")
    ).resolves.toMatchObject({
      type: "alias",
      currentRecord: { id: "current-1" },
    })
    await expect(
      registry.lookup("sk", "product", "prec")
    ).resolves.toMatchObject({
      type: "tombstone",
    })
    await expect(registry.lookup("sk", "product", "neznamy")).resolves.toEqual({
      type: "missing",
    })
  })

  it("matches database unique constraint semantics", async () => {
    const registry = new InMemoryUrlRegistry([record()])
    await expect(
      registry.create({
        market: "sk",
        kind: "product",
        slug: "caj",
        entityId: "prod_2",
        equivalenceKey: "product:prod_2",
        indexable: true,
      })
    ).rejects.toMatchObject({ code: "UNIQUE_VIOLATION" })
    await expect(
      registry.create({
        market: "sk",
        kind: "product",
        slug: "iny-caj",
        entityId: "prod_1",
        equivalenceKey: "product:prod_1",
        indexable: true,
      })
    ).rejects.toMatchObject({ code: "UNIQUE_VIOLATION" })
  })

  it("re-points every historical alias after repeated slug changes", async () => {
    const registry = new InMemoryUrlRegistry([record()])
    const second = await registry.changeSlug(
      "sk",
      "product",
      "prod_1",
      "caj-dva"
    )
    const third = await registry.changeSlug(
      "sk",
      "product",
      "prod_1",
      "caj-tri"
    )

    expect(second.id).not.toBe(third.id)
    for (const slug of ["caj", "caj-dva"]) {
      await expect(
        registry.lookup("sk", "product", slug)
      ).resolves.toMatchObject({
        type: "alias",
        currentRecord: { id: third.id, slug: "caj-tri", status: "current" },
      })
    }
    const records = (await registry.list({ entityId: "prod_1" })).records
    expect(records.filter(({ status }) => status === "current")).toHaveLength(1)
    expect(
      records
        .filter(({ status }) => status === "alias")
        .every(({ aliasOf }) => aliasOf === third.id)
    ).toBe(true)
  })

  it("turns the current URL and its aliases into tombstones", async () => {
    const registry = new InMemoryUrlRegistry([record()])
    await registry.changeSlug("sk", "product", "prod_1", "novy-caj")
    await registry.tombstone("sk", "product", "prod_1")

    await expect(
      registry.findByEntity("sk", "product", "prod_1")
    ).resolves.toBeNull()
    for (const slug of ["caj", "novy-caj"]) {
      await expect(
        registry.lookup("sk", "product", slug)
      ).resolves.toMatchObject({
        type: "tombstone",
        record: { aliasOf: null },
      })
    }
  })

  it("inserts a new current while preserving tombstone history", async () => {
    const registry = new InMemoryUrlRegistry([record()])
    await registry.tombstone("sk", "product", "prod_1")

    const current = await registry.sync({
      market: "sk",
      kind: "product",
      slug: "uplne-novy-caj",
      entityId: "prod_1",
      equivalenceKey: "product:prod_1:restored",
      indexable: false,
    })

    expect(current).toMatchObject({
      slug: "uplne-novy-caj",
      status: "current",
      indexable: false,
    })
    await expect(
      registry.lookup("sk", "product", "caj")
    ).resolves.toMatchObject({ type: "tombstone", record: { aliasOf: null } })
  })

  it("returns only current alternates and enforces bounded lists", async () => {
    const registry = new InMemoryUrlRegistry([
      record(),
      record({ id: "cz", market: "cz", slug: "caj-cz" }),
    ])
    await expect(
      registry.findAlternates("product:prod_1")
    ).resolves.toHaveLength(2)
    await expect(registry.list({ limit: 1000 })).resolves.toMatchObject({
      limit: 100,
    })
  })
})
