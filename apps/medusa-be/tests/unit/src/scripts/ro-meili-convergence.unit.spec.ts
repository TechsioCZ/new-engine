import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"
import { SEARCH_INDEX_SETTINGS } from "../../../../src/modules/meilisearch/settings"
import {
  assembleRoMeiliConvergenceProof,
  assertRoMeiliEnvironmentBinding,
  assertRoMeiliPriceAuthorityBinding,
  ConfiguredRoMeiliReadClient,
  hashRoMeiliValue,
  parseRoMeiliAuthority,
  RO_MEILI_COUNTS,
  type RoMeiliAuthority,
  type RoMeiliConvergenceSnapshot,
  type RoMeiliIndexSnapshot,
  serializeRoMeiliEvidence,
  writePrivateRoMeiliEvidence,
} from "../../../../src/scripts/ro-meili-convergence"

const sha = (label: string) => hashRoMeiliValue(label)
const ids = (prefix: string, count: number) =>
  Array.from(
    { length: count },
    (_, index) => `${prefix}_${String(index).padStart(4, "0")}`
  )

const authorityValue = (): RoMeiliAuthority => {
  const approvedVariantIds = ids("variant", RO_MEILI_COUNTS.approvedVariant)
  const productIds = ids("product", RO_MEILI_COUNTS.product)
  const approvedVariantPrices = approvedVariantIds.map((variantId, index) => ({
    amount: index + 100,
    productId: productIds[index] as string,
    variantId,
  }))
  return {
    approvedVariantIds,
    approvedVariantPrices,
    brandIds: ids("brand", RO_MEILI_COUNTS.brand),
    catalogScopeSha256: sha("catalog-scope"),
    categoryIds: ids("category", RO_MEILI_COUNTS.category),
    environmentId: "production-ro",
    kind: "herbatika-ro-meilisearch-authority",
    market: "ro",
    marketAuthoritySha256: sha("market-authority"),
    productIds,
    releaseId: "release-ro-2026-08-20",
    ronPriceProjectionSha256: hashRoMeiliValue(approvedVariantPrices),
    roOrigin: "https://ro.herbatica.example",
    salesChannelId: "sc_ro",
    schemaVersion: 1,
    unavailableVariantIds: ids("unavailable", 29),
  }
}

const authority = () =>
  parseRoMeiliAuthority(serializeRoMeiliEvidence(authorityValue()))

const indexSnapshot = (
  uid: string,
  documents: Record<string, unknown>[],
  kind: keyof typeof SEARCH_INDEX_SETTINGS
): RoMeiliIndexSnapshot => {
  const settings = {
    ...structuredClone(SEARCH_INDEX_SETTINGS[kind]),
    distinctAttribute: null,
    pagination: { maxTotalHits: Math.max(1000, documents.length) },
    stopWords: [],
    synonyms: {},
  }
  return {
    documents: documents as never,
    documentsSha256: hashRoMeiliValue(documents),
    settings,
    settingsSha256: hashRoMeiliValue(settings),
    uid,
  }
}

const roUids = {
  brand: "ro_brand",
  category: "ro_category",
  content: "ro_content",
  product: "ro_product",
} as const

const skUids = {
  brand: "sk_brand",
  category: "sk_category",
  content: "sk_content",
  product: "sk_product",
} as const

