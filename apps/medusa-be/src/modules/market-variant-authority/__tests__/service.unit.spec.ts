import { describe, expect, it, vi } from "vitest"
import MarketVariantAuthorityModuleService from "../service"

const HASH = "a".repeat(64)
const envelope = {
  authoritySha256: HASH,
  entries: [
    {
      approvalProvenance: { decisionId: "approval-1" },
      availability: "sellable" as const,
      productId: "prod_1",
      sourceProvenance: { recordKey: "source-1" },
      variantId: "variant_1",
    },
  ],
  marketCode: "ro",
  sourceVersion: "source-v1",
}

const service = () => {
  const instance = new MarketVariantAuthorityModuleService({} as never)
  ;(instance as any).baseRepository_ = {
    getManager: () => ({}),
    transaction: async (task: (manager: object) => Promise<unknown>) =>
      await task({}),
  }
  return instance as any
}

describe("MarketVariantAuthorityModuleService", () => {
  it.each([
    "createMarketVariantAuthorities",
    "updateMarketVariantAuthorities",
    "deleteMarketVariantAuthorities",
    "softDeleteMarketVariantAuthorities",
    "restoreMarketVariantAuthorities",
  ])("rejects raw generated mutation %s", async (method) => {
    const instance = service()

    await expect((instance as any)[method]()).rejects.toThrow(
      "can only be mutated through the authority facade"
    )
  })

  it("returns the current set without writes for a semantically identical replacement", async () => {
    const instance = service()
    const transactionManager = { execute: vi.fn().mockResolvedValue([]) }
    const sharedContext = { transactionManager }
    const current = [
      {
        approval_provenance: {
          nested: { b: 2, a: 1 },
          decisionId: "approval-1",
        },
        authority_sha256: HASH,
        availability: "sellable",
        id: "current",
        market_code: "ro",
        product_id: "prod_1",
        source_provenance: { recordKey: "source-1" },
        source_version: "source-v1",
        variant_id: "variant_1",
      },
    ]
    instance.listMarketVariantAuthorities = vi.fn().mockResolvedValue(current)
    instance.softDeleteMarketVariantAuthorityRows_ = vi.fn()
    instance.createMarketVariantAuthorityRows_ = vi.fn()

    const result = await (instance as any).replaceMarketVariantAuthorities_(
      {
        authoritySha256: HASH,
        entries: [
          {
            approval_provenance: {
              decisionId: "approval-1",
              nested: { a: 1, b: 2 },
            },
            authority_sha256: HASH,
            availability: "sellable",
            market_code: "ro",
            product_id: "prod_1",
            source_provenance: { recordKey: "source-1" },
            source_version: "source-v1",
            variant_id: "variant_1",
          },
        ],
        marketCode: "ro",
        sourceVersion: "source-v1",
      },
      sharedContext
    )

    expect(transactionManager.execute).toHaveBeenCalledExactlyOnceWith(
      "select pg_advisory_xact_lock(hashtextextended(?, 0))",
      ["market-variant-authority:ro"]
    )
    expect(result).toBe(current)
    expect(
      instance.softDeleteMarketVariantAuthorityRows_
    ).not.toHaveBeenCalled()
    expect(instance.createMarketVariantAuthorityRows_).not.toHaveBeenCalled()
  })

  it("replaces a market authority inside the delegated transaction", async () => {
    const instance = service()
    const transactionManager = { execute: vi.fn().mockResolvedValue([]) }
    const sharedContext = { transactionManager }
    instance.listMarketVariantAuthorities = vi.fn().mockResolvedValue([
      {
        id: "old",
        ...{
          approval_provenance: { decisionId: "old" },
          authority_sha256: "b".repeat(64),
          availability: "unavailable",
          market_code: "ro",
          product_id: "prod_old",
          source_provenance: { recordKey: "old" },
          source_version: "old",
          variant_id: "variant_old",
        },
      },
    ])
    instance.softDeleteMarketVariantAuthorityRows_ = vi
      .fn()
      .mockResolvedValue([])
    instance.createMarketVariantAuthorityRows_ = vi
      .fn()
      .mockResolvedValue([{ id: "new" }])

    const result = await (instance as any).replaceMarketVariantAuthorities_(
      {
        authoritySha256: HASH,
        entries: [
          {
            approval_provenance: { decisionId: "approval-1" },
            authority_sha256: HASH,
            availability: "sellable",
            market_code: "ro",
            product_id: "prod_1",
            source_provenance: { recordKey: "source-1" },
            source_version: "source-v1",
            variant_id: "variant_1",
          },
        ],
        marketCode: "ro",
        sourceVersion: "source-v1",
      },
      sharedContext
    )

    expect(instance.softDeleteMarketVariantAuthorityRows_).toHaveBeenCalledWith(
      ["old"],
      {},
      sharedContext
    )
    expect(instance.createMarketVariantAuthorityRows_).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          product_id: "prod_1",
          variant_id: "variant_1",
        }),
      ]),
      sharedContext
    )
    expect(result).toEqual([{ id: "new" }])
  })

  it("upserts current identities and creates only missing identities", async () => {
    const instance = service()
    const transactionManager = { execute: vi.fn().mockResolvedValue([]) }
    const sharedContext = { transactionManager }
    instance.listMarketVariantAuthorities = vi.fn().mockResolvedValue([
      {
        approval_provenance: { decisionId: "old" },
        authority_sha256: "b".repeat(64),
        availability: "unavailable",
        id: "existing",
        market_code: "ro",
        product_id: "prod_1",
        source_provenance: { recordKey: "old" },
        source_version: "old",
        variant_id: "variant_1",
      },
    ])
    instance.updateMarketVariantAuthorityRows_ = vi
      .fn()
      .mockResolvedValue([{ id: "existing" }])
    instance.createMarketVariantAuthorityRows_ = vi
      .fn()
      .mockResolvedValue([{ id: "created" }])

    const normalized = {
      authoritySha256: HASH,
      entries: [
        {
          approval_provenance: { decisionId: "approval-1" },
          authority_sha256: HASH,
          availability: "sellable" as const,
          market_code: "ro",
          product_id: "prod_1",
          source_provenance: { recordKey: "source-1" },
          source_version: "source-v1",
          variant_id: "variant_1",
        },
        {
          approval_provenance: { decisionId: "approval-2" },
          authority_sha256: HASH,
          availability: "unavailable" as const,
          market_code: "ro",
          product_id: "prod_1",
          source_provenance: { recordKey: "source-2" },
          source_version: "source-v1",
          variant_id: "variant_2",
        },
      ],
      marketCode: "ro",
      sourceVersion: "source-v1",
    }

    await (instance as any).upsertMarketVariantAuthorities_(
      normalized,
      sharedContext
    )

    expect(instance.updateMarketVariantAuthorityRows_).toHaveBeenCalledWith(
      [expect.objectContaining({ id: "existing", availability: "sellable" })],
      sharedContext
    )
    expect(instance.createMarketVariantAuthorityRows_).toHaveBeenCalledWith(
      [expect.objectContaining({ variant_id: "variant_2" })],
      sharedContext
    )
  })

  it("rejects a partial upsert that would mix authority generations", async () => {
    const instance = service()
    const transactionManager = { execute: vi.fn().mockResolvedValue([]) }
    instance.listMarketVariantAuthorities = vi.fn().mockResolvedValue([
      {
        id: "existing-1",
        market_code: "ro",
        product_id: "prod_1",
        variant_id: "variant_1",
      },
      {
        id: "existing-2",
        market_code: "ro",
        product_id: "prod_1",
        variant_id: "variant_2",
      },
    ])
    instance.updateMarketVariantAuthorityRows_ = vi.fn()
    instance.createMarketVariantAuthorityRows_ = vi.fn()

    await expect(
      (instance as any).upsertMarketVariantAuthorities_(
        {
          authoritySha256: HASH,
          entries: [
            {
              approval_provenance: { decisionId: "approval-1" },
              authority_sha256: HASH,
              availability: "sellable",
              market_code: "ro",
              product_id: "prod_1",
              source_provenance: { recordKey: "source-1" },
              source_version: "source-v2",
              variant_id: "variant_1",
            },
          ],
          marketCode: "ro",
          sourceVersion: "source-v2",
        },
        { transactionManager }
      )
    ).rejects.toThrow(
      "upsert must include every current variant for touched product prod_1"
    )
    expect(instance.updateMarketVariantAuthorityRows_).not.toHaveBeenCalled()
    expect(instance.createMarketVariantAuthorityRows_).not.toHaveBeenCalled()
  })

  it("resolves through the active persistence view and fails on missing rows", async () => {
    const instance = service()
    instance.listMarketVariantAuthorities = vi.fn().mockResolvedValue([])

    await expect(
      instance.resolveExactMarketVariantAuthority(
        {
          authoritySha256: HASH,
          marketCode: "ro",
          productId: "prod_1",
          variantIds: ["variant_1"],
        },
        { manager: {} } as never
      )
    ).rejects.toThrow("Missing current market variant authority")
  })

  it("normalizes the public envelope before transactional delegation", async () => {
    const instance = service()
    const delegated = vi.fn().mockResolvedValue([])
    ;(instance as any).replaceMarketVariantAuthorities_ = delegated

    await instance.replaceMarketVariantAuthorities(
      {
        ...envelope,
        marketCode: "RO",
      },
      { manager: {} } as never
    )

    expect(delegated).toHaveBeenCalledWith(
      expect.objectContaining({ marketCode: "ro" }),
      expect.objectContaining({ manager: {} })
    )
  })
})
