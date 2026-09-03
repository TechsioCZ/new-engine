import { describe, expect, it } from "vitest"
import { SEARCH_INDEX_SETTINGS } from "../../../../src/modules/meilisearch/settings"
import {
  buildFourMarketMeiliConvergenceProof,
  FOUR_MARKET_MEILI_MARKETS,
  hashFourMarketMeiliArtifact,
  hashFourMarketMeiliValue,
  parseFourMarketMeiliConvergenceCandidate,
  parseFourMarketMeiliConvergenceProof,
  serializeFourMarketMeiliEvidence,
} from "../../../../src/scripts/market-meili-convergence"

const SHA_256 = /^[a-f0-9]{64}$/

const marketContract = {
  cz: {
    currencyCode: "czk",
    domain: "herbatica.cz",
    locale: "cs-CZ",
    profileLocale: "cs-cz",
  },
  hu: {
    currencyCode: "huf",
    domain: "herbatica.hu",
    locale: "hu-HU",
    profileLocale: "hu-hu",
  },
  ro: {
    currencyCode: "ron",
    domain: "herbatica.ro",
    locale: "ro-RO",
    profileLocale: "ro-ro",
  },
  sk: {
    currencyCode: "eur",
    domain: "herbatica.sk",
    locale: "sk-SK",
    profileLocale: "sk-sk",
  },
} as const

const expectedSettings = (kind: keyof typeof SEARCH_INDEX_SETTINGS) => ({
  ...structuredClone(SEARCH_INDEX_SETTINGS[kind]),
  distinctAttribute: null,
  pagination: { maxTotalHits: 1000 },
  stopWords: [],
  synonyms: {},
})

const candidateFixture = () => {
  const markets = Object.fromEntries(
    FOUR_MARKET_MEILI_MARKETS.map((market, marketIndex) => {
      const contract = marketContract[market]
      const expectedIds = {
        brand: [`brand_${market}`],
        category: [`category_${market}`],
        content: market === "ro" ? [] : [`content_${market}`],
        product: [`product_${market}`],
        variant: [`variant_${market}`],
      }
      const expectedDocumentIds = Object.fromEntries(
        (["product", "category", "brand", "content"] as const).map((kind) => {
          const entityKind = kind === "product" ? "product" : kind
          const entityIds = expectedIds[entityKind]
          const variantIds = kind === "product" ? expectedIds.variant : []
          return [
            kind,
            [
              ...entityIds.map((id) => `document_${id}`),
              ...variantIds.map((id) => `document_${id}`),
            ].sort(),
          ]
        })
      )
      const indexes = Object.fromEntries(
        (["product", "category", "brand", "content"] as const).map((kind) => {
          const entityKind = kind === "product" ? "product" : kind
          const entityIds = [...expectedIds[entityKind]]
          const variantIds = kind === "product" ? [...expectedIds.variant] : []
          const documentIds = expectedDocumentIds[kind]
          return [
            kind,
            {
              documentIds,
              entityIds,
              settings: expectedSettings(kind),
              uid: `${kind}_${market}`,
              variantIds,
            },
          ]
        })
      )
      const profileIndexes = Object.fromEntries(
        Object.entries(indexes).map(([kind, value]) => [kind, value.uid])
      )
      return [
        market,
        {
          authority: {
            expectedDocumentIds,
            expectedIds,
            projectionSha256: hashFourMarketMeiliValue(`projection-${market}`),
            sourceAuthoritySha256: hashFourMarketMeiliValue(
              `authority-${market}`
            ),
          },
          convergence: {
            completionMarkerIds: [],
            failedTaskUids: [],
            fullSyncTask: {
              indexUids: Object.values(profileIndexes).sort(),
              status: "succeeded",
              type: "indexSwap",
              uid: marketIndex + 101,
            },
            stagingIndexUids: [],
            unsettledTaskUids: [],
          },
          currencyCode: contract.currencyCode,
          environmentId: "production-eu",
          indexes,
          locale: contract.locale,
          market,
          profile: {
            availability: "in-stock",
            domain: contract.domain,
            id: `profile_${market}`,
            indexes: profileIndexes,
            key: `herbatika-${market}`,
            lastSyncError: null,
            lastSyncMode: "full",
            lastSyncStartedAt: "2026-08-21T10:00:00.000Z",
            lastSyncStatus: "succeeded",
            lastSyncedAt: "2026-08-21T10:01:00.000Z",
            limits: {
              autocomplete: { brand: 3, category: 3, content: 3, product: 6 },
              fullSearch: 500,
              page: 100,
              popular: 12,
            },
            locale: contract.profileLocale,
            minimumRankingScore: 0.98,
            salesChannelIds: [`sc_${market}`],
            separateVariantResults: true,
            shop: `herbatika-${market}`,
            strict: true,
          },
          releaseId: "release-2026-08-21",
        },
      ]
    })
  )

  return {
    environmentId: "production-eu",
    generatedAt: "2026-08-21T10:02:00.000Z",
    kind: "herbatika-four-market-meilisearch-convergence-candidate",
    markets,
    releaseId: "release-2026-08-21",
    schemaVersion: 1,
    targetedProfileIds: FOUR_MARKET_MEILI_MARKETS.map(
      (market) => `profile_${market}`
    ).sort(),
  }
}