const snapshotFixture = (phase: "post" | "pre"): RoMeiliConvergenceSnapshot => {
  const source = authority()
  const productDocuments = source.productIds.flatMap((productId, index) => {
    const variantId = source.approvedVariantIds[index] as string
    const variant = {
      id: variantId,
      prices: [{ amount: index + 100, currency_code: "ron" }],
    }
    return [
      {
        id: productId,
        search_product_id: productId,
        search_result_kind: "product",
        variants: [variant],
      },
      {
        id: `variant_document_${String(index).padStart(4, "0")}`,
        search_product_id: productId,
        search_result_kind: "variant",
        search_variant_id: variantId,
        variants: [variant],
      },
    ]
  })
  const syncFields =
    phase === "post"
      ? {
          lastSyncError: null,
          lastSyncMode: "full" as const,
          lastSyncStartedAt: "2026-08-20T00:01:00.000Z",
          lastSyncStatus: "succeeded" as const,
          lastSyncedAt: "2026-08-20T00:02:00.000Z",
        }
      : {
          lastSyncError: null,
          lastSyncMode: null,
          lastSyncStartedAt: null,
          lastSyncStatus: "never" as const,
          lastSyncedAt: null,
        }
  const roProfile = {
    domain: "ro.herbatica.example",
    id: "profile_ro",
    indexes: roUids,
    key: "ro-production",
    locale: "ro-ro",
    salesChannelIds: ["sc_ro"],
    shop: "herbatika-ro",
    strict: true,
    ...syncFields,
  }
  const skProfile = {
    domain: "sk.herbatica.example",
    id: "profile_sk",
    indexes: skUids,
    key: "sk-production",
    lastSyncError: null,
    lastSyncMode: "full" as const,
    lastSyncStartedAt: "2026-08-19T00:01:00.000Z",
    lastSyncStatus: "succeeded" as const,
    lastSyncedAt: "2026-08-19T00:02:00.000Z",
    locale: "sk-sk",
    salesChannelIds: ["sc_sk"],
    shop: "herbatika-sk",
    strict: true,
  }
  const roIndexes = {
    brand: indexSnapshot(
      roUids.brand,
      source.brandIds.map((id) => ({ id })),
      "brand"
    ),
    category: indexSnapshot(
      roUids.category,
      source.categoryIds.map((id) => ({ id })),
      "category"
    ),
    content: indexSnapshot(roUids.content, [], "content"),
    product: indexSnapshot(roUids.product, productDocuments, "product"),
  }
  const skIndexes = {
    brand: indexSnapshot(skUids.brand, [{ id: "sk_brand_1" }], "brand"),
    category: indexSnapshot(
      skUids.category,
      [{ id: "sk_category_1" }],
      "category"
    ),
    content: indexSnapshot(skUids.content, [{ id: "sk_content_1" }], "content"),
    product: indexSnapshot(skUids.product, [{ id: "sk_product_1" }], "product"),
  }
  const swapTask = {
    details: {
      swaps: Object.values(roUids).map((uid) => ({
        indexes: [uid, `${uid}__build_release-1`],
      })),
    },
    indexUids: Object.values(roUids).flatMap((uid) => [
      uid,
      `${uid}__build_release-1`,
    ]),
    status: "succeeded",
    type: "indexSwap",
    uid: 11,
  }
  return {
    authority: source,
    cluster: {
      completionMarkerIds: [],
      indexUids: [...Object.values(roUids), ...Object.values(skUids)],
      maxTaskUid: phase === "pre" ? 10 : 11,
      stagingIndexUids: [],
      tasks: phase === "pre" ? [] : [swapTask],
    },
    generatedAt:
      phase === "pre" ? "2026-08-20T00:00:00.000Z" : "2026-08-20T00:03:00.000Z",
    indexes: { ro: roIndexes, sk: skIndexes },
    kind: "herbatika-ro-meilisearch-convergence-snapshot",
    phase,
    roProfile,
    schemaVersion: 1,
    skProfile,
  }
}

const mutable = (snapshot: RoMeiliConvergenceSnapshot) =>
  structuredClone(snapshot) as RoMeiliConvergenceSnapshot

const rehash = (
  snapshot: RoMeiliConvergenceSnapshot,
  side: "ro" | "sk",
  kind: keyof typeof roUids
) => {
  const target = snapshot.indexes[side][kind] as {
    documents: readonly Record<string, unknown>[]
    documentsSha256: string
  }
  target.documentsSha256 = hashRoMeiliValue(target.documents)
}

