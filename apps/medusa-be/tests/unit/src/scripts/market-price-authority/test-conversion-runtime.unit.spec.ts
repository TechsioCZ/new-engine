import {
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"
import {
  buildTestPriceConversionPlan,
  hashTestPriceConversionFxAuthority,
} from "../../../../../src/scripts/market-price-authority/test-conversion"
import {
  addTestPriceConversionPrices,
  applyTestPriceConversion,
  assertTestPriceConversionApplied,
  buildTestPriceConversionBinding,
  buildTestPriceConversionDatabaseInstanceFingerprint,
  buildTestPriceConversionPriceAdds,
  hashTestPriceConversionInventorySnapshot,
  parseTestPriceConversionCliOptions,
  withTestPriceConversionApplyLock,
} from "../../../../../src/scripts/market-price-authority/test-conversion-runtime"
import type { MarketPriceDatabaseSnapshot } from "../../../../../src/scripts/market-price-authority/types"
import { price } from "./fixtures"

const binding = {
  backendBuildHash: "build_1",
  backendDeploymentId: "dpl_1",
  backendDeploymentSlot: "green" as const,
  backendReleaseSha: "6827bfd450a163e7dd350a396ca1f9363e06235e",
  databaseInstanceFingerprint: "a".repeat(64),
  environmentId: "test-engine",
  expectedEnvironmentId: "test-engine",
  fxAuthoritySha256: hashTestPriceConversionFxAuthority(),
  inventoryFingerprintSha256: "b".repeat(64),
  marketSalesChannels: [
    { marketCode: "cz" as const, salesChannelId: "sc_cz" },
    { marketCode: "hu" as const, salesChannelId: "sc_hu" },
    { marketCode: "ro" as const, salesChannelId: "sc_ro" },
    { marketCode: "sk" as const, salesChannelId: "sc_sk" },
  ] as const,
}

const databaseSnapshot = (): MarketPriceDatabaseSnapshot => ({
  products: [
    {
      id: "prod_shared",
      salesChannelIds: ["sc_cz", "sc_hu", "sc_ro", "sc_sk"],
      status: "published",
      variants: [
        {
          id: "variant_shared",
          priceSetId: "pset_shared",
          prices: [
            price("price_eur", "eur", 10),
            { ...price("price_eur_list", "eur", 8), priceListId: "plist" },
          ],
        },
      ],
    },
  ],
})

const createApplyHarness = () => {
  const initialPriceRows = [
    {
      amount: 10,
      currency_code: "eur",
      id: "price_eur",
      max_quantity: null,
      min_quantity: null,
      price_list_id: null,
      price_rules: [],
      price_set_id: "pset_shared",
    },
    {
      amount: 8,
      currency_code: "eur",
      id: "price_eur_list",
      max_quantity: null,
      min_quantity: null,
      price_list_id: "plist",
      price_rules: [],
      price_set_id: "pset_shared",
    },
  ]
  let priceRows = [...initialPriceRows]
  let addFailureAfterWrite = false
  let inventoryChanged = false
  const addPrices = vi.fn(async (additions: any[]) => {
    for (const addition of additions) {
      for (const candidate of addition.prices) {
        priceRows.push({
          amount: candidate.amount,
          currency_code: candidate.currency_code,
          id: candidate.id,
          max_quantity: null,
          min_quantity: null,
          price_list_id: null,
          price_rules: [],
          price_set_id: addition.priceSetId,
        })
      }
    }
    if (addFailureAfterWrite) {
      throw new Error("pricing response failed after write")
    }
    return additions.map((addition) => ({
      id: addition.priceSetId,
      prices: priceRows.filter(
        (candidate) => candidate.price_set_id === addition.priceSetId
      ),
    }))
  })
  const removePrices = vi.fn(async (ids: string[]) => {
    const removed = new Set(ids)
    priceRows = priceRows.filter((candidate) => !removed.has(candidate.id))
  })
  const query = {
    graph: vi.fn(async (input: { entity: string }) => {
      switch (input.entity) {
        case "inventory_level":
          return {
            data: inventoryChanged
              ? [
                  {
                    id: "ilevel_changed",
                    incoming_quantity: "0",
                    inventory_item_id: "iitem_changed",
                    location_id: "sloc_changed",
                    reserved_quantity: "0",
                    stocked_quantity: "1",
                  },
                ]
              : [],
          }
        case "price":
          return { data: priceRows }
        case "product":
          return {
            data: [
              {
                id: "prod_shared",
                sales_channels: [
                  { id: "sc_cz" },
                  { id: "sc_hu" },
                  { id: "sc_ro" },
                  { id: "sc_sk" },
                ],
                status: "published",
              },
            ],
          }
        case "product_variant":
          return {
            data: [{ id: "variant_shared", product_id: "prod_shared" }],
          }
        case "product_variant_inventory_item":
          return { data: [] }
        case "product_variant_price_set":
          return {
            data: [
              {
                price_set_id: "pset_shared",
                variant_id: "variant_shared",
              },
            ],
          }
        default:
          throw new Error(`unexpected query entity ${input.entity}`)
      }
    }),
  }
  const pricing = { addPrices, removePrices }
  const container = {
    resolve: vi.fn((key: string) => (key === "pricing" ? pricing : query)),
  }
  return {
    container,
    initialPriceIds: initialPriceRows.map((candidate) => candidate.id),
    priceIds: () => priceRows.map((candidate) => candidate.id).sort(),
    pricing,
    setAddFailureAfterWrite: (fail: boolean) => {
      addFailureAfterWrite = fail
    },
    setInventoryChanged: (changed: boolean) => {
      inventoryChanged = changed
    },
  }
}

describe("test-only price conversion runtime", () => {
  it("groups only planned creates into one pricing-module add per price set", () => {
    const plan = buildTestPriceConversionPlan(databaseSnapshot(), binding)
    expect(buildTestPriceConversionPriceAdds(plan)).toEqual([
      {
        priceSetId: "pset_shared",
        prices: [
          { amount: 242, currency_code: "czk", rules: {} },
          { amount: 3651, currency_code: "huf", rules: {} },
          { amount: 52.52, currency_code: "ron", rules: {} },
        ],
      },
    ])
  })

  it("does not call the pricing module for a zero-create plan", async () => {
    const pricing = { addPrices: vi.fn() }
    const plan = buildTestPriceConversionPlan(databaseSnapshot(), binding)
    await addTestPriceConversionPrices(pricing as never, {
      ...plan,
      mutations: plan.mutations.map((mutation) => ({
        ...mutation,
        action: "unchanged" as const,
        currentAmount: mutation.desiredAmount,
        currentPriceId: `existing_${mutation.currencyCode}`,
      })),
      summary: { ...plan.summary, create: 0, unchanged: 3 },
    })
    expect(pricing.addPrices).not.toHaveBeenCalled()
  })

  it("holds a database advisory lock around the apply task", async () => {
    const events: string[] = []
    const execute = vi.fn(async () => {
      events.push("lock")
    })
    const transactional = vi.fn(
      async (callback: (manager: { execute: typeof execute }) => unknown) =>
        await callback({ execute })
    )
    const container = {
      resolve: vi.fn(() => ({ transactional })),
    }
    await expect(
      withTestPriceConversionApplyLock(container as never, async () => {
        events.push("task")
        return "done"
      })
    ).resolves.toBe("done")
    expect(execute).toHaveBeenCalledWith(
      "select pg_advisory_xact_lock(hashtextextended(?, 0))",
      ["market-price-conversion:apply:v1"]
    )
    expect(events).toEqual(["lock", "task"])
  })

  it("removes only staged prices after an inventory assertion and can retry", async () => {
    const artifactDirectory = await mkdtemp(
      join(await realpath(tmpdir()), "market-price-inventory-compensation-")
    )
    const harness = createApplyHarness()
    const inventoryBefore = { levels: [], variantLinks: [] }
    const plan = buildTestPriceConversionPlan(databaseSnapshot(), {
      ...binding,
      inventoryFingerprintSha256:
        hashTestPriceConversionInventorySnapshot(inventoryBefore),
    })
    try {
      harness.setInventoryChanged(true)
      await expect(
        applyTestPriceConversion({
          artifactDirectory,
          before: databaseSnapshot(),
          container: harness.container as never,
          inventoryBefore,
          plan,
        })
      ).rejects.toThrow("shared inventory changed")

      const compensatedIds = harness.pricing.removePrices.mock.calls[0]?.[0]
      expect(compensatedIds).toHaveLength(3)
      expect(compensatedIds?.every((id) => id.startsWith("price_"))).toBe(true)
      expect(compensatedIds).not.toEqual(
        expect.arrayContaining(harness.initialPriceIds)
      )
      expect(harness.priceIds()).toEqual(harness.initialPriceIds.sort())
      await expect(
        stat(join(artifactDirectory, "backup.json"))
      ).rejects.toMatchObject({ code: "ENOENT" })

      harness.setInventoryChanged(false)
      await expect(
        applyTestPriceConversion({
          artifactDirectory,
          before: databaseSnapshot(),
          container: harness.container as never,
          inventoryBefore,
          plan,
        })
      ).resolves.toMatchObject({ createdPrices: expect.any(Array) })
      expect(harness.priceIds()).toHaveLength(5)
    } finally {
      await rm(artifactDirectory, { force: true, recursive: true })
    }
  })

  it("retains exact compensation IDs before the pricing response resolves", async () => {
    const artifactDirectory = await mkdtemp(
      join(await realpath(tmpdir()), "market-price-add-compensation-")
    )
    const harness = createApplyHarness()
    const inventoryBefore = { levels: [], variantLinks: [] }
    const plan = buildTestPriceConversionPlan(databaseSnapshot(), {
      ...binding,
      inventoryFingerprintSha256:
        hashTestPriceConversionInventorySnapshot(inventoryBefore),
    })
    try {
      harness.setAddFailureAfterWrite(true)
      await expect(
        applyTestPriceConversion({
          artifactDirectory,
          before: databaseSnapshot(),
          container: harness.container as never,
          inventoryBefore,
          plan,
        })
      ).rejects.toThrow("pricing response failed after write")

      expect(harness.pricing.removePrices).toHaveBeenCalledOnce()
      expect(harness.priceIds()).toEqual(harness.initialPriceIds.sort())
      await expect(
        stat(join(artifactDirectory, "backup.json"))
      ).rejects.toMatchObject({ code: "ENOENT" })
    } finally {
      await rm(artifactDirectory, { force: true, recursive: true })
    }
  })

  it("compensates a receipt publication failure without clobbering it", async () => {
    const artifactDirectory = await mkdtemp(
      join(await realpath(tmpdir()), "market-price-receipt-compensation-")
    )
    const receiptPath = join(artifactDirectory, "receipt.json")
    const harness = createApplyHarness()
    const inventoryBefore = { levels: [], variantLinks: [] }
    const plan = buildTestPriceConversionPlan(databaseSnapshot(), {
      ...binding,
      inventoryFingerprintSha256:
        hashTestPriceConversionInventorySnapshot(inventoryBefore),
    })
    try {
      await writeFile(receiptPath, "reviewed-existing-receipt\n", {
        mode: 0o600,
      })
      await expect(
        applyTestPriceConversion({
          artifactDirectory,
          before: databaseSnapshot(),
          container: harness.container as never,
          inventoryBefore,
          plan,
        })
      ).rejects.toMatchObject({ code: "EEXIST" })

      expect(harness.priceIds()).toEqual(harness.initialPriceIds.sort())
      expect(await readFile(receiptPath, "utf8")).toBe(
        "reviewed-existing-receipt\n"
      )
      await expect(
        stat(join(artifactDirectory, "backup.json"))
      ).rejects.toMatchObject({ code: "ENOENT" })

      await unlink(receiptPath)
      await expect(
        applyTestPriceConversion({
          artifactDirectory,
          before: databaseSnapshot(),
          container: harness.container as never,
          inventoryBefore,
          plan,
        })
      ).resolves.toMatchObject({ createdPrices: expect.any(Array) })
      expect(harness.priceIds()).toHaveLength(5)
    } finally {
      await rm(artifactDirectory, { force: true, recursive: true })
    }
  })

  it("proves the exact price-only delta while preserving EUR and catalog identity", () => {
    const initial = databaseSnapshot()
    const plan = buildTestPriceConversionPlan(initial, binding)
    const after: MarketPriceDatabaseSnapshot = {
      products: initial.products.map((product) => ({
        ...product,
        variants: product.variants.map((variant) => ({
          ...variant,
          prices: [
            ...variant.prices,
            price("price_czk", "czk", 242),
            price("price_huf", "huf", 3651),
            price("price_ron", "ron", 52.52),
          ].sort((left, right) => left.id.localeCompare(right.id)),
        })),
      })),
    }
    expect(assertTestPriceConversionApplied(initial, after, plan)).toEqual([
      expect.objectContaining({ currencyCode: "czk", priceId: "price_czk" }),
      expect.objectContaining({ currencyCode: "huf", priceId: "price_huf" }),
      expect.objectContaining({ currencyCode: "ron", priceId: "price_ron" }),
    ])
  })

  it("rejects any mutation of EUR, product identity, or extra prices", () => {
    const initial = databaseSnapshot()
    const plan = buildTestPriceConversionPlan(initial, binding)
    const changedEur: MarketPriceDatabaseSnapshot = {
      products: initial.products.map((product) => ({
        ...product,
        variants: product.variants.map((variant) => ({
          ...variant,
          prices: variant.prices.map((candidate) =>
            candidate.id === "price_eur"
              ? { ...candidate, amount: 11 }
              : candidate
          ),
        })),
      })),
    }
    expect(() =>
      assertTestPriceConversionApplied(initial, changedEur, plan)
    ).toThrow("pre-existing price")
    const changedChannel: MarketPriceDatabaseSnapshot = {
      products: initial.products.map((product) => ({
        ...product,
        salesChannelIds: ["sc_other"],
      })),
    }
    expect(() =>
      assertTestPriceConversionApplied(initial, changedChannel, plan)
    ).toThrow("identity changed")
    const extraPrice: MarketPriceDatabaseSnapshot = {
      products: initial.products.map((product) => ({
        ...product,
        variants: product.variants.map((variant) => ({
          ...variant,
          prices: [...variant.prices, price("price_usd", "usd", 10)].sort(
            (left, right) => left.id.localeCompare(right.id)
          ),
        })),
      })),
    }
    expect(() =>
      assertTestPriceConversionApplied(initial, extraPrice, plan)
    ).toThrow("created price count mismatch")
  })

  it("requires exact test-only CLI modes and two independently reviewed hashes", () => {
    expect(
      parseTestPriceConversionCliOptions([
        "--dry-run",
        "--plan-output",
        "/tmp/price-plan.json",
      ])
    ).toEqual({ mode: "dry-run", planOutputPath: "/tmp/price-plan.json" })
    expect(
      parseTestPriceConversionCliOptions([
        "--apply",
        "--plan",
        "/tmp/price-plan.json",
        "--expected-plan-sha256",
        "a".repeat(64),
        "--expected-plan-artifact-sha256",
        "b".repeat(64),
        "--artifact-directory",
        "/tmp/price-apply",
      ])
    ).toMatchObject({ mode: "apply" })
    expect(() =>
      parseTestPriceConversionCliOptions([
        "--apply",
        "--plan",
        "/tmp/price-plan.json",
      ])
    ).toThrow("options must be exactly")
    expect(() =>
      parseTestPriceConversionCliOptions([
        "--dry-run",
        "--apply",
        "--plan-output",
        "/tmp/price-plan.json",
      ])
    ).toThrow("exactly one")
  })

  it("fingerprints database identity without including credentials", () => {
    const primary = buildTestPriceConversionDatabaseInstanceFingerprint({
      DATABASE_URL: "postgresql://first:secret@DB.internal/medusa",
      MARKET_PRICE_CONVERSION_DATABASE_INSTANCE_ID: "test-primary",
    })
    expect(
      buildTestPriceConversionDatabaseInstanceFingerprint({
        DATABASE_URL: "postgresql://second:different@db.internal:5432/medusa",
        MARKET_PRICE_CONVERSION_DATABASE_INSTANCE_ID: "test-primary",
      })
    ).toBe(primary)
    expect(
      buildTestPriceConversionDatabaseInstanceFingerprint({
        DATABASE_URL: "postgresql://first:secret@clone.internal/medusa",
        MARKET_PRICE_CONVERSION_DATABASE_INSTANCE_ID: "test-clone",
      })
    ).not.toBe(primary)
  })

  it("requires an explicit expected binding before a production identifier is allowed", () => {
    const environment = {
      BACKEND_BUILD_HASH: "build_1",
      DATABASE_URL: "postgresql://operator:secret@db.internal/medusa",
      MARKET_PRICE_CONVERSION_DATABASE_INSTANCE_ID: "production-primary",
      MARKET_PRICE_CONVERSION_ENVIRONMENT_ID: "production-eu-1",
      MARKET_PRICE_CONVERSION_EXPECTED_FX_AUTHORITY_SHA256:
        hashTestPriceConversionFxAuthority(),
      MARKET_SALES_CHANNEL_ID_CZ: "sc_cz",
      MARKET_SALES_CHANNEL_ID_HU: "sc_hu",
      MARKET_SALES_CHANNEL_ID_RO: "sc_ro",
      MARKET_SALES_CHANNEL_ID_SK: "sc_sk",
      RELEASE_SHA: "6827bfd450a163e7dd350a396ca1f9363e06235e",
      ZANE_DEPLOYMENT_ID: "dpl_1",
      ZANE_DEPLOYMENT_SLOT: "green",
    }
    const inventorySnapshot = { levels: [], variantLinks: [] }
    expect(() =>
      buildTestPriceConversionBinding(environment, inventorySnapshot)
    ).toThrow("mandatory outside test-engine")
    expect(() =>
      buildTestPriceConversionBinding(
        {
          ...environment,
          MARKET_PRICE_CONVERSION_EXPECTED_ENVIRONMENT_ID: "production-eu-2",
        },
        inventorySnapshot
      )
    ).toThrow("does not match its explicit expected binding")
    expect(
      buildTestPriceConversionBinding(
        {
          ...environment,
          MARKET_PRICE_CONVERSION_EXPECTED_ENVIRONMENT_ID: "production-eu-1",
        },
        inventorySnapshot
      )
    ).toMatchObject({
      environmentId: "production-eu-1",
      expectedEnvironmentId: "production-eu-1",
      fxAuthoritySha256: hashTestPriceConversionFxAuthority(),
    })
  })

  it("keeps the legacy test-engine contract isolated and FX-hash bound", () => {
    const environment = {
      BACKEND_BUILD_HASH: "build_test",
      DATABASE_URL: "postgresql://tester:secret@test-db.internal/medusa",
      MARKET_PRICE_CONVERSION_EXPECTED_FX_AUTHORITY_SHA256:
        hashTestPriceConversionFxAuthority(),
      MARKET_SALES_CHANNEL_ID_CZ: "sc_cz",
      MARKET_SALES_CHANNEL_ID_HU: "sc_hu",
      MARKET_SALES_CHANNEL_ID_RO: "sc_ro",
      MARKET_SALES_CHANNEL_ID_SK: "sc_sk",
      RELEASE_SHA: "6827bfd450a163e7dd350a396ca1f9363e06235e",
      TEST_PRICE_CONVERSION_DATABASE_INSTANCE_ID: "test-primary",
      TEST_PRICE_CONVERSION_ENVIRONMENT_ID: "test-engine",
      ZANE_DEPLOYMENT_ID: "dpl_test",
      ZANE_DEPLOYMENT_SLOT: "blue",
    }
    const inventorySnapshot = { levels: [], variantLinks: [] }
    expect(
      buildTestPriceConversionBinding(environment, inventorySnapshot)
    ).toMatchObject({
      environmentId: "test-engine",
      expectedEnvironmentId: "test-engine",
      fxAuthoritySha256: hashTestPriceConversionFxAuthority(),
    })
    expect(() =>
      buildTestPriceConversionBinding(
        {
          ...environment,
          MARKET_PRICE_CONVERSION_EXPECTED_FX_AUTHORITY_SHA256: "c".repeat(64),
        },
        inventorySnapshot
      )
    ).toThrow("frozen ECB snapshot")
  })

  it("never needs order or payment module dependencies", () => {
    const resolve = vi.fn((key: string) => {
      if (key === "pricing") {
        return { addPrices: vi.fn(), removePrices: vi.fn() }
      }
      throw new Error(`unexpected module ${key}`)
    })
    expect(() => resolve("order")).toThrow("unexpected module order")
    expect(() => resolve("payment")).toThrow("unexpected module payment")
  })
})
