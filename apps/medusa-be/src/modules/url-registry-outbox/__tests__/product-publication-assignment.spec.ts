import { describe, expect, it } from "vitest"
import {
  PRODUCT_PUBLICATION_METADATA_KEY,
  parseProductPublicationSnapshot,
} from "../product-publication-assignment"
import { UrlRegistryOutboxInputError } from "../types"

const product = (publication: unknown) => ({
  id: "prod_01",
  metadata:
    publication === undefined
      ? {}
      : { [PRODUCT_PUBLICATION_METADATA_KEY]: publication },
  sales_channels: [{ id: "sc_sk" }, { id: "sc_cz" }],
  updated_at: "2026-08-18T09:00:00.000Z",
})

describe("product URL publication assignment", () => {
  it("reads explicit market/channel slugs without deriving from a handle", () => {
    expect(
      parseProductPublicationSnapshot(
        product({
          schemaVersion: 1,
          markets: {
            sk: {
              publicationStatus: "published",
              publicSlug: "vitamin-c",
              salesChannelId: "sc_sk",
            },
            cz: {
              publicationStatus: "draft",
              publicSlug: "vitamin-c-cz",
              salesChannelId: "sc_cz",
            },
          },
        })
      )
    ).toEqual({
      assignments: {
        sk: {
          publicationStatus: "published",
          publicSlug: "vitamin-c",
          salesChannelId: "sc_sk",
        },
        cz: {
          publicationStatus: "draft",
          publicSlug: "vitamin-c-cz",
          salesChannelId: "sc_cz",
        },
        hu: null,
        ro: null,
      },
      productId: "prod_01",
      sourceVersion: "2026-08-18T09:00:00.000Z",
    })
  })

  it("treats missing metadata as explicitly unpublished in every market", () => {
    expect(parseProductPublicationSnapshot(product()).assignments).toEqual({
      sk: null,
      cz: null,
      hu: null,
      ro: null,
    })
  })

  it("reconciles an explicitly unlinked assignment as unpublished only on request", () => {
    const snapshot = parseProductPublicationSnapshot(
      product({
        schemaVersion: 1,
        markets: {
          sk: {
            publicationStatus: "published",
            publicSlug: "vitamin-c",
            salesChannelId: "sc_other",
          },
        },
      }),
      { unlinkedSalesChannelPolicy: "unpublish" }
    )

    expect(snapshot.assignments.sk).toBeNull()
  })

  it.each([
    [
      "an unlinked channel",
      {
        schemaVersion: 1,
        markets: {
          sk: {
            publicationStatus: "published",
            publicSlug: "vitamin-c",
            salesChannelId: "sc_other",
          },
        },
      },
    ],
    [
      "a handle-shaped but non-canonical slug",
      {
        schemaVersion: 1,
        markets: {
          sk: {
            publicationStatus: "published",
            publicSlug: "Vitamin C",
            salesChannelId: "sc_sk",
          },
        },
      },
    ],
    [
      "one channel assigned to multiple markets",
      {
        schemaVersion: 1,
        markets: {
          sk: {
            publicationStatus: "published",
            publicSlug: "vitamin-c",
            salesChannelId: "sc_sk",
          },
          cz: {
            publicationStatus: "published",
            publicSlug: "vitamin-c-cz",
            salesChannelId: "sc_sk",
          },
        },
      },
    ],
  ])("rejects %s", (_label, publication) => {
    expect(() => parseProductPublicationSnapshot(product(publication))).toThrow(
      UrlRegistryOutboxInputError
    )
  })
})