describe("four-market Meilisearch convergence proof", () => {
  it("builds and parses an exact four-profile, sixteen-index proof", () => {
    const proof = buildFourMarketMeiliConvergenceProof(candidateFixture())
    const contents = serializeFourMarketMeiliEvidence(proof)

    expect(proof).toMatchObject({
      aggregate: {
        indexUidCount: 16,
        profileCount: 4,
        sharedIndexUidCount: 0,
        state: "converged",
        targetedProfileCount: 4,
      },
      environmentId: "production-eu",
      kind: "herbatika-four-market-meilisearch-convergence-proof",
      releaseId: "release-2026-08-21",
      schemaVersion: 1,
    })
    expect(Object.keys(proof.markets)).toEqual(FOUR_MARKET_MEILI_MARKETS)
    expect(parseFourMarketMeiliConvergenceProof(contents)).toEqual(proof)
    expect(hashFourMarketMeiliArtifact(contents)).toMatch(SHA_256)
  })

  it.each([
    [
      "currency",
      (candidate: ReturnType<typeof candidateFixture>) => {
        candidate.markets.cz.currencyCode = "eur" as never
      },
      "market, locale, or currency binding",
    ],
    [
      "locale",
      (candidate: ReturnType<typeof candidateFixture>) => {
        candidate.markets.hu.locale = "sk-SK" as never
      },
      "market, locale, or currency binding",
    ],
    [
      "profile locale",
      (candidate: ReturnType<typeof candidateFixture>) => {
        candidate.markets.ro.profile.locale = "sk-sk"
      },
      "strict, exact-locale, and fully synchronized",
    ],
    [
      "swapped canonical hostname",
      (candidate: ReturnType<typeof candidateFixture>) => {
        candidate.markets.cz.profile.domain = "herbatica.sk"
      },
      "canonical market hostname",
    ],
    [
      "malformed canonical hostname",
      (candidate: ReturnType<typeof candidateFixture>) => {
        candidate.markets.hu.profile.domain = "not-a-hostname"
      },
      "canonical market hostname",
    ],
    [
      "source authority hash",
      (candidate: ReturnType<typeof candidateFixture>) => {
        candidate.markets.sk.authority.sourceAuthoritySha256 = "not-a-hash"
      },
      "lowercase SHA-256",
    ],
    [
      "projection hash",
      (candidate: ReturnType<typeof candidateFixture>) => {
        candidate.markets.sk.authority.projectionSha256 = "A".repeat(64)
      },
      "lowercase SHA-256",
    ],
    [
      "environment",
      (candidate: ReturnType<typeof candidateFixture>) => {
        candidate.markets.cz.environmentId = "other"
      },
      "environmentId or releaseId",
    ],
    [
      "release",
      (candidate: ReturnType<typeof candidateFixture>) => {
        candidate.markets.hu.releaseId = "other"
      },
      "environmentId or releaseId",
    ],
    [
      "non-full sync",
      (candidate: ReturnType<typeof candidateFixture>) => {
        candidate.markets.ro.profile.lastSyncMode = "normal" as never
      },
      "fully synchronized",
    ],
  ])("rejects a wrong %s binding", (_label, mutate, message) => {
    const candidate = candidateFixture()
    mutate(candidate)
    expect(() => buildFourMarketMeiliConvergenceProof(candidate)).toThrow(
      message
    )
  })

  it("requires the exact nonzero targeted profile set", () => {
    const candidate = candidateFixture()
    candidate.targetedProfileIds.pop()
    expect(() => buildFourMarketMeiliConvergenceProof(candidate)).toThrow(
      "exactly 4 entries"
    )

    const wrong = candidateFixture()
    wrong.targetedProfileIds[0] = "profile_other"
    wrong.targetedProfileIds.sort()
    expect(() => buildFourMarketMeiliConvergenceProof(wrong)).toThrow(
      "exactly equal the four market profiles"
    )
  })

  it("requires exactly sixteen globally distinct active index UIDs", () => {
    const candidate = candidateFixture()
    const duplicate = candidate.markets.cz.profile.indexes.product
    candidate.markets.hu.profile.indexes.product = duplicate
    candidate.markets.hu.indexes.product.uid = duplicate
    candidate.markets.hu.convergence.fullSyncTask.indexUids = Object.values(
      candidate.markets.hu.profile.indexes
    ).sort()

    expect(() => buildFourMarketMeiliConvergenceProof(candidate)).toThrow(
      "sixteen distinct index UIDs"
    )
  })

  it.each([
    "brand",
    "category",
    "content",
    "product",
    "variant",
  ] as const)("rejects a %s authority/projected-ID mismatch", (kind) => {
    const candidate = candidateFixture()
    const target =
      kind === "variant"
        ? candidate.markets.cz.indexes.product.variantIds
        : candidate.markets.cz.indexes[kind === "product" ? "product" : kind]
            .entityIds
    target.push(`unexpected_${kind}`)
    target.sort()
    expect(() => buildFourMarketMeiliConvergenceProof(candidate)).toThrow(
      "projected IDs do not exactly match authority IDs"
    )
  })

  it("rejects arbitrary same-cardinality document IDs", () => {
    const candidate = candidateFixture()
    candidate.markets.cz.indexes.product.documentIds = [
      "arbitrary_document_1",
      "arbitrary_document_2",
    ]

    expect(() => buildFourMarketMeiliConvergenceProof(candidate)).toThrow(
      "documentIds must exactly match authority"
    )
  })

  it("rejects search settings drift even when the evidence is self-consistent", () => {
    const candidate = candidateFixture()
    candidate.markets.sk.indexes.product.settings.searchableAttributes = [
      "drifted",
    ]
    expect(() => buildFourMarketMeiliConvergenceProof(candidate)).toThrow(
      "settings drifted from the search contract"
    )
  })

  it.each([
    ["failed task", "failedTaskUids", [999]],
    ["unsettled task", "unsettledTaskUids", [999]],
    ["staging index", "stagingIndexUids", ["product_ro__build_left"]],
    ["completion marker", "completionMarkerIds", ["search_build_marker_left"]],
  ] as const)("rejects %s residue", (_label, field, residue) => {
    const candidate = candidateFixture()
    candidate.markets.ro.convergence[field] = [...residue] as never
    expect(() => buildFourMarketMeiliConvergenceProof(candidate)).toThrow(
      "residue"
    )
  })

  it("requires one succeeded task targeting the exact four active UIDs", () => {
    const candidate = candidateFixture()
    candidate.markets.cz.convergence.fullSyncTask.indexUids = [
      ...candidate.markets.cz.convergence.fullSyncTask.indexUids.slice(1),
      "other_uid",
    ].sort()
    expect(() => buildFourMarketMeiliConvergenceProof(candidate)).toThrow(
      "one succeeded exact four-index full-sync task"
    )
  })

  it("parses only canonical candidates and rejects proof digest tampering", () => {
    const candidate = candidateFixture()
    const candidateContents = serializeFourMarketMeiliEvidence(candidate)
    expect(parseFourMarketMeiliConvergenceCandidate(candidateContents)).toEqual(
      candidate
    )
    expect(() =>
      parseFourMarketMeiliConvergenceCandidate(
        JSON.stringify(candidate, null, 2)
      )
    ).toThrow("canonical JSON with LF")

    const proof = buildFourMarketMeiliConvergenceProof(candidate)
    proof.aggregate.profileIdsSha256 = hashFourMarketMeiliValue("tampered")
    expect(() =>
      parseFourMarketMeiliConvergenceProof(
        serializeFourMarketMeiliEvidence(proof)
      )
    ).toThrow("derived hashes or aggregate invariants")
  })
})
