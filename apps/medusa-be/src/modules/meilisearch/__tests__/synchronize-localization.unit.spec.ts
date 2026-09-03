import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import { MARKET_VARIANT_AUTHORITY_MODULE } from "../../market-variant-authority"
import { PAYLOAD_MODULE } from "../../payload"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../../storefront-url-assignment"
import {
  type MeilisearchAdminClient,
  MeilisearchSwapIndexError,
} from "../admin-client"
import { buildProductSearchDocuments } from "../documents"
import type { SearchProfile } from "../profiles"
import {
  acceptRetainedSearchGeneration,
  applyLocalizedProductRelations,
  applyLocalizedTranslations,
  projectProductForVariantAuthority,
  rollbackRetainedSearchGeneration,
  selectRequestedSearchProfiles,
  syncProfile,
} from "../synchronize"

const records = [
  { description: "Slovenský opis", id: "prod_1", title: "Slovenský názov" },
  { description: "Druhý slovenský opis", id: "prod_2", title: "Druhý názov" },
]

const productPublication = (
  publicationStatus: "draft" | "published",
  publicSlug: string,
  salesChannelId = "sc_ro"
) => ({
  url_registry_publication: {
    markets: {
      ro: {
        publicationStatus,
        publicSlug,
        salesChannelId,
      },
    },
    schemaVersion: 1,
  },
})

const exactRomanianTranslation = (id: string) => {
  if (id.startsWith("pcat_")) {
    return {
      reference: "product_category",
      translations: { name: `Categorie românească ${id}` },
    }
  }
  if (id.startsWith("brand_")) {
    return {
      reference: "brand",
      translations: { title: `Marcă românească ${id}` },
    }
  }
  return {
    reference: "product",
    translations: { title: "Produs fără relații" },
  }
}

const queryWith = (data: unknown[]) => {
  const graph = vi.fn().mockResolvedValue({ data })

  return { graph, query: { graph } as unknown as Query }
}

const roProfile = (key: string): SearchProfile => ({
  availability: "all",
  domain: `${key}.example.test`,
  indexes: {
    brand: `${key}_brand`,
    category: `${key}_category`,
    content: `${key}_content`,
    product: `${key}_product`,
  },
  key,
  limits: {
    autocomplete: { brand: 5, category: 5, content: 5, product: 5 },
    fullSearch: 20,
    page: 20,
    popular: 10,
  },
  locale: "ro-RO",
  minimumRankingScore: 0.55,
  salesChannelIds: ["sc_ro"],
  separateVariantResults: false,
  shop: "herbatika",
  strict: false,
})

const syncContainer = (
  query: Query,
  listStorefrontUrlAssignments = vi.fn().mockResolvedValue([]),
  listMarketVariantAuthorities = vi.fn().mockResolvedValue([]),
  regionRecords: Record<string, unknown>[] = [
    {
      countries: [{ iso_2: "ro" }],
      currency_code: "ron",
      id: "reg_ro",
      metadata: {
        market_code: "ro",
        sales_channel_id: "sc_ro",
      },
    },
  ]
) => {
  const commerceScopedQuery = {
    graph: (request: { entity: string }) => {
      if (request.entity === "region") {
        return Promise.resolve({ data: regionRecords })
      }
      if (request.entity === "price") {
        return Promise.resolve({ data: [] })
      }
      return query.graph(request as never)
    },
  } as unknown as Query

  return {
    resolve: vi.fn((key: unknown) => {
      if (key === ContainerRegistrationKeys.QUERY) {
        return commerceScopedQuery
      }
      if (key === ContainerRegistrationKeys.PG_CONNECTION) {
        return { raw: vi.fn().mockResolvedValue([[]]) }
      }
      if (key === PAYLOAD_MODULE) {
        return {
          listPublishedArticles: vi.fn().mockResolvedValue({
            docs: [],
            hasNextPage: false,
          }),
          listPublishedPages: vi.fn().mockResolvedValue({
            docs: [],
            hasNextPage: false,
          }),
        }
      }
      if (key === STOREFRONT_URL_ASSIGNMENT_MODULE) {
        return { listStorefrontUrlAssignments }
      }
      if (key === MARKET_VARIANT_AUTHORITY_MODULE) {
        return { listMarketVariantAuthorities }
      }
      throw new Error(`Unexpected container key: ${String(key)}`)
    }),
  }
}

const inMemoryIndexClient = (
  initialDocuments: Record<string, Record<string, unknown>[]> = {}
) => {
  const indexes = new Map(
    Object.entries(initialDocuments).map(([index, documents]) => [
      index,
      new Map(documents.map((document) => [String(document.id), document])),
    ])
  )
  const ensureIndex = vi.fn(async (index: string) => {
    if (!indexes.has(index)) {
      indexes.set(index, new Map())
    }
  })
  const addDocuments = vi.fn(
    async (index: string, documents: Record<string, unknown>[]) => {
      const target = indexes.get(index) ?? new Map()
      indexes.set(index, target)
      for (const document of documents) {
        target.set(String(document.id), document)
      }
    }
  )
  const deleteDocuments = vi.fn(async (index: string, ids: string[]) => {
    const target = indexes.get(index)
    for (const id of ids) {
      target?.delete(id)
    }
  })
  const deleteIndex = vi.fn(async (index: string) => {
    indexes.delete(index)
  })
  const swapIndexPairs = vi.fn(
    async (pairs: { first: string; second: string }[]) => {
      for (const pair of pairs) {
        const first = indexes.get(pair.first) ?? new Map()
        const second = indexes.get(pair.second) ?? new Map()
        indexes.set(pair.first, second)
        indexes.set(pair.second, first)
      }
    }
  )
  const client = {
    addDocuments,
    deleteDocuments,
    deleteIndex,
    ensureIndex,
    getDocumentIds: vi.fn(async (index: string) => [
      ...(indexes.get(index)?.keys() ?? []),
    ]),
    swapIndexPairs,
    updateSettings: vi.fn().mockResolvedValue(undefined),
  } as unknown as MeilisearchAdminClient

  return {
    addDocuments,
    client,
    deleteIndex,
    document: (index: string, id: string) => indexes.get(index)?.get(id),
    documentIds: (index: string) => [...(indexes.get(index)?.keys() ?? [])],
    indexes,
    swapIndexPairs,
  }
}

