import { describe, expect, it, vi } from "vitest"
import {
  type CatalogLifecycleDeliveryV1,
  CatalogLifecycleDeliveryValidationError,
  parseCatalogLifecycleDeliveryV1,
} from "./catalog-lifecycle-parser"
import { readCatalogLifecycleSource } from "./catalog-lifecycle-source"

const delivery = (
  overrides: Partial<CatalogLifecycleDeliveryV1> = {}
): CatalogLifecycleDeliveryV1 => ({
  changeType: "reconcile",
  entityId: "pcat_1",
  entityKind: "category",
  envelopeFingerprint: `sha256:${"a".repeat(64)}`,
  eventId: `sha256:${"b".repeat(64)}`,
  marketCode: "ro",
  occurredAt: "2026-08-20T10:00:00.000Z",
  outboxEventId: "urlroe_1",
  payload: {
    assignment: {
      publicationStatus: "published",
      publicSlug: "suplimente-nutritive",
      salesChannelId: "sc_ro",
    },
    changeType: "reconcile",
    entityId: "pcat_1",
    entityKind: "category",
    reason: "assignment-upsert",
    schemaVersion: 1,
    sourceVersion: "7",
  },
  schemaVersion: 1,
  source: "medusa",
  streamSequence: 1,
  ...overrides,
})

const sourcePayload = (overrides: Record<string, unknown> = {}) => ({
  assignments: [
    {
      entityId: "pcat_1",
      id: "pcat_1",
      marketCode: "ro",
      publicationStatus: "published",
      publicSlug: "suplimente-nutritive",
      salesChannelId: "sc_ro",
      schemaVersion: 1,
      sourceVersion: "7",
      translation: {
        localeCode: "ro-RO",
        reference: "product_category",
        translationId: "trans_ro_1",
      },
      ...overrides,
    },
  ],
  entityKind: "category",
  marketCode: "ro",
  schemaVersion: 1,
})

const dependencies = (payload: unknown) => ({
  resolveMarket: vi.fn(() => ({
    locale: "ro-RO" as const,
    market: "ro" as const,
    publishableApiKey: "pk_ro",
    salesChannelId: "sc_ro",
  })),
  retrieveSource: vi.fn(async () => payload),
})

describe("catalog lifecycle delivery", () => {
  it("accepts the exact market-scoped category delivery", () => {
    expect(parseCatalogLifecycleDeliveryV1(delivery())).toEqual(delivery())
  })

  it.each([
    ["kind", { entityKind: "brand" }],
    ["entity", { entityId: "pcat_other" }],
    ["change", { changeType: "delete" }],
  ])("rejects top-level/payload %s drift", (_label, patch) => {
    expect(() =>
      parseCatalogLifecycleDeliveryV1({ ...delivery(), ...patch })
    ).toThrow(CatalogLifecycleDeliveryValidationError)
  })

  it("verifies the exact RO assignment, locale, channel, slug and version", async () => {
    await expect(
      readCatalogLifecycleSource(delivery(), dependencies(sourcePayload()))
    ).resolves.toMatchObject({ kind: "found" })
  })

  it.each([
    ["source version", { sourceVersion: "6" }],
    [
      "locale",
      {
        translation: {
          localeCode: "sk-SK",
          reference: "product_category",
          translationId: "trans_1",
        },
      },
    ],
    ["sales channel", { salesChannelId: "sc_sk" }],
    ["slug", { publicSlug: "doplnky-vyzivy" }],
  ])("fails closed on wrong %s", async (_label, patch) => {
    await expect(
      readCatalogLifecycleSource(delivery(), dependencies(sourcePayload(patch)))
    ).resolves.toMatchObject({ kind: "invalid-response" })
  })

  it("maps an empty exact source result to missing", async () => {
    await expect(
      readCatalogLifecycleSource(
        delivery(),
        dependencies({ ...sourcePayload(), assignments: [] })
      )
    ).resolves.toEqual({ kind: "missing" })
  })

  it("maps a superseded same-slug source version to missing", async () => {
    await expect(
      readCatalogLifecycleSource(
        delivery(),
        dependencies(sourcePayload({ sourceVersion: "8" }))
      )
    ).resolves.toEqual({ kind: "missing" })
  })

  it("maps source dependency failures to unavailable", async () => {
    const deps = dependencies(sourcePayload())
    deps.retrieveSource.mockRejectedValueOnce(
      Object.assign(new Error("source unavailable"), { status: 503 })
    )
    await expect(readCatalogLifecycleSource(delivery(), deps)).resolves.toEqual(
      {
        kind: "unavailable",
      }
    )
  })
})
