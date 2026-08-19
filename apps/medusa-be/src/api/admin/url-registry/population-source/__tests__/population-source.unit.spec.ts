import type { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import { PAYLOAD_MODULE } from "../../../../../modules/payload"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../../../../../modules/storefront-url-assignment"
import { readPopulationSourcePage } from "../../population-source"
import { parsePopulationSourceQuery } from "../../population-source-query"

const request = (
  services: Readonly<Record<string, unknown>>
): AuthenticatedMedusaRequest =>
  ({
    scope: {
      resolve: (key: string) => services[key],
    },
  }) as unknown as AuthenticatedMedusaRequest

describe("URLR population source", () => {
  it("rejects unbounded or ambiguous source queries", () => {
    expect(
      parsePopulationSourceQuery({
        limit: "101",
        market: "sk",
        sourceKind: "product",
      })
    ).toBeNull()
    expect(
      parsePopulationSourceQuery({ market: "sk", sourceKind: "campaign" })
    ).toBeNull()
  })

  it("exports only published product metadata with exact Translation proof", async () => {
    const productService = {
      listAndCountProducts: vi.fn(async () => [
        [
          {
            id: "prod_1",
            metadata: {
              url_registry_publication: {
                markets: {
                  sk: {
                    publicationStatus: "published",
                    publicSlug: "zeleny-caj",
                    salesChannelId: "sc_sk",
                  },
                },
                schemaVersion: 1,
              },
            },
            sales_channels: [{ id: "sc_sk" }],
            updated_at: "2026-08-19T08:00:00.000Z",
          },
        ],
        1,
      ]),
    }
    const translationService = {
      listTranslations: vi.fn(async () => [
        {
          deleted_at: null,
          id: "trans_1",
          locale_code: "sk-SK",
          reference: "product",
          reference_id: "prod_1",
          translations: { title: "Zelený čaj" },
        },
      ]),
    }
    const query = parsePopulationSourceQuery({
      limit: "25",
      market: "sk",
      sourceKind: "product",
    })
    if (!query) {
      throw new Error("Fixture query is invalid")
    }

    await expect(
      readPopulationSourcePage(
        request({
          [Modules.PRODUCT]: productService,
          [Modules.TRANSLATION]: translationService,
        }),
        query
      )
    ).resolves.toMatchObject({
      kind: "found",
      page: {
        complete: true,
        items: [
          {
            authorityKind: "medusa-product-publication",
            publicSlug: "zeleny-caj",
            sourceId: "prod_1",
            sourceVersion: "2026-08-19T08:00:00.000Z",
            translation: { translationId: "trans_1" },
          },
        ],
        locale: "sk-SK",
        scanned: 1,
      },
    })
  })

  it("exports exact-locale CMS stable IDs without approving the legacy slug", async () => {
    const listPublishedArticles = vi.fn(async () => ({
      docs: [
        {
          id: 42,
          slug: "legacy-article-slug",
          updatedAt: "2026-08-19T09:00:00.000Z",
        },
      ],
      totalDocs: 1,
    }))
    const query = parsePopulationSourceQuery({
      limit: "50",
      market: "cz",
      sourceKind: "article",
    })
    if (!query) {
      throw new Error("Fixture query is invalid")
    }

    await expect(
      readPopulationSourcePage(
        request({ [PAYLOAD_MODULE]: { listPublishedArticles } }),
        query
      )
    ).resolves.toMatchObject({
      kind: "found",
      page: {
        items: [
          {
            legacySlug: "legacy-article-slug",
            locale: "cs-CZ",
            sourceId: "42",
            stableIdVerified: true,
          },
        ],
      },
    })
    expect(listPublishedArticles).toHaveBeenCalledWith({
      limit: 50,
      locale: "cs-CZ",
      page: 1,
    })
  })

  it("preserves assignment-row authority and fails closed without Translation proof", async () => {
    const query = parsePopulationSourceQuery({
      market: "hu",
      sourceKind: "category",
    })
    if (!query) {
      throw new Error("Fixture query is invalid")
    }
    const assignment = {
      entity_id: "pcat_1",
      entity_kind: "category",
      id: "sfuasn_1",
      market_code: "hu",
      publication_status: "published",
      public_slug: "gyogynovenyek",
      sales_channel_id: "sc_hu",
      schema_version: 1,
      source_version: 3,
    }
    const listTranslations = vi.fn(async () => [
      {
        deleted_at: null,
        id: "trans_category_1",
        locale_code: "hu-HU",
        reference: "product_category",
        reference_id: "pcat_1",
        translations: { name: "Gyógynövények" },
      },
    ])
    const sourceRequest = request({
      [Modules.PRODUCT]: {
        listProductCategories: vi.fn(async () => [{ id: "pcat_1" }]),
      },
      [Modules.TRANSLATION]: { listTranslations },
      [STOREFRONT_URL_ASSIGNMENT_MODULE]: {
        listAndCountStorefrontUrlAssignments: vi.fn(async () => [
          [assignment],
          1,
        ]),
      },
    })

    await expect(
      readPopulationSourcePage(sourceRequest, query)
    ).resolves.toMatchObject({
      kind: "found",
      page: {
        items: [
          {
            assignmentId: "sfuasn_1",
            authorityKind: "medusa-published-assignment",
            sourceId: "pcat_1",
          },
        ],
      },
    })

    listTranslations.mockResolvedValueOnce([])
    await expect(
      readPopulationSourcePage(sourceRequest, query)
    ).resolves.toEqual({ kind: "unavailable" })
  })
})