const rehashSettings = (
  snapshot: RoMeiliConvergenceSnapshot,
  kind: keyof typeof roUids
) => {
  const target = snapshot.indexes.ro[kind] as {
    settings: Readonly<Record<string, unknown>>
    settingsSha256: string
  }
  target.settingsSha256 = hashRoMeiliValue(target.settings)
}

describe("RO Meilisearch convergence evidence", () => {
  it("assembles the exact cutover gate schema from a successful fixture", () => {
    const proof = assembleRoMeiliConvergenceProof(
      snapshotFixture("pre"),
      snapshotFixture("post")
    )

    expect(Object.keys(proof).sort()).toEqual(
      [
        "atomicSwap",
        "catalogScopeSha256",
        "environmentId",
        "generatedAt",
        "indexes",
        "isolation",
        "kind",
        "locale",
        "market",
        "marketAuthoritySha256",
        "profile",
        "releaseId",
        "ronPriceProjectionSha256",
        "schemaVersion",
        "scope",
        "skPreservation",
      ].sort()
    )
    expect(proof).toMatchObject({
      atomicSwap: {
        completionMarkerCount: 0,
        failedTaskCount: 0,
        stagingIndexesRemaining: 0,
        unsettledTaskCount: 0,
      },
      environmentId: "production-ro",
      kind: "herbatika-ro-meilisearch-convergence-proof",
      marketAuthoritySha256: sha("market-authority"),
      profile: {
        lastSyncMode: "full",
        lastSyncStatus: "succeeded",
        strict: true,
      },
      scope: {
        brandEntityCount: 103,
        categoryEntityCount: 207,
        productEntityCount: 2002,
      },
      ronPriceProjectionSha256: authority().ronPriceProjectionSha256,
    })
    expect(proof.skPreservation.beforeSha256).toBe(
      proof.skPreservation.afterSha256
    )
    expect(proof.indexes.product.documentCount).toBe(4004)
    expect(proof.ronPriceProjectionSha256).toBe(
      hashRoMeiliValue(authority().approvedVariantPrices)
    )
  })

  it.each([
    [
      "authority binding",
      (post: RoMeiliConvergenceSnapshot) => {
        ;(post.authority as { environmentId: string }).environmentId = "other"
      },
      "authority binding changed",
    ],
    [
      "SK semantic state",
      (post: RoMeiliConvergenceSnapshot) => {
        ;(post.indexes.sk.product.documents as Record<string, unknown>[])[0] = {
          id: "changed",
        }
        rehash(post, "sk", "product")
      },
      "SK settings or documents changed",
    ],
    [
      "missing swap",
      (post: RoMeiliConvergenceSnapshot) => {
        ;(post.cluster.tasks as unknown[]) = []
      },
      "exactly one succeeded",
    ],
    [
      "duplicate swap",
      (post: RoMeiliConvergenceSnapshot) => {
        const duplicate = structuredClone(post.cluster.tasks[0]) as {
          uid: number
        }
        duplicate.uid = 12
        ;(post.cluster.tasks as unknown[]).push(duplicate)
      },
      "exactly one succeeded",
    ],
    [
      "staging residue",
      (post: RoMeiliConvergenceSnapshot) => {
        ;(post.cluster.stagingIndexUids as string[]).push(
          "ro_product__build_left"
        )
      },
      "residue remains",
    ],
    [
      "completion marker",
      (post: RoMeiliConvergenceSnapshot) => {
        ;(post.cluster.completionMarkerIds as string[]).push(
          "search_build_marker_left"
        )
      },
      "residue remains",
    ],
    [
      "failed task",
      (post: RoMeiliConvergenceSnapshot) => {
        ;(post.cluster.tasks as unknown[]).push({
          details: {},
          indexUids: [roUids.product],
          status: "failed",
          type: "documentAdditionOrUpdate",
          uid: 12,
        })
      },
      "residue remains",
    ],
    [
      "unsettled task",
      (post: RoMeiliConvergenceSnapshot) => {
        ;(post.cluster.tasks as unknown[]).push({
          details: {},
          indexUids: [roUids.product],
          status: "processing",
          type: "documentAdditionOrUpdate",
          uid: 12,
        })
      },
      "residue remains",
    ],
    [
      "non-full profile",
      (post: RoMeiliConvergenceSnapshot) => {
        ;(post.roProfile as { lastSyncMode: string }).lastSyncMode = "normal"
      },
      "completed RO full sync",
    ],
  ])("rejects %s mismatch", (_label, change, message) => {
    const post = mutable(snapshotFixture("post"))
    change(post)
    expect(() =>
      assembleRoMeiliConvergenceProof(snapshotFixture("pre"), post)
    ).toThrow(message)
  })

  it.each([
    [
      "brand",
      (post: RoMeiliConvergenceSnapshot) => {
        ;(post.indexes.ro.brand.documents as Record<string, unknown>[])[0] = {
          id: "brand_extra",
        }
        rehash(post, "ro", "brand")
      },
      "brand index",
    ],
    [
      "category",
      (post: RoMeiliConvergenceSnapshot) => {
        ;(post.indexes.ro.category.documents as Record<string, unknown>[]).pop()
        rehash(post, "ro", "category")
      },
      "category index",
    ],
    [
      "product",
      (post: RoMeiliConvergenceSnapshot) => {
        const document = (
          post.indexes.ro.product.documents as Record<string, unknown>[]
        )[0]
        document.search_product_id = "product_extra"
        rehash(post, "ro", "product")
      },
      "authority product IDs",
    ],
    [
      "approved variant",
      (post: RoMeiliConvergenceSnapshot) => {
        const documents = post.indexes.ro.product.documents as Record<
          string,
          unknown
        >[]
        const variantDocument = documents.find(
          (document) => document.search_variant_id
        )
        const duplicateVariantId = post.authority.approvedVariantIds[1]
        if (variantDocument && duplicateVariantId) {
          variantDocument.search_variant_id = duplicateVariantId
          const nested = variantDocument.variants as Array<{ id: string }>
          if (nested[0]) {
            nested[0].id = duplicateVariantId
          }
        }
        rehash(post, "ro", "product")
      },
      "authoritative approved variant",
    ],
    [
      "RON projection",
      (post: RoMeiliConvergenceSnapshot) => {
        const document = (
          post.indexes.ro.product.documents as Record<string, unknown>[]
        )[0]
        const variants = document.variants as Array<{
          prices: Array<{ currency_code: string }>
        }>
        const firstVariant = variants[0]
        const firstPrice = firstVariant?.prices[0]
        if (firstPrice) {
          firstPrice.currency_code = "eur"
        }
        rehash(post, "ro", "product")
      },
      "exactly one RON price",
    ],
    [
      "unavailable ID",
      (post: RoMeiliConvergenceSnapshot) => {
        const document = (
          post.indexes.ro.product.documents as Record<string, unknown>[]
        )[0]
        document.leaked_variant_id = post.authority.unavailableVariantIds[0]
        rehash(post, "ro", "product")
      },
      "contains an unavailable ID",
    ],
    [
      "duplicate product document ID",
      (post: RoMeiliConvergenceSnapshot) => {
        const documents = post.indexes.ro.product.documents as Record<
          string,
          unknown
        >[]
        const first = documents[0]
        const second = documents[1]
        if (first && second) {
          second.id = first.id
        }
        rehash(post, "ro", "product")
      },
      "document IDs must be globally unique",
    ],
    [
      "junk result kind",
      (post: RoMeiliConvergenceSnapshot) => {
        const documents = post.indexes.ro.product.documents as Record<
          string,
          unknown
        >[]
        const first = documents[0]
        if (first) {
          first.search_result_kind = "junk"
        }
        rehash(post, "ro", "product")
      },
      "invalid search_result_kind",
    ],
    [
      "misbound nested variant",
      (post: RoMeiliConvergenceSnapshot) => {
        const documents = post.indexes.ro.product.documents as Record<
          string,
          unknown
        >[]
        const variantDocument = documents.find(
          (document) => document.search_result_kind === "variant"
        )
        const nested = variantDocument?.variants as
          | Array<{ id: string }>
          | undefined
        if (nested?.[0]) {
          nested[0].id = "variant_misbound"
        }
        rehash(post, "ro", "product")
      },
      "nested variant matching search_variant_id",
    ],
    [
      "product/variant document count",
      (post: RoMeiliConvergenceSnapshot) => {
        ;(post.indexes.ro.product.documents as Record<string, unknown>[]).pop()
        rehash(post, "ro", "product")
      },
      "exactly 2002 product and 2002 variant documents",
    ],
    [
      "variant/product authority pairing",
      (post: RoMeiliConvergenceSnapshot) => {
        const documents = post.indexes.ro.product.documents as Record<
          string,
          unknown
        >[]
        const variantDocument = documents.find(
          (document) => document.search_result_kind === "variant"
        )
        if (variantDocument) {
          variantDocument.search_product_id = post.authority.productIds[1]
        }
        rehash(post, "ro", "product")
      },
      "not paired one-to-one with its authoritative product document",
    ],
    [
      "nonempty content release scope",
      (post: RoMeiliConvergenceSnapshot) => {
        ;(post.indexes.ro.content.documents as Record<string, unknown>[]).push({
          id: "page_unexpected",
        })
        rehash(post, "ro", "content")
      },
      "content index must contain zero documents",
    ],
  ])("rejects exact-set/projection mismatch: %s", (_label, change, message) => {
    const post = mutable(snapshotFixture("post"))
    change(post)
    expect(() =>
      assembleRoMeiliConvergenceProof(snapshotFixture("pre"), post)
    ).toThrow(message)
  })

  it.each([
    ["wrong", 999_999],
    ["negative", -1],
    ["null", null],
  ])("rejects a %s nested authoritative RON amount", (_label, amount) => {
    const post = mutable(snapshotFixture("post"))
    const documents = post.indexes.ro.product.documents as Record<
      string,
      unknown
    >[]
    for (const document of documents.slice(0, 2)) {
      const variants = document.variants as Array<{
        prices: Array<{ amount: number | null }>
      }>
      const price = variants[0]?.prices[0]
      if (price) {
        price.amount = amount
      }
    }
    rehash(post, "ro", "product")
    expect(() =>
      assembleRoMeiliConvergenceProof(snapshotFixture("pre"), post)
    ).toThrow("exact authoritative RON amount")
  })

  it.each([
    "filterableAttributes",
    "rankingRules",
    "searchableAttributes",
    "stopWords",
  ])("rejects authoritative product setting drift in %s", (field) => {
    const post = mutable(snapshotFixture("post"))
    const settings = post.indexes.ro.product.settings as Record<string, unknown>
    settings[field] = ["drifted"]
    rehashSettings(post, "product")
    expect(() =>
      assembleRoMeiliConvergenceProof(snapshotFixture("pre"), post)
    ).toThrow("product index settings drifted from the search contract")
  })

  it("rejects snapshot hash tampering before semantic assembly", () => {
    const post = mutable(snapshotFixture("post"))
    ;(post.indexes.ro.content as { settingsSha256: string }).settingsSha256 =
      sha("tampered")
    expect(() =>
      assembleRoMeiliConvergenceProof(snapshotFixture("pre"), post)
    ).toThrow("snapshot hash is invalid")
  })

  it("rejects noncanonical authority bytes and wrong frozen counts", () => {
    expect(() =>
      parseRoMeiliAuthority(JSON.stringify(authorityValue(), null, 2))
    ).toThrow("canonical JSON with LF")
    expect(() =>
      parseRoMeiliAuthority(
        serializeRoMeiliEvidence({
          ...authorityValue(),
          productIds: authorityValue().productIds.slice(1),
        })
      )
    ).toThrow("exactly 2002 IDs")
  })

  it.each([
    ["negative", -1],
    ["null", null],
  ])("rejects a %s amount in the reviewed authority", (_label, amount) => {
    const malformed = structuredClone(authorityValue()) as unknown as {
      approvedVariantPrices: Array<{ amount: unknown }>
      ronPriceProjectionSha256: string
    }
    const first = malformed.approvedVariantPrices[0]
    if (first) {
      first.amount = amount
    }
    malformed.ronPriceProjectionSha256 = hashRoMeiliValue(
      malformed.approvedVariantPrices
    )
    expect(() =>
      parseRoMeiliAuthority(serializeRoMeiliEvidence(malformed))
    ).toThrow("amount must be a positive RON amount with at most two decimals")
  })

  it("rejects a self-recomputed price projection not present in the reviewed authority", () => {
    const reviewed = authority()
    const altered = structuredClone(reviewed) as RoMeiliAuthority
    const mutablePrices = altered.approvedVariantPrices as Array<{
      amount: number
      productId: string
      variantId: string
    }>
    const first = mutablePrices[0]
    if (first) {
      first.amount += 1
    }
    ;(
      altered as { ronPriceProjectionSha256: string }
    ).ronPriceProjectionSha256 = hashRoMeiliValue(mutablePrices)
    expect(() =>
      assertRoMeiliPriceAuthorityBinding(
        altered,
        reviewed.marketAuthoritySha256,
        reviewed.approvedVariantPrices
      )
    ).toThrow("not derived from the reviewed pre-commerce price authority")
  })

  it("rejects an authority for a different active environment", () => {
    expect(() =>
      assertRoMeiliEnvironmentBinding(authority(), "production-other")
    ).toThrow("does not match the active RO environment")
  })

  it("writes canonical LF 0600 evidence and refuses a collision", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ro-meili-evidence-"))
    const outputPath = join(directory, "proof.json")
    const value = { b: 2, a: 1 }
    await writePrivateRoMeiliEvidence(outputPath, value)
    expect(await readFile(outputPath, "utf8")).toBe('{"a":1,"b":2}\n')
    expect((await stat(outputPath)).mode % 0o1000).toBe(0o600)
    await expect(
      writePrivateRoMeiliEvidence(outputPath, { a: 3 })
    ).rejects.toThrow()
    expect(await readFile(outputPath, "utf8")).toBe('{"a":1,"b":2}\n')

    const occupied = join(directory, "occupied.json")
    await writeFile(occupied, "reviewed\n", { mode: 0o600 })
    await expect(writePrivateRoMeiliEvidence(occupied, value)).rejects.toThrow()
    expect(await readFile(occupied, "utf8")).toBe("reviewed\n")
  })

  it("authenticates GET-only pagination without exposing the key on failure", async () => {
    const secret = "meili-super-secret"
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response("forbidden including upstream detail", { status: 403 })
      )
    const client = new ConfiguredRoMeiliReadClient({
      apiKey: secret,
      fetcher,
      host: "https://meili.example/",
    })
    await expect(client.listIndexes({ limit: 500, offset: 0 })).rejects.toThrow(
      "HTTP 403"
    )
    const [url, request] = fetcher.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://meili.example/indexes?limit=500&offset=0")
    expect(request.method).toBe("GET")
    expect(request.headers).toEqual({ Authorization: `Bearer ${secret}` })
    await expect(
      client.listIndexes({ limit: 500, offset: 0 })
    ).rejects.not.toThrow(secret)
  })
})
