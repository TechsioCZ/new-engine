import { describe, expect, it } from "vitest"
import {
  AdminUpsertCollectionUrlAssignmentSchema,
  assertSingleAssignmentMarket,
  type CollectionUrlAssignmentResponse,
  InvalidCollectionUrlAssignmentError,
  parseCollectionAssignmentPage,
  resolvePublishableKeySalesChannelId,
  serializeCollectionUrlAssignment,
} from "../contracts"
import type { StorefrontUrlAssignmentRecord } from "../models/storefront-url-assignment"

const record = (
  overrides: Partial<StorefrontUrlAssignmentRecord> = {}
): StorefrontUrlAssignmentRecord =>
  ({
    id: "sfuasn_1",
    schema_version: 1,
    entity_kind: "collection",
    entity_id: "pcol_1",
    market_code: "sk",
    sales_channel_id: "sc_sk",
    public_slug: "zimna-kolekcia",
    publication_status: "published",
    source_version: 3,
    ...overrides,
  }) as StorefrontUrlAssignmentRecord

describe("collection URL assignment contract", () => {
  it("accepts the complete admin input and rejects producer-owned fields", () => {
    expect(
      AdminUpsertCollectionUrlAssignmentSchema.parse({
        marketCode: "sk",
        salesChannelId: "sc_sk",
        publicSlug: "zimna-kolekcia",
        publicationStatus: "published",
      })
    ).toEqual({
      marketCode: "sk",
      salesChannelId: "sc_sk",
      publicSlug: "zimna-kolekcia",
      publicationStatus: "published",
    })

    expect(
      AdminUpsertCollectionUrlAssignmentSchema.safeParse({
        marketCode: "sk",
        salesChannelId: "sc_sk",
        publicSlug: "zimna-kolekcia",
        publicationStatus: "published",
        sourceVersion: "999",
      }).success
    ).toBe(false)
  })

  it.each([
    "Zimna-kolekcia",
    "zimná-kolekcia",
    "zimna--kolekcia",
    "",
  ])("rejects a non-canonical slug: %s", (publicSlug) => {
    expect(
      AdminUpsertCollectionUrlAssignmentSchema.safeParse({
        marketCode: "sk",
        salesChannelId: "sc_sk",
        publicSlug,
        publicationStatus: "draft",
      }).success
    ).toBe(false)
  })

  it("serializes the stable wire vocabulary and opaque source version", () => {
    expect(serializeCollectionUrlAssignment(record())).toEqual({
      schemaVersion: 1,
      id: "pcol_1",
      entityId: "pcol_1",
      marketCode: "sk",
      salesChannelId: "sc_sk",
      publicSlug: "zimna-kolekcia",
      publicationStatus: "published",
      sourceVersion: "3",
    })
  })

  it.each([
    { schema_version: 2 },
    { entity_kind: "campaign" },
    { market_code: "xx" },
    { publication_status: "archived" },
    { source_version: 0 },
    { public_slug: "Invalid Slug" },
  ])("rejects invalid persisted state: %j", (overrides) => {
    expect(() => serializeCollectionUrlAssignment(record(overrides))).toThrow(
      InvalidCollectionUrlAssignmentError
    )
  })

  it("requires one unique publishable-key Sales Channel", () => {
    expect(resolvePublishableKeySalesChannelId(["sc_sk", "sc_sk"])).toBe(
      "sc_sk"
    )
    expect(() => resolvePublishableKeySalesChannelId(undefined)).toThrow(
      InvalidCollectionUrlAssignmentError
    )
    expect(() => resolvePublishableKeySalesChannelId([])).toThrow(
      InvalidCollectionUrlAssignmentError
    )
    expect(() =>
      resolvePublishableKeySalesChannelId(["sc_sk", "sc_cz"])
    ).toThrow(InvalidCollectionUrlAssignmentError)
  })

  it("rejects a channel that resolves to assignments from multiple markets", () => {
    const sk = serializeCollectionUrlAssignment(record())
    const cz: CollectionUrlAssignmentResponse = {
      ...sk,
      id: "pcol_2",
      entityId: "pcol_2",
      marketCode: "cz",
    }
    expect(() => assertSingleAssignmentMarket([sk, cz])).toThrow(
      InvalidCollectionUrlAssignmentError
    )
  })

  it("parses canonical bounded pagination", () => {
    expect(parseCollectionAssignmentPage({})).toEqual({ limit: 50, offset: 0 })
    expect(
      parseCollectionAssignmentPage({ limit: "100", offset: "25" })
    ).toEqual({ limit: 100, offset: 25 })
    expect(() => parseCollectionAssignmentPage({ limit: "101" })).toThrow(
      InvalidCollectionUrlAssignmentError
    )
    expect(() => parseCollectionAssignmentPage({ offset: "01" })).toThrow(
      InvalidCollectionUrlAssignmentError
    )
    expect(() =>
      parseCollectionAssignmentPage({ limit: ["10", "20"] })
    ).toThrow(InvalidCollectionUrlAssignmentError)
  })
})