describe("Meilisearch catalog localization", () => {
  it("selects the exact requested profile set and rejects zero or missing targets", () => {
    const profiles = [roProfile("herbatika-ro"), roProfile("herbatika-cz")]

    let configurationError: unknown
    try {
      selectRequestedSearchProfiles([])
    } catch (error) {
      configurationError = error
    }
    expect(configurationError).toMatchObject({
      message: expect.stringContaining("at least one configured profile"),
      type: MedusaError.Types.UNEXPECTED_STATE,
    })
    expect(() => selectRequestedSearchProfiles([])).toThrow(
      "at least one configured profile"
    )
    expect(selectRequestedSearchProfiles(profiles, ["herbatika-cz"])).toEqual([
      profiles[1],
    ])
    let requestedKeyError: unknown
    try {
      selectRequestedSearchProfiles(profiles, [])
    } catch (error) {
      requestedKeyError = error
    }
    expect(requestedKeyError).toMatchObject({
      message: expect.stringContaining(
        "must contain at least one exact profile key"
      ),
      type: MedusaError.Types.INVALID_DATA,
    })
    expect(() =>
      selectRequestedSearchProfiles(profiles, [
        "herbatika-ro",
        "herbatika-missing",
      ])
    ).toThrow('configured profile keys are missing: "herbatika-missing"')
    expect(() =>
      selectRequestedSearchProfiles(profiles, ["herbatika-ro", "herbatika-ro"])
    ).toThrow("must be unique")
    expect(selectRequestedSearchProfiles(profiles)).toEqual(profiles)
  })

  it("preserves default catalog records without a translation lookup", async () => {
    const { graph, query } = queryWith([])

    await expect(
      applyLocalizedTranslations(query, records, "default", "product")
    ).resolves.toEqual(records)
    expect(graph).not.toHaveBeenCalled()
  })

  it("preserves Slovak source records when translations are missing", async () => {
    const { query } = queryWith([])

    await expect(
      applyLocalizedTranslations(query, records, "sk-SK", "product")
    ).resolves.toEqual(records)
  })

  it("preserves Slovak source records when the translation lookup fails", async () => {
    const query = {
      graph: vi.fn().mockRejectedValue(new Error("translation service down")),
    } as unknown as Query

    await expect(
      applyLocalizedTranslations(query, records, "sk", "product")
    ).resolves.toEqual(records)
  })

  it("indexes complete exact Romanian translations", async () => {
    const { query } = queryWith([
      {
        deleted_at: null,
        locale_code: "ro-RO",
        reference: "product",
        reference_id: "prod_1",
        translations: {
          description: "Descriere română",
          title: "Nume românesc",
        },
      },
      {
        deleted_at: null,
        locale_code: "ro-RO",
        reference: "product",
        reference_id: "prod_2",
        translations: {
          description: "A doua descriere",
          title: "Al doilea nume",
        },
      },
    ])

    await expect(
      applyLocalizedTranslations(query, records, "ro-RO", "product")
    ).resolves.toEqual([
      {
        description: "Descriere română",
        id: "prod_1",
        title: "Nume românesc",
      },
      {
        description: "A doua descriere",
        id: "prod_2",
        title: "Al doilea nume",
      },
    ])
  })

  it("fails the Romanian profile when any exact translation is missing", async () => {
    const { query } = queryWith([
      {
        deleted_at: null,
        locale_code: "ro-RO",
        reference: "product",
        reference_id: "prod_1",
        translations: { title: "Nume românesc" },
      },
    ])

    await expect(
      applyLocalizedTranslations(query, records, "ro-RO", "product")
    ).rejects.toThrow(
      "1/2 exact translation(s) are missing or invalid (prod_2)"
    )
  })

  it("clears optional Slovak display fields but preserves the stable handle", async () => {
    const { query } = queryWith([
      {
        deleted_at: null,
        locale_code: "ro-RO",
        reference: "product",
        reference_id: "prod_1",
        translations: { title: "Nume românesc" },
      },
    ])

    const [localized] = await applyLocalizedTranslations(
      query,
      [
        {
          description: "Slovenský opis",
          handle: "slovensky-produkt",
          id: "prod_1",
          title: "Slovenský názov",
        },
      ],
      "ro-RO",
      "product"
    )

    expect(localized).toEqual({
      handle: "slovensky-produkt",
      id: "prod_1",
      title: "Nume românesc",
    })
  })

  it.each([
    {
      label: "wrong entity reference",
      row: {
        deleted_at: null,
        locale_code: "ro-RO",
        reference: "brand",
        reference_id: "prod_1",
        translations: { title: "Nume românesc" },
      },
    },
    {
      label: "missing localized title",
      row: {
        deleted_at: null,
        locale_code: "ro-RO",
        reference: "product",
        reference_id: "prod_1",
        translations: { description: "Descriere română" },
      },
    },
    {
      label: "deleted translation",
      row: {
        deleted_at: "2026-08-20T00:00:00.000Z",
        locale_code: "ro-RO",
        reference: "product",
        reference_id: "prod_1",
        translations: { title: "Nume românesc" },
      },
    },
  ])("rejects a Romanian $label", async ({ row }) => {
    const { query } = queryWith([
      row,
      {
        deleted_at: null,
        locale_code: "ro-RO",
        reference: "product",
        reference_id: "prod_2",
        translations: { title: "Al doilea nume" },
      },
    ])

    await expect(
      applyLocalizedTranslations(query, records, "ro-RO", "product")
    ).rejects.toThrow(
      "1/2 exact translation(s) are missing or invalid (prod_1)"
    )
  })

  it("fails the Romanian profile when the translation lookup fails", async () => {
    const query = {
      graph: vi.fn().mockRejectedValue(new Error("translation service down")),
    } as unknown as Query

    await expect(
      applyLocalizedTranslations(query, records, "ro-RO", "product")
    ).rejects.toThrow(
      'cannot index product records for locale "ro-RO": the exact-translation lookup failed'
    )
  })

  it("requires a localized category name for Romanian category documents", async () => {
    const { query } = queryWith([
      {
        deleted_at: null,
        locale_code: "ro-RO",
        reference: "product_category",
        reference_id: "pcat_1",
        translations: { title: "Titlu greșit" },
      },
    ])

    await expect(
      applyLocalizedTranslations(
        query,
        [{ id: "pcat_1", name: "Slovenská kategória" }],
        "ro-RO",
        "product_category"
      )
    ).rejects.toThrow("exact translation(s) are missing or invalid")
  })

  it("localizes embedded categories and brands in Romanian product hits", async () => {
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            deleted_at: null,
            locale_code: "ro-RO",
            reference: "product_category",
            reference_id: "pcat_1",
            translations: {
              description: "Descriere categorie",
              handle: "categorie-romaneasca",
              name: "Categorie românească",
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            deleted_at: null,
            locale_code: "ro-RO",
            reference: "brand",
            reference_id: "brand_1",
            translations: {
              handle: "marca-romaneasca",
              title: "Marcă românească",
            },
          },
        ],
      })
    const query = { graph } as unknown as Query

    await expect(
      applyLocalizedProductRelations(
        query,
        [
          {
            brand: {
              handle: "slovenska-znacka",
              id: "brand_1",
              title: "Slovenská značka",
            },
            categories: [
              {
                description: "Slovenský opis kategórie",
                handle: "slovenska-kategoria",
                id: "pcat_1",
                name: "Slovenská kategória",
              },
            ],
            id: "prod_1",
            title: "Nume românesc",
          },
        ],
        "ro-RO"
      )
    ).resolves.toEqual([
      {
        brand: {
          handle: "slovenska-znacka",
          id: "brand_1",
          title: "Marcă românească",
        },
        categories: [
          {
            description: "Descriere categorie",
            handle: "slovenska-kategoria",
            id: "pcat_1",
            name: "Categorie românească",
          },
        ],
        id: "prod_1",
        title: "Nume românesc",
      },
    ])
  })

  it("fails Romanian product indexing when an embedded relation is untranslated", async () => {
    const query = {
      graph: vi.fn().mockResolvedValue({ data: [] }),
    } as unknown as Query

    await expect(
      applyLocalizedProductRelations(
        query,
        [
          {
            categories: [{ id: "pcat_1", name: "Slovenská kategória" }],
            id: "prod_1",
          },
        ],
        "ro-RO"
      )
    ).rejects.toThrow(
      'cannot index product_category records for locale "ro-RO"'
    )
  })

  it("projects only approved variants and the exact profile currency price", () => {
    const projected = projectProductForVariantAuthority(
      {
        id: "prod_price_scope",
        metadata: { top_offer: { current_price: 1 } },
        title: "Produs românesc",
        variants: [
          {
            ean: "approved-ean",
            id: "variant_approved",
            prices: [
              { amount: 100, currency_code: "eur" },
              { amount: 5000, currency_code: "RON" },
            ],
            sku: "APPROVED-SKU",
          },
          {
            ean: "unavailable-ean",
            id: "variant_unavailable",
            prices: [{ amount: 2500, currency_code: "ron" }],
            sku: "UNAVAILABLE-SKU",
          },
        ],
      },
      {
        approvedVariantIds: new Set(["variant_approved"]),
        currencyCode: "ron",
        unavailableVariantIds: new Set(["variant_unavailable"]),
      }
    )
    const documents = buildProductSearchDocuments(projected)

    expect(projected.metadata).toEqual({})
    expect(projected.variants).toEqual([
      expect.objectContaining({
        id: "variant_approved",
        prices: [{ amount: 5000, currency_code: "RON" }],
      }),
    ])
    expect(documents).toHaveLength(2)
    expect(documents.map((document) => document.facet_price)).toEqual([
      5000, 5000,
    ])
    expect(documents.map((document) => document.search_variant_id)).toEqual([
      undefined,
      "variant_approved",
    ])
    for (const document of documents) {
      expect(document.search_identifiers).not.toEqual(
        expect.arrayContaining(["unavailable-ean", "UNAVAILABLE-SKU"])
      )
    }
  })

  it("fails closed when a variant has no exact availability authority", () => {
    let projectionError: unknown
    try {
      projectProductForVariantAuthority(
        { id: "prod_1", variants: [{ id: "variant_1", prices: [] }] },
        {
          approvedVariantIds: new Set(),
          currencyCode: "ron",
          unavailableVariantIds: new Set(),
        }
      )
    } catch (error) {
      projectionError = error
    }
    expect(projectionError).toMatchObject({
      message: expect.stringContaining(
        'variant authority is missing or ambiguous for "variant_1"'
      ),
      type: MedusaError.Types.UNEXPECTED_STATE,
    })
  })

  it("rejects a competing scoped RON price that could diverge from native Meili sorting", () => {
    expect(() =>
      projectProductForVariantAuthority(
        {
          id: "prod_1",
          variants: [
            {
              id: "variant_1",
              prices: [
                { amount: 5000, currency_code: "ron" },
                {
                  amount: 4000,
                  currency_code: "ron",
                  price_list_id: "plist_customer",
                },
              ],
            },
          ],
        },
        {
          approvedVariantIds: new Set(["variant_1"]),
          currencyCode: "ron",
          unavailableVariantIds: new Set(),
        }
      )
    ).toThrow("no competing scoped price")
  })

  it("indexes only authority-approved Romanian variants with RON facets", async () => {
    const profile = roProfile("ro_variant_authority")
    const product = {
      id: "prod_variant_authority",
      metadata: {
        ...productPublication("published", "produs-cu-variante"),
        top_offer: { current_price: 1 },
      },
      sales_channels: [{ id: "sc_ro" }],
      status: "published",
      title: "Slovenský produkt s variantmi",
      updated_at: "2026-08-20T00:00:00.000Z",
      variants: [
        {
          ean: "approved-ean",
          id: "variant_approved",
          prices: [
            { amount: 100, currency_code: "eur" },
            { amount: 5000, currency_code: "ron" },
          ],
          sku: "APPROVED-SKU",
        },
        {
          ean: "unavailable-ean",
          id: "variant_unavailable",
          prices: [{ amount: 2500, currency_code: "ron" }],
          sku: "UNAVAILABLE-SKU",
        },
      ],
    }
    const graph = vi.fn(async (request: Record<string, unknown>) => {
      if (request.entity === "product") {
        return { data: [product] }
      }
      if (request.entity === "translation") {
        return {
          data: [
            {
              deleted_at: null,
              locale_code: "ro-RO",
              reference: "product",
              reference_id: product.id,
              translations: { title: "Produs românesc cu variante" },
            },
          ],
        }
      }
      throw new Error(`Unexpected graph entity: ${String(request.entity)}`)
    })
    const authoritySha256 = "a".repeat(64)
    const authorityRows = product.variants.map((variant) => ({
      approval_provenance: { approval: variant.id },
      authority_sha256: authoritySha256,
      availability:
        variant.id === "variant_approved" ? "sellable" : "unavailable",
      market_code: "ro",
      product_id: product.id,
      source_provenance: { source: variant.id },
      source_version: "ro-demo-2026-08-20",
      variant_id: variant.id,
    }))
    const listMarketVariantAuthorities = vi
      .fn()
      .mockResolvedValue(authorityRows)
    const indexState = inMemoryIndexClient()

    await expect(
      syncProfile({
        client: indexState.client,
        container: syncContainer(
          { graph } as unknown as Query,
          vi.fn().mockResolvedValue([]),
          listMarketVariantAuthorities
        ) as never,
        logger: { info: vi.fn(), warn: vi.fn() } as never,
        mode: "normal",
        profile,
      })
    ).resolves.toEqual({ deleted: 0, indexed: 2 })

    const documents = indexState
      .documentIds(profile.indexes.product)
      .map((id) => indexState.document(profile.indexes.product, id))
    expect(documents).toHaveLength(2)
    expect(documents.map((document) => document?.facet_price)).toEqual([
      5000, 5000,
    ])
    expect(documents.map((document) => document?.search_variant_id)).toEqual([
      undefined,
      "variant_approved",
    ])
    for (const document of documents) {
      expect(document?.search_identifiers).not.toEqual(
        expect.arrayContaining(["unavailable-ean", "UNAVAILABLE-SKU"])
      )
    }
    expect(listMarketVariantAuthorities).toHaveBeenCalledWith(
      {
        market_code: "ro",
        product_id: { $in: [product.id] },
      },
      {
        order: { product_id: "ASC", variant_id: "ASC" },
        take: 3,
      }
    )
    expect(indexState.swapIndexPairs).toHaveBeenCalledTimes(1)
  })

  it("keeps active Romanian indexes unchanged without exact RON region proof", async () => {
    const profile = roProfile("ro_region_fail_closed")
    const query = {
      graph: vi.fn().mockRejectedValue(new Error("products must not be read")),
    } as unknown as Query
    const indexState = inMemoryIndexClient({
      [profile.indexes.product]: [
        { id: "prod_live", title: "Produs românesc existent" },
      ],
    })

    await expect(
      syncProfile({
        client: indexState.client,
        container: syncContainer(
          query,
          vi.fn().mockResolvedValue([]),
          vi.fn().mockResolvedValue([]),
          [
            {
              countries: [{ iso_2: "ro" }],
              currency_code: "eur",
              id: "reg_ro",
              metadata: {
                market_code: "ro",
                sales_channel_id: "sc_ro",
              },
            },
          ]
        ) as never,
        logger: { info: vi.fn(), warn: vi.fn() } as never,
        mode: "normal",
        profile,
      })
    ).rejects.toThrow("cannot prove exact region, currency")

    expect(indexState.documentIds(profile.indexes.product)).toEqual([
      "prod_live",
    ])
    expect(indexState.swapIndexPairs).not.toHaveBeenCalled()
    expect(query.graph).not.toHaveBeenCalled()
  })

  it("keeps active Romanian indexes unchanged when variant authority is incomplete", async () => {
    const profile = roProfile("ro_variant_authority_fail_closed")
    const product = {
      id: "prod_incomplete_authority",
      metadata: productPublication("published", "produs-fara-autoritate"),
      sales_channels: [{ id: "sc_ro" }],
      status: "published",
      title: "Slovenský produkt",
      updated_at: "2026-08-20T00:00:00.000Z",
      variants: [
        {
          id: "variant_missing_authority",
          prices: [{ amount: 5000, currency_code: "ron" }],
        },
      ],
    }
    const graph = vi.fn(async (request: Record<string, unknown>) => {
      if (request.entity === "product") {
        return { data: [product] }
      }
      if (request.entity === "translation") {
        return {
          data: [
            {
              deleted_at: null,
              locale_code: "ro-RO",
              reference: "product",
              reference_id: product.id,
              translations: { title: "Produs românesc" },
            },
          ],
        }
      }
      throw new Error(`Unexpected graph entity: ${String(request.entity)}`)
    })
    const indexState = inMemoryIndexClient({
      [profile.indexes.product]: [
        { id: "prod_live", title: "Produs românesc existent" },
      ],
    })

    await expect(
      syncProfile({
        client: indexState.client,
        container: syncContainer({ graph } as unknown as Query) as never,
        logger: { info: vi.fn(), warn: vi.fn() } as never,
        mode: "normal",
        profile,
      })
    ).rejects.toThrow("cannot prove one exhaustive variant authority")

    expect(indexState.documentIds(profile.indexes.product)).toEqual([
      "prod_live",
    ])
    expect(indexState.swapIndexPairs).not.toHaveBeenCalled()
    expect(
      [...indexState.indexes.keys()].some((index) => index.includes("__build_"))
    ).toBe(false)
  })

  it("excludes draft and wrong-channel Romanian assignments from a full rebuild", async () => {
    const profile = roProfile("ro_full_exclusion")
    const draftProduct = {
      id: "prod_draft",
      metadata: productPublication("draft", "produs-ciorna"),
      sales_channels: [{ id: "sc_ro" }],
      status: "published",
      title: "Slovenský koncept",
      updated_at: "2026-08-20T00:00:00.000Z",
    }
    const wrongChannelProduct = {
      id: "prod_wrong_channel",
      metadata: productPublication(
        "published",
        "produs-canal-gresit",
        "sc_other"
      ),
      sales_channels: [{ id: "sc_ro" }, { id: "sc_other" }],
      status: "published",
      title: "Slovenský produkt s nesprávnym kanálom",
      updated_at: "2026-08-20T00:00:00.000Z",
    }
    const graph = vi.fn(async (request: Record<string, unknown>) => {
      if (request.entity === "product") {
        return { data: [draftProduct, wrongChannelProduct] }
      }
      throw new Error(`Unexpected graph entity: ${String(request.entity)}`)
    })
    const query = { graph } as unknown as Query
    const indexState = inMemoryIndexClient()

    await expect(
      syncProfile({
        client: indexState.client,
        container: syncContainer(query) as never,
        logger: { info: vi.fn(), warn: vi.fn() } as never,
        mode: "full",
        profile,
      })
    ).resolves.toEqual({ deleted: 0, indexed: 0 })

    expect(indexState.documentIds(profile.indexes.product)).toEqual([])
    expect(indexState.swapIndexPairs).toHaveBeenCalledTimes(1)
    expect(
      indexState.addDocuments.mock.calls.some(
        ([index, documents]) =>
          String(index).startsWith(`${profile.indexes.product}__build_`) &&
          Array.isArray(documents) &&
          documents.length > 0
      )
    ).toBe(false)
    expect(graph).toHaveBeenCalledTimes(1)
  })

  it("retires a previously indexed Romanian product on normal draft transition", async () => {
    const profile = roProfile("ro_normal_retirement")
    const draftProduct = {
      id: "prod_retired",
      metadata: productPublication("draft", "produs-retras"),
      sales_channels: [{ id: "sc_ro" }],
      status: "published",
      title: "Slovenský vyradený produkt",
      updated_at: "2026-08-20T00:00:00.000Z",
    }
    const graph = vi.fn(async (request: Record<string, unknown>) => {
      if (request.entity === "product") {
        return { data: [draftProduct] }
      }
      throw new Error(`Unexpected graph entity: ${String(request.entity)}`)
    })
    const query = { graph } as unknown as Query
    const indexState = inMemoryIndexClient({
      [profile.indexes.product]: [
        { id: "prod_retired", title: "Vechiul rezultat românesc" },
      ],
    })
    expect(indexState.documentIds(profile.indexes.product)).toEqual([
      "prod_retired",
    ])

    await expect(
      syncProfile({
        client: indexState.client,
        container: syncContainer(query) as never,
        logger: { info: vi.fn(), warn: vi.fn() } as never,
        mode: "normal",
        profile,
      })
    ).resolves.toEqual({ deleted: 0, indexed: 0 })

    expect(indexState.documentIds(profile.indexes.product)).toEqual([])
    expect(indexState.swapIndexPairs).toHaveBeenCalledTimes(1)
    expect(
      [...indexState.indexes.keys()].some((index) => index.includes("__build_"))
    ).toBe(false)
    expect(graph).toHaveBeenCalledTimes(1)
  })

  it("indexes only the 207 published categories and never translates 2 drafts", async () => {
    const profile = roProfile("ro_category_intersection")
    const publishedCategories = Array.from({ length: 207 }, (_, index) => ({
      handle: `category-${index + 1}`,
      id: `pcat_published_${index + 1}`,
      is_active: true,
      name: `Slovenská kategória ${index + 1}`,
    }))
    const draftCategories = [
      {
        handle: "draft-category-1",
        id: "pcat_draft_1",
        is_active: true,
        name: "Slovenská draft kategória 1",
      },
      {
        handle: "draft-category-2",
        id: "pcat_draft_2",
        is_active: true,
        name: "Slovenská draft kategória 2",
      },
    ]
    const product = {
      categories: [...publishedCategories, ...draftCategories],
      id: "prod_category_intersection",
      metadata: productPublication(
        "published",
        "produs-cu-207-categorii-publicate"
      ),
      sales_channels: [{ id: "sc_ro" }],
      status: "published",
      title: "Slovenský produkt s kategóriami",
      updated_at: "2026-08-20T00:00:00.000Z",
    }
    const graph = vi.fn(async (request: Record<string, unknown>) => {
      if (request.entity === "product") {
        return { data: [product] }
      }
      if (request.entity === "product_category") {
        return { data: publishedCategories }
      }
      if (request.entity === "translation") {
        const filters = request.filters as { reference_id: string[] }
        return {
          data: filters.reference_id.map((id) => ({
            deleted_at: null,
            locale_code: "ro-RO",
            reference: id === product.id ? "product" : "product_category",
            reference_id: id,
            translations:
              id === product.id
                ? { title: "Produs cu 207 categorii publicate" }
                : { name: `Categorie românească ${id}` },
          })),
        }
      }
      throw new Error(`Unexpected graph entity: ${String(request.entity)}`)
    })
    const query = { graph } as unknown as Query
    const publishedAssignments = publishedCategories.map((category, index) => ({
      entity_id: category.id,
      entity_kind: "category",
      market_code: "ro",
      publication_status: "published",
      public_slug: `categorie-${index + 1}`,
      sales_channel_id: "sc_ro",
    }))
    const listStorefrontUrlAssignments = vi.fn(
      async (filters: { entity_id?: string[]; entity_kind: string }) => {
        if (filters.entity_kind !== "category") {
          return []
        }
        const requestedIds = filters.entity_id
          ? new Set(filters.entity_id)
          : undefined
        return requestedIds
          ? publishedAssignments.filter((assignment) =>
              requestedIds.has(assignment.entity_id)
            )
          : publishedAssignments
      }
    )
    const indexState = inMemoryIndexClient()

    await expect(
      syncProfile({
        client: indexState.client,
        container: syncContainer(query, listStorefrontUrlAssignments) as never,
        logger: { info: vi.fn(), warn: vi.fn() } as never,
        mode: "normal",
        profile,
      })
    ).resolves.toEqual({ deleted: 0, indexed: 208 })

    expect(indexState.documentIds(profile.indexes.category)).toHaveLength(207)
    const indexedProduct = indexState.document(
      profile.indexes.product,
      product.id
    )
    expect(indexedProduct?.categories).toHaveLength(207)
    expect(indexedProduct?.facet_category_ids).toHaveLength(207)
    const translationRequestIds = graph.mock.calls
      .map(([request]) => request as Record<string, unknown>)
      .filter((request) => request.entity === "translation")
      .flatMap((request) => {
        const filters = request.filters as { reference_id: string[] }
        return filters.reference_id
      })
    expect(translationRequestIds).not.toContain("pcat_draft_1")
    expect(translationRequestIds).not.toContain("pcat_draft_2")
    expect(listStorefrontUrlAssignments).toHaveBeenCalledTimes(3)
    expect(indexState.swapIndexPairs).toHaveBeenCalledTimes(1)
    expect(
      [...indexState.indexes.keys()].some((index) => index.includes("__build_"))
    ).toBe(false)
  })

  it("indexes the exact 207 categories and 103 brands without product references", async () => {
    const profile = roProfile("ro_standalone_catalog_sets")
    const categories = Array.from({ length: 207 }, (_, index) => ({
      handle: `category-${index + 1}`,
      id: `pcat_standalone_${index + 1}`,
      is_active: true,
      name: `Slovenská kategória ${index + 1}`,
    }))
    const brands = Array.from({ length: 103 }, (_, index) => ({
      handle: `brand-${index + 1}`,
      id: `brand_standalone_${index + 1}`,
      title: `Slovenská značka ${index + 1}`,
    }))
    const product = {
      categories: [],
      id: "prod_without_relations",
      metadata: productPublication("published", "produs-fara-relatii"),
      sales_channels: [{ id: "sc_ro" }],
      status: "published",
      title: "Slovenský produkt bez väzieb",
      updated_at: "2026-08-20T00:00:00.000Z",
    }
    const graph = vi.fn(async (request: Record<string, unknown>) => {
      if (request.entity === "product") {
        return { data: [product] }
      }
      if (request.entity === "product_category") {
        return { data: categories }
      }
      if (request.entity === "brand") {
        return { data: brands }
      }
      if (request.entity === "translation") {
        const filters = request.filters as { reference_id: string[] }
        return {
          data: filters.reference_id.map((id) => ({
            deleted_at: null,
            locale_code: "ro-RO",
            reference_id: id,
            ...exactRomanianTranslation(id),
          })),
        }
      }
      throw new Error(`Unexpected graph entity: ${String(request.entity)}`)
    })
    const assignments = [
      ...categories.map((category, index) => ({
        entity_id: category.id,
        entity_kind: "category",
        market_code: "ro",
        publication_status: "published",
        public_slug: `categorie-${index + 1}`,
        sales_channel_id: "sc_ro",
      })),
      ...brands.map((brand, index) => ({
        entity_id: brand.id,
        entity_kind: "brand",
        market_code: "ro",
        publication_status: "published",
        public_slug: `marca-${index + 1}`,
        sales_channel_id: "sc_ro",
      })),
    ]
    const listStorefrontUrlAssignments = vi.fn(
      async (filters: { entity_kind: string }) =>
        assignments.filter(
          (assignment) => assignment.entity_kind === filters.entity_kind
        )
    )
    const indexState = inMemoryIndexClient()

    await expect(
      syncProfile({
        client: indexState.client,
        container: syncContainer(
          { graph } as unknown as Query,
          listStorefrontUrlAssignments
        ) as never,
        logger: { info: vi.fn(), warn: vi.fn() } as never,
        mode: "normal",
        profile,
      })
    ).resolves.toEqual({ deleted: 0, indexed: 311 })

    expect(indexState.documentIds(profile.indexes.category)).toHaveLength(207)
    expect(indexState.documentIds(profile.indexes.brand)).toHaveLength(103)
    expect(
      indexState.document(profile.indexes.product, product.id)?.categories
    ).toBeUndefined()
    expect(listStorefrontUrlAssignments).toHaveBeenCalledTimes(2)
    expect(indexState.swapIndexPairs).toHaveBeenCalledTimes(1)
  })

  it("atomically excludes a Romanian draft category from facets and its index", async () => {
    const profile = roProfile("ro_category_retirement")
    const product = {
      categories: [
        {
          description: "Slovenský opis ghost kategórie",
          handle: "ghost-kategoria",
          id: "pcat_ghost",
          name: "Slovenská ghost kategória",
        },
      ],
      id: "prod_with_ghost_category",
      metadata: productPublication("published", "produs-cu-categorie-exclusa"),
      sales_channels: [{ id: "sc_ro" }],
      status: "published",
      title: "Slovenský produkt s ghost kategóriou",
      updated_at: "2026-08-20T00:00:00.000Z",
    }
    const graph = vi.fn(async (request: Record<string, unknown>) => {
      if (request.entity === "product") {
        return { data: [product] }
      }
      if (request.entity === "translation") {
        return {
          data: [
            {
              deleted_at: null,
              locale_code: "ro-RO",
              reference: "product",
              reference_id: product.id,
              translations: { title: "Produs cu categorie exclusă" },
            },
          ],
        }
      }
      throw new Error(`Unexpected graph entity: ${String(request.entity)}`)
    })
    const query = { graph } as unknown as Query
    const listStorefrontUrlAssignments = vi.fn().mockResolvedValue([])
    const indexState = inMemoryIndexClient({
      [profile.indexes.category]: [
        { id: "pcat_ghost", name: "Categorie românească veche" },
      ],
    })

    await expect(
      syncProfile({
        client: indexState.client,
        container: syncContainer(query, listStorefrontUrlAssignments) as never,
        logger: { info: vi.fn(), warn: vi.fn() } as never,
        mode: "normal",
        profile,
      })
    ).resolves.toEqual({ deleted: 0, indexed: 1 })

    expect(indexState.documentIds(profile.indexes.category)).toEqual([])
    const indexedProduct = indexState.document(
      profile.indexes.product,
      product.id
    )
    expect(indexedProduct).toBeDefined()
    expect(indexedProduct?.categories ?? []).toEqual([])
    expect(indexedProduct?.facet_category_ids ?? []).toEqual([])
    expect(listStorefrontUrlAssignments).toHaveBeenCalledWith(
      {
        entity_id: ["pcat_ghost"],
        entity_kind: "category",
        market_code: "ro",
        publication_status: "published",
        sales_channel_id: "sc_ro",
      },
      { take: 2 }
    )
    expect(indexState.swapIndexPairs).toHaveBeenCalledTimes(1)
    expect(
      [...indexState.indexes.keys()].some((index) => index.includes("__build_"))
    ).toBe(false)
    expect(graph).toHaveBeenCalledTimes(2)
  })

  it("keeps active indexes unchanged when Romanian batch two is untranslated", async () => {
    const firstBatch = Array.from({ length: 500 }, (_, index) => ({
      id: `prod_${index + 1}`,
      metadata: productPublication("published", `produs-${index + 1}`),
      sales_channels: [{ id: "sc_ro" }],
      status: "published",
      title: `Slovenský produkt ${index + 1}`,
      updated_at: "2026-08-20T00:00:00.000Z",
    }))
    const secondBatch = [
      {
        id: "prod_501",
        metadata: productPublication("published", "produs-501"),
        sales_channels: [{ id: "sc_ro" }],
        status: "published",
        title: "Slovenský produkt 501",
        updated_at: "2026-08-20T00:00:00.000Z",
      },
    ]
    const graph = vi.fn(async (request: Record<string, unknown>) => {
      if (request.entity === "product") {
        const pagination = request.pagination as { skip: number }
        return { data: pagination.skip === 0 ? firstBatch : secondBatch }
      }

      if (request.entity === "translation") {
        const filters = request.filters as { reference_id: string[] }
        return {
          data:
            filters.reference_id.length === 500
              ? filters.reference_id.map((id) => ({
                  deleted_at: null,
                  locale_code: "ro-RO",
                  reference: "product",
                  reference_id: id,
                  translations: { title: `Produs românesc ${id}` },
                }))
              : [],
        }
      }

      throw new Error(`Unexpected graph entity: ${String(request.entity)}`)
    })
    const query = { graph } as unknown as Query
    const container = syncContainer(query)
    const addDocuments = vi.fn().mockResolvedValue(undefined)
    const deleteIndex = vi.fn().mockResolvedValue(undefined)
    const swapIndexPairs = vi.fn().mockResolvedValue(undefined)
    const client = {
      addDocuments,
      deleteIndex,
      ensureIndex: vi.fn().mockResolvedValue(undefined),
      swapIndexPairs,
      updateSettings: vi.fn().mockResolvedValue(undefined),
    } as unknown as MeilisearchAdminClient
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
    }
    const profile = {
      availability: "all",
      domain: "ro.example.test",
      indexes: {
        brand: "active_brand",
        category: "active_category",
        content: "active_content",
        product: "active_product",
      },
      key: "herbatika-ro",
      limits: {
        autocomplete: { brand: 5, category: 5, content: 5, product: 5 },
        fullSearch: 20,
        page: 20,
        popular: 10,
      },
      locale: "ro-RO",
      minimumRankingScore: 0.55,
      salesChannelIds: ["sc_ro"],
      separateVariantResults: false,
      shop: "herbatika",
      strict: false,
    } satisfies SearchProfile

    await expect(
      syncProfile({
        client,
        container: container as never,
        logger: logger as never,
        mode: "normal",
        profile,
      })
    ).rejects.toThrow(
      'cannot index product records for locale "ro-RO": 1/1 exact translation(s) are missing'
    )

    const activeIndexes = new Set(Object.values(profile.indexes))
    expect(addDocuments).toHaveBeenCalledTimes(1)
    expect(
      addDocuments.mock.calls.every(
        ([index]) =>
          typeof index === "string" &&
          !activeIndexes.has(index) &&
          index.startsWith("active_product__build_")
      )
    ).toBe(true)
    expect(swapIndexPairs).not.toHaveBeenCalled()
    expect(deleteIndex).toHaveBeenCalledTimes(4)
    expect(
      deleteIndex.mock.calls.every(
        ([index]) => typeof index === "string" && !activeIndexes.has(index)
      )
    ).toBe(true)
  })

  it("keeps the last-good generation when full-sync content projection is incomplete", async () => {
    const profile = {
      availability: "all",
      domain: "default.example.test",
      indexes: {
        brand: "active_default_brand",
        category: "active_default_category",
        content: "active_default_content",
        product: "active_default_product",
      },
      key: "default-content-fail-closed",
      limits: {
        autocomplete: { brand: 5, category: 5, content: 5, product: 5 },
        fullSearch: 20,
        page: 20,
        popular: 10,
      },
      locale: "default",
      minimumRankingScore: 0.55,
      salesChannelIds: [],
      separateVariantResults: false,
      shop: "default",
      strict: false,
    } satisfies SearchProfile
    const query = {
      graph: vi.fn().mockResolvedValue({ data: [] }),
    } as unknown as Query
    const payload = {
      listPublishedArticles: vi.fn().mockResolvedValue({
        docs: [],
        hasNextPage: false,
      }),
      listPublishedPages: vi.fn().mockResolvedValue({
        docs: [
          {
            id: "page_1",
            status: "published",
            title: "Existing public page",
            visibility: "public",
          },
        ],
        hasNextPage: false,
      }),
    }
    const container = {
      resolve: vi.fn((key: unknown) => {
        if (key === ContainerRegistrationKeys.QUERY) {
          return query
        }
        if (key === ContainerRegistrationKeys.PG_CONNECTION) {
          return { raw: vi.fn().mockResolvedValue([[]]) }
        }
        if (key === PAYLOAD_MODULE) {
          return payload
        }
        throw new Error(`Unexpected container key: ${String(key)}`)
      }),
    }
    const indexState = inMemoryIndexClient({
      [profile.indexes.content]: [
        {
          href: "/old-public-page",
          id: "page_page_1",
          title: "Last-good public page",
        },
      ],
    })
    const contentProjectionResolver = vi.fn().mockResolvedValue(new Map())

    await expect(
      syncProfile({
        client: indexState.client,
        container: container as never,
        contentProjectionResolver,
        logger: { info: vi.fn(), warn: vi.fn() } as never,
        mode: "full",
        profile,
      })
    ).rejects.toThrow("content projection is incomplete")

    expect(indexState.documentIds(profile.indexes.content)).toEqual([
      "page_page_1",
    ])
    expect(indexState.swapIndexPairs).not.toHaveBeenCalled()
    expect(
      [...indexState.indexes.keys()].some((index) => index.includes("__build_"))
    ).toBe(false)
  })

  it("retains the previous generation after a successful explicit full sync", async () => {
    const profile = {
      availability: "all",
      domain: "default.example.test",
      indexes: {
        brand: "retained_default_brand",
        category: "retained_default_category",
        content: "retained_default_content",
        product: "retained_default_product",
      },
      key: "default-retained-generation",
      limits: {
        autocomplete: { brand: 5, category: 5, content: 5, product: 5 },
        fullSearch: 20,
        page: 20,
        popular: 10,
      },
      locale: "default",
      minimumRankingScore: 0.55,
      salesChannelIds: [],
      separateVariantResults: false,
      shop: "default",
      strict: false,
    } satisfies SearchProfile
    const query = {
      graph: vi.fn().mockResolvedValue({ data: [] }),
    } as unknown as Query
    const indexState = inMemoryIndexClient({
      [profile.indexes.product]: [
        { id: "product_last_good", title: "Last-good product" },
      ],
    })

    await expect(
      syncProfile({
        client: indexState.client,
        container: syncContainer(query) as never,
        logger: { info: vi.fn(), warn: vi.fn() } as never,
        mode: "full",
        profile,
      })
    ).resolves.toEqual({ deleted: 0, indexed: 0 })

    expect(indexState.documentIds(profile.indexes.product)).toEqual([])
    const retainedIndexes = [...indexState.indexes.keys()].filter((index) =>
      index.includes("__build_")
    )
    expect(retainedIndexes).toHaveLength(4)
    const retainedProductIndex = retainedIndexes.find((index) =>
      index.startsWith(`${profile.indexes.product}__build_`)
    )
    expect(retainedProductIndex).toBeDefined()
    expect(indexState.documentIds(retainedProductIndex as string)).toContain(
      "product_last_good"
    )
    expect(indexState.deleteIndex).not.toHaveBeenCalled()
  })

  it("retains the rollback generation when post-swap marker cleanup fails", async () => {
    const profile = {
      ...roProfile("full-sync-marker-cleanup-failure"),
      locale: "default",
      salesChannelIds: [],
      strict: false,
    } satisfies SearchProfile
    const query = {
      graph: vi.fn().mockResolvedValue({ data: [] }),
    } as unknown as Query
    const indexState = inMemoryIndexClient({
      [profile.indexes.product]: [{ id: "last_good_product" }],
    })
    vi.mocked(indexState.client.deleteDocuments).mockRejectedValueOnce(
      new Error("marker cleanup unavailable")
    )

    await expect(
      syncProfile({
        client: indexState.client,
        container: syncContainer(query) as never,
        logger: { info: vi.fn(), warn: vi.fn() } as never,
        mode: "full",
        profile,
      })
    ).resolves.toEqual({ deleted: 0, indexed: 0 })

    const retainedProductIndex = [...indexState.indexes.keys()].find((index) =>
      index.startsWith(`${profile.indexes.product}__build_`)
    )
    expect(retainedProductIndex).toBeDefined()
    expect(indexState.documentIds(retainedProductIndex as string)).toContain(
      "last_good_product"
    )
    expect(indexState.deleteIndex).not.toHaveBeenCalled()
  })

  it("cleans staged targets when a swap is rejected before commit", async () => {
    const profile = {
      ...roProfile("full-sync-pre-swap-failure"),
      locale: "default",
      salesChannelIds: [],
      strict: false,
    } satisfies SearchProfile
    const query = {
      graph: vi.fn().mockResolvedValue({ data: [] }),
    } as unknown as Query
    const indexState = inMemoryIndexClient({
      [profile.indexes.product]: [{ id: "last_good_product" }],
    })
    indexState.swapIndexPairs.mockRejectedValueOnce(
      new MeilisearchSwapIndexError("swap rejected before commit", {
        cause: new Error("HTTP 400"),
        definitelyNotCommitted: true,
      })
    )

    await expect(
      syncProfile({
        client: indexState.client,
        container: syncContainer(query) as never,
        logger: { info: vi.fn(), warn: vi.fn() } as never,
        mode: "full",
        profile,
      })
    ).rejects.toThrow("swap rejected before commit")

    expect(indexState.documentIds(profile.indexes.product)).toEqual([
      "last_good_product",
    ])
    expect(
      [...indexState.indexes.keys()].some((index) => index.includes("__build_"))
    ).toBe(false)
  })

  it("preserves staged targets when an accepted swap completes after a timeout", async () => {
    const profile = {
      ...roProfile("full-sync-accepted-timeout"),
      locale: "default",
      salesChannelIds: [],
      strict: false,
    } satisfies SearchProfile
    const query = {
      graph: vi.fn().mockResolvedValue({ data: [] }),
    } as unknown as Query
    const indexState = inMemoryIndexClient({
      [profile.indexes.product]: [{ id: "last_good_product" }],
    })
    let queuedPairs: { first: string; second: string }[] | undefined
    indexState.swapIndexPairs.mockImplementationOnce(async (pairs) => {
      queuedPairs = pairs
      throw new MeilisearchSwapIndexError("accepted swap timed out", {
        cause: new Error("task pending"),
        definitelyNotCommitted: false,
      })
    })

    await expect(
      syncProfile({
        client: indexState.client,
        container: syncContainer(query) as never,
        logger: { info: vi.fn(), warn: vi.fn() } as never,
        mode: "full",
        profile,
      })
    ).rejects.toThrow("accepted swap timed out")

    expect(queuedPairs).toBeDefined()
    expect(indexState.deleteIndex).not.toHaveBeenCalled()
    await indexState.swapIndexPairs(queuedPairs ?? [])

    const retainedProductIndex = [...indexState.indexes.keys()].find((index) =>
      index.startsWith(`${profile.indexes.product}__build_`)
    )
    expect(indexState.documentIds(profile.indexes.product)).toEqual([])
    expect(retainedProductIndex).toBeDefined()
    expect(indexState.documentIds(retainedProductIndex as string)).toContain(
      "last_good_product"
    )
  })

  it("supports bounded reverse-swap rollback followed by exact retained-generation GC", async () => {
    const active = {
      brand: "rollback_brand",
      category: "rollback_category",
      content: "rollback_content",
      product: "rollback_product",
    }
    const retained = Object.fromEntries(
      Object.entries(active).map(([kind, uid]) => [
        kind,
        `${uid}__build_generation-1`,
      ])
    ) as typeof active
    const indexState = inMemoryIndexClient({
      [active.product]: [{ id: "new_product", title: "New product" }],
      [retained.product]: [{ id: "old_product", title: "Old product" }],
    })

    await rollbackRetainedSearchGeneration(indexState.client, {
      active,
      retained,
    })

    expect(indexState.documentIds(active.product)).toEqual(["old_product"])
    expect(indexState.documentIds(retained.product)).toEqual(["new_product"])
    expect(indexState.swapIndexPairs).toHaveBeenCalledTimes(1)

    await acceptRetainedSearchGeneration(indexState.client, {
      active,
      retained,
    })

    expect(
      Object.values(retained).every((uid) => !indexState.indexes.has(uid))
    ).toBe(true)
  })

  it("does not reverse a completed rollback when delivery is duplicated", async () => {
    const active = {
      brand: "retry_brand",
      category: "retry_category",
      content: "retry_content",
      product: "retry_product",
    }
    const retained = Object.fromEntries(
      Object.entries(active).map(([kind, uid]) => [
        kind,
        `${uid}__build_generation-retry`,
      ])
    ) as typeof active
    const indexState = inMemoryIndexClient({
      [active.product]: [{ id: "rejected_product" }],
      [retained.product]: [{ id: "last_good_product" }],
    })
    await rollbackRetainedSearchGeneration(indexState.client, {
      active,
      retained,
    })
    await rollbackRetainedSearchGeneration(indexState.client, {
      active,
      retained,
    })

    expect(indexState.documentIds(active.product)).toEqual([
      "last_good_product",
    ])
    expect(indexState.swapIndexPairs).toHaveBeenCalledTimes(1)
  })

  it("rejects an unbound retained generation before swap or GC", async () => {
    const active = {
      brand: "invalid_brand",
      category: "invalid_category",
      content: "invalid_content",
      product: "invalid_product",
    }
    const retained = {
      brand: "other_brand",
      category: "other_category",
      content: "other_content",
      product: "other_product",
    }
    const indexState = inMemoryIndexClient()

    await expect(
      rollbackRetainedSearchGeneration(indexState.client, {
        active,
        retained,
      })
    ).rejects.toThrow("exact retained generation")
    await expect(
      acceptRetainedSearchGeneration(indexState.client, { active, retained })
    ).rejects.toThrow("exact retained generation")
    expect(indexState.swapIndexPairs).not.toHaveBeenCalled()
    expect(indexState.deleteIndex).not.toHaveBeenCalled()
  })

  it.each([
    ["sk", "sk-SK", "sk", "eur"],
    ["cz", "cs-CZ", "cz", "czk"],
    ["hu", "hu-HU", "hu", "huf"],
    ["ro", "ro-RO", "ro", "ron"],
  ] as const)("requires explicit %s publication and commerce authority", async (market, locale, country, currencyCode) => {
    const query = {
      graph: vi.fn().mockResolvedValue({ data: [] }),
    } as unknown as Query
    const profile = {
      ...roProfile(`herbatika-${market}`),
      locale,
      salesChannelIds: [`sc_${market}`],
    } satisfies SearchProfile
    const indexState = inMemoryIndexClient()
    const region = {
      countries: [{ iso_2: country }],
      currency_code: currencyCode,
      id: `reg_${market}`,
      metadata: {
        market_code: market,
        sales_channel_id: `sc_${market}`,
      },
    }

    await expect(
      syncProfile({
        client: indexState.client,
        container: syncContainer(
          query,
          vi.fn().mockResolvedValue([]),
          vi.fn().mockResolvedValue([]),
          [region]
        ) as never,
        logger: { info: vi.fn(), warn: vi.fn() } as never,
        mode: "normal",
        profile,
      })
    ).resolves.toEqual({ deleted: 0, indexed: 0 })

    expect(indexState.swapIndexPairs).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["sk", "sk-SK", "sk", "czk"],
    ["cz", "cs-CZ", "cz", "eur"],
    ["hu", "hu-HU", "hu", "ron"],
    ["ro", "ro-RO", "ro", "huf"],
  ] as const)("rejects a %s profile whose region violates its exact currency contract", async (market, locale, country, wrongCurrencyCode) => {
    const query = {
      graph: vi.fn().mockRejectedValue(new Error("catalog must not be read")),
    } as unknown as Query
    const profile = {
      ...roProfile(`herbatika-${market}-wrong-currency`),
      locale,
      salesChannelIds: [`sc_${market}`],
    } satisfies SearchProfile
    const indexState = inMemoryIndexClient()
    const region = {
      countries: [{ iso_2: country }],
      currency_code: wrongCurrencyCode,
      id: `reg_${market}`,
      metadata: {
        market_code: market,
        sales_channel_id: `sc_${market}`,
      },
    }

    await expect(
      syncProfile({
        client: indexState.client,
        container: syncContainer(
          query,
          vi.fn().mockResolvedValue([]),
          vi.fn().mockResolvedValue([]),
          [region]
        ) as never,
        logger: { info: vi.fn(), warn: vi.fn() } as never,
        mode: "normal",
        profile,
      })
    ).rejects.toThrow("cannot prove exact region, currency")

    expect(indexState.swapIndexPairs).not.toHaveBeenCalled()
    expect(query.graph).not.toHaveBeenCalled()
  })

  it("rejects an implicit Slovak profile without exact market scope", async () => {
    const query = {
      graph: vi.fn().mockResolvedValue({ data: [] }),
    } as unknown as Query
    const container = {
      resolve: vi.fn((key: unknown) => {
        if (key === ContainerRegistrationKeys.QUERY) {
          return query
        }
        if (key === ContainerRegistrationKeys.PG_CONNECTION) {
          return { raw: vi.fn().mockResolvedValue([[]]) }
        }
        throw new Error(`Unexpected container key: ${String(key)}`)
      }),
    }
    const ensureIndex = vi.fn().mockResolvedValue(undefined)
    const deleteIndex = vi.fn().mockResolvedValue(undefined)
    const swapIndexPairs = vi.fn().mockResolvedValue(undefined)
    const client = {
      deleteIndex,
      ensureIndex,
      getDocumentIds: vi.fn().mockResolvedValue([]),
      swapIndexPairs,
      updateSettings: vi.fn().mockResolvedValue(undefined),
    } as unknown as MeilisearchAdminClient
    const indexes = {
      brand: "active_sk_brand",
      category: "active_sk_category",
      content: "active_sk_content",
      product: "active_sk_product",
    }
    const profile = {
      availability: "all",
      domain: "sk.example.test",
      indexes,
      key: "herbatika-sk",
      limits: {
        autocomplete: { brand: 5, category: 5, content: 5, product: 5 },
        fullSearch: 20,
        page: 20,
        popular: 10,
      },
      locale: "sk-SK",
      minimumRankingScore: 0.55,
      salesChannelIds: [],
      separateVariantResults: false,
      shop: "herbatika",
      strict: false,
    } satisfies SearchProfile

    await expect(
      syncProfile({
        client,
        container: container as never,
        logger: { info: vi.fn(), warn: vi.fn() } as never,
        mode: "normal",
        profile,
      })
    ).rejects.toThrow("cannot prove exact publication")

    expect(ensureIndex).not.toHaveBeenCalled()
    expect(swapIndexPairs).not.toHaveBeenCalled()
    expect(deleteIndex).not.toHaveBeenCalled()
  })
})
