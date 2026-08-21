import { mkdtemp, readFile, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { MARKET_VARIANT_AUTHORITY_MODULE } from "../../../../src/modules/market-variant-authority"
import { SEARCH_INDEX_SETTINGS } from "../../../../src/modules/meilisearch/settings"
import { PAYLOAD_MODULE } from "../../../../src/modules/payload"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../../../../src/modules/storefront-url-assignment"
import {
  FOUR_MARKET_MEILI_MARKETS,
  type FourMarketMeiliProfile,
  parseFourMarketMeiliConvergenceCandidate,
  serializeFourMarketMeiliEvidence,
} from "../../../../src/scripts/market-meili-convergence"
import { parseFourMarketMeiliConvergenceCli } from "../../../../src/scripts/market-meili-convergence/cli"
import {
  ConfiguredFourMarketMeiliAuthorityReader,
  collectFourMarketMeiliConvergenceCandidate,
  type FourMarketMeiliAuthorityReader,
  type FourMarketMeiliProfileIds,
  writePrivateFourMarketMeiliCandidate,
} from "../../../../src/scripts/market-meili-convergence/collector"
import type { RoMeiliReadClient } from "../../../../src/scripts/ro-meili-convergence"

const temporaryPaths: string[] = []
const SHA_256 = /^[a-f0-9]{64}$/

afterEach(async () => {
  await Promise.all(
    temporaryPaths.splice(0).map(async (path) => {
      const { rm } = await import("node:fs/promises")
      await rm(path, { force: true, recursive: true })
    })
  )
})

const contract = {
  cz: { domain: "herbatica.cz", locale: "cs-cz" },
  hu: { domain: "herbatica.hu", locale: "hu-hu" },
  ro: { domain: "herbatica.ro", locale: "ro-ro" },
  sk: { domain: "herbatica.sk", locale: "sk-sk" },
} as const

const settings = (kind: keyof typeof SEARCH_INDEX_SETTINGS) => ({
  ...structuredClone(SEARCH_INDEX_SETTINGS[kind]),
  distinctAttribute: null,
  pagination: { maxTotalHits: 1000 },
  stopWords: [],
  synonyms: {},
})

const profiles = (): Record<
  (typeof FOUR_MARKET_MEILI_MARKETS)[number],
  FourMarketMeiliProfile
> =>
  Object.fromEntries(
    FOUR_MARKET_MEILI_MARKETS.map((market) => [
      market,
      {
        availability: "in-stock",
        domain: contract[market].domain,
        id: `profile_${market}`,
        indexes: {
          brand: `brand_${market}`,
          category: `category_${market}`,
          content: `content_${market}`,
          product: `product_${market}`,
        },
        key: `herbatika-${market}`,
        lastSyncError: null,
        lastSyncMode: "full",
        lastSyncStartedAt: "2026-08-21T09:00:00.000Z",
        lastSyncStatus: "succeeded",
        lastSyncedAt: "2026-08-21T09:01:00.000Z",
        limits: {
          autocomplete: { brand: 3, category: 3, content: 3, product: 6 },
          fullSearch: 500,
          page: 100,
          popular: 12,
        },
        locale: contract[market].locale,
        minimumRankingScore: 0.98,
        salesChannelIds: [`sc_${market}`],
        separateVariantResults: true,
        shop: `herbatika-${market}`,
        strict: true,
      },
    ])
  ) as Record<
    (typeof FOUR_MARKET_MEILI_MARKETS)[number],
    FourMarketMeiliProfile
  >

const documents = () =>
  Object.fromEntries(
    FOUR_MARKET_MEILI_MARKETS.flatMap((market) => [
      [
        `product_${market}`,
        [
          {
            id: `product_${market}_one`,
            search_product_id: `product_${market}_one`,
            search_result_kind: "product",
          },
          {
            id: `variant_product_${market}_one_variant_${market}_one`,
            search_product_id: `product_${market}_one`,
            search_result_kind: "variant",
            search_variant_id: `variant_${market}_one`,
          },
        ],
      ],
      [`category_${market}`, [{ id: `category_${market}_one` }]],
      [`brand_${market}`, [{ id: `brand_${market}_one` }]],
      [
        `content_${market}`,
        [
          {
            id: `page_content_${market}_one`,
            source_id: `content_${market}_one`,
            type: "page",
          },
        ],
      ],
    ])
  ) as Record<string, unknown[]>

const fullSyncTask = (market: (typeof FOUR_MARKET_MEILI_MARKETS)[number]) => {
  const active = ["product", "category", "brand", "content"].map(
    (kind) => `${kind}_${market}`
  )
  return {
    details: {
      swaps: active.map((uid) => ({ indexes: [uid, `${uid}__build_release`] })),
    },
    enqueuedAt: "2026-08-21T09:00:10.000Z",
    finishedAt: "2026-08-21T09:00:50.000Z",
    startedAt: "2026-08-21T09:00:20.000Z",
    status: "succeeded",
    type: "indexSwap",
    uid: 100 + FOUR_MARKET_MEILI_MARKETS.indexOf(market),
  }
}

const clientFixture = (
  options: { indexes?: string[]; tasks?: unknown[] } = {}
): RoMeiliReadClient => {
  const values = documents()
  const indexUids = options.indexes ?? Object.keys(values).sort()
  const tasks =
    options.tasks ??
    FOUR_MARKET_MEILI_MARKETS.map((market) => fullSyncTask(market))
  return {
    getDocuments: vi.fn(async (uid, { limit, offset }) =>
      (values[uid] ?? []).slice(offset, offset + limit)
    ),
    getSettings: vi.fn(async (uid) =>
      settings(uid.split("_", 1)[0] as keyof typeof SEARCH_INDEX_SETTINGS)
    ),
    listIndexes: vi.fn(async ({ limit, offset }) =>
      indexUids.slice(offset, offset + limit).map((uid) => ({ uid }))
    ),
    listTasks: vi.fn(async ({ from }) => ({
      next: null,
      results: from === undefined ? tasks : [],
    })),
  }
}

const authorityReader = (): FourMarketMeiliAuthorityReader => ({
  readMarketAuthority: vi.fn(async (market) => ({
    expectedIds: {
      brand: [`brand_${market}_one`],
      category: [`category_${market}_one`],
      content: [`page:content_${market}_one`],
      product: [`product_${market}_one`],
      variant: [`variant_${market}_one`],
    },
    sourceAuthoritySha256: market.charCodeAt(0).toString(16).padStart(64, "0"),
  })),
})

describe("four-market Meilisearch runtime collector", () => {
  it("derives exact market authority from Medusa variant, URL, and CMS sources", async () => {
    const listMarketVariantAuthorities = vi.fn(async () => [
      {
        authority_sha256: "a".repeat(64),
        availability: "sellable",
        market_code: "cz",
        product_id: "product_cz_one",
        source_version: "release-1",
        variant_id: "variant_cz_one",
      },
      {
        authority_sha256: "a".repeat(64),
        availability: "sellable",
        market_code: "cz",
        product_id: "product_cz_one",
        source_version: "release-1",
        variant_id: "variant_cz_one_b",
      },
      {
        authority_sha256: "a".repeat(64),
        availability: "unavailable",
        market_code: "cz",
        product_id: "product_cz_two",
        source_version: "release-1",
        variant_id: "variant_cz_two",
      },
    ])
    const listStorefrontUrlAssignments = vi.fn(
      async (filters: { entity_kind: "brand" | "category" }) => [
        {
          entity_id: `${filters.entity_kind}_cz_one`,
          entity_kind: filters.entity_kind,
          market_code: "cz",
          public_slug: `${filters.entity_kind}-one`,
          publication_status: "published",
          sales_channel_id: "sc_cz",
          source_version: 1,
        },
      ]
    )
    const container = {
      resolve(key: string) {
        if (key === MARKET_VARIANT_AUTHORITY_MODULE) {
          return { listMarketVariantAuthorities }
        }
        if (key === STOREFRONT_URL_ASSIGNMENT_MODULE) {
          return { listStorefrontUrlAssignments }
        }
        if (key === PAYLOAD_MODULE) {
          return {
            listPublishedArticles: vi.fn(async () => ({
              docs: [{ id: 101 }],
              hasNextPage: false,
            })),
            listPublishedPages: vi.fn(async () => ({
              docs: [{ id: "page_cz_one" }],
              hasNextPage: false,
            })),
          }
        }
        throw new Error(`unexpected key ${key}`)
      },
    }

    const authority = await new ConfiguredFourMarketMeiliAuthorityReader(
      container as never
    ).readMarketAuthority("cz", profiles().cz)

    expect(authority.expectedIds).toEqual({
      brand: ["brand_cz_one"],
      category: ["category_cz_one"],
      content: ["article:101", "page:page_cz_one"],
      product: ["product_cz_one"],
      variant: ["variant_cz_one", "variant_cz_one_b"],
    })
    expect(authority.sourceAuthoritySha256).toMatch(SHA_256)
  })

  it("fails closed when Payload CMS authority cannot be resolved", () => {
    const container = {
      resolve(key: string) {
        if (key === MARKET_VARIANT_AUTHORITY_MODULE) {
          return {}
        }
        if (key === STOREFRONT_URL_ASSIGNMENT_MODULE) {
          return {}
        }
        throw new Error("Payload unavailable")
      },
    }

    expect(
      () => new ConfiguredFourMarketMeiliAuthorityReader(container as never)
    ).toThrow("Payload unavailable")
  })

  it("collects a canonical parser-consumable four-profile candidate", async () => {
    const candidate = await collectFourMarketMeiliConvergenceCandidate({
      authorityReader: authorityReader(),
      client: clientFixture(),
      environmentId: "production-eu",
      now: () => new Date("2026-08-21T10:00:00.000Z"),
      profiles: profiles(),
      releaseId: "release-2026-08-21",
    })

    expect(candidate.targetedProfileIds).toEqual([
      "profile_cz",
      "profile_hu",
      "profile_ro",
      "profile_sk",
    ])
    expect(
      parseFourMarketMeiliConvergenceCandidate(
        serializeFourMarketMeiliEvidence(candidate)
      )
    ).toEqual(candidate)
    expect(candidate.markets.ro.convergence).toMatchObject({
      completionMarkerIds: [],
      failedTaskUids: [],
      fullSyncTask: { status: "succeeded", type: "indexSwap", uid: 102 },
      stagingIndexUids: [],
      unsettledTaskUids: [],
    })
    expect(candidate.markets.cz.indexes.product).toMatchObject({
      documentIds: ["product_cz_one", "variant_product_cz_one_variant_cz_one"],
      entityIds: ["product_cz_one"],
      variantIds: ["variant_cz_one"],
    })
  })

  it("rejects live IDs that differ from Medusa authority", async () => {
    const reader: FourMarketMeiliAuthorityReader = {
      readMarketAuthority: vi.fn(async (market) => ({
        expectedIds: {
          brand: [`brand_${market}_one`],
          category: [`category_${market}_one`],
          content: [`page:content_${market}_one`],
          product: [
            market === "hu" ? "product_hu_missing" : `product_${market}_one`,
          ],
          variant: [`variant_${market}_one`],
        },
        sourceAuthoritySha256: "a".repeat(64),
      })),
    }

    await expect(
      collectFourMarketMeiliConvergenceCandidate({
        authorityReader: reader,
        client: clientFixture(),
        environmentId: "production-eu",
        profiles: profiles(),
        releaseId: "release-2026-08-21",
      })
    ).rejects.toThrow(
      "hu product index IDs do not exactly match live authority"
    )
  })

  it.each([
    [
      "staging index residue",
      () =>
        clientFixture({
          indexes: [
            ...Object.keys(documents()),
            "product_ro__build_unfinished",
          ].sort(),
        }),
      "task, staging-index, or completion-marker residue",
    ],
    [
      "unsettled task residue",
      () =>
        clientFixture({
          tasks: [
            ...FOUR_MARKET_MEILI_MARKETS.map((market) => fullSyncTask(market)),
            {
              enqueuedAt: "2026-08-21T10:01:00.000Z",
              finishedAt: null,
              indexUid: "product_sk",
              startedAt: "2026-08-21T10:01:01.000Z",
              status: "processing",
              type: "documentAdditionOrUpdate",
              uid: 999,
            },
          ],
        }),
      "task, staging-index, or completion-marker residue",
    ],
  ])("rejects %s instead of writing a false candidate", async (_label, client, error) => {
    await expect(
      collectFourMarketMeiliConvergenceCandidate({
        authorityReader: authorityReader(),
        client: client(),
        environmentId: "production-eu",
        profiles: profiles(),
        releaseId: "release-2026-08-21",
      })
    ).rejects.toThrow(error)
  })

  it("rejects task state changes during collection", async () => {
    const client = clientFixture()
    const stableTasks = FOUR_MARKET_MEILI_MARKETS.map((market) =>
      fullSyncTask(market)
    )
    vi.mocked(client.listTasks)
      .mockResolvedValueOnce({ next: null, results: stableTasks })
      .mockResolvedValueOnce({
        next: null,
        results: [
          ...stableTasks,
          {
            enqueuedAt: "2026-08-21T10:01:00.000Z",
            finishedAt: null,
            indexUid: "product_cz",
            startedAt: null,
            status: "enqueued",
            type: "documentAdditionOrUpdate",
            uid: 999,
          },
        ],
      })

    await expect(
      collectFourMarketMeiliConvergenceCandidate({
        authorityReader: authorityReader(),
        client,
        environmentId: "production-eu",
        profiles: profiles(),
        releaseId: "release-2026-08-21",
      })
    ).rejects.toThrow("task state changed during evidence collection")
  })

  it("rejects a structurally valid swap outside the profile sync interval", async () => {
    const tasks = FOUR_MARKET_MEILI_MARKETS.map((market) =>
      market === "cz"
        ? {
            ...fullSyncTask(market),
            enqueuedAt: "2026-08-20T09:00:10.000Z",
            finishedAt: "2026-08-20T09:00:50.000Z",
            startedAt: "2026-08-20T09:00:20.000Z",
          }
        : fullSyncTask(market)
    )

    await expect(
      collectFourMarketMeiliConvergenceCandidate({
        authorityReader: authorityReader(),
        client: clientFixture({ tasks }),
        environmentId: "production-eu",
        profiles: profiles(),
        releaseId: "release-2026-08-21",
      })
    ).rejects.toThrow("cz has no succeeded exact four-index full-sync task")
  })

  it("writes a private canonical candidate and never clobbers", async () => {
    const directory = await mkdtemp(join(tmpdir(), "market-meili-collector-"))
    temporaryPaths.push(directory)
    const output = join(directory, "candidate.json")
    const candidate = await collectFourMarketMeiliConvergenceCandidate({
      authorityReader: authorityReader(),
      client: clientFixture(),
      environmentId: "production-eu",
      profiles: profiles(),
      releaseId: "release-2026-08-21",
    })

    await writePrivateFourMarketMeiliCandidate(output, candidate)
    expect((await stat(output)).mode % 0o1000).toBe(0o600)
    expect(
      parseFourMarketMeiliConvergenceCandidate(await readFile(output, "utf8"))
    ).toEqual(candidate)
    await expect(
      writePrivateFourMarketMeiliCandidate(output, candidate)
    ).rejects.toMatchObject({ code: "EEXIST" })
  })
})

describe("four-market Meilisearch collector CLI", () => {
  it("requires exact profile, release, environment, and absolute output bindings", () => {
    const profileIds: FourMarketMeiliProfileIds = {
      cz: "profile_cz",
      hu: "profile_hu",
      ro: "profile_ro",
      sk: "profile_sk",
    }
    const parsed = parseFourMarketMeiliConvergenceCli([
      "--expected-release-id",
      "release-1",
      "--sk-profile-id",
      profileIds.sk,
      "--output",
      "/private/evidence/candidate.json",
      "--cz-profile-id",
      profileIds.cz,
      "--expected-environment-id",
      "production-eu",
      "--ro-profile-id",
      profileIds.ro,
      "--hu-profile-id",
      profileIds.hu,
    ])

    expect(parsed).toEqual({
      environmentId: "production-eu",
      outputPath: "/private/evidence/candidate.json",
      profileIds,
      releaseId: "release-1",
    })
    expect(() =>
      parseFourMarketMeiliConvergenceCli(["--output", "candidate.json"])
    ).toThrow("flags must be exactly")
    expect(() =>
      parseFourMarketMeiliConvergenceCli(["--apply", "true"])
    ).toThrow("exact --name value pairs")
  })
})
