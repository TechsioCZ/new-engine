import { mkdtemp, readFile, realpath, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  computeSharedCatalogSha256,
  computeSharedInventorySha256,
  serializeCanonicalCommerceArtifact,
  sha256CommerceArtifactBytes,
} from "../../../../src/scripts/market-commerce-readiness"
import {
  parseFourMarketCommerceCollectionAuthority,
  readFourMarketReviewedArtifacts,
} from "../../../../src/scripts/market-commerce-readiness/authority"
import {
  parseCommerceCollectionCliOptions,
  runFourMarketCommerceCollection,
} from "../../../../src/scripts/market-commerce-readiness/cli"
import {
  buildCollectedCommerceReadiness,
  buildCommerceCollectionReceipt,
  observeCommerceReleaseIdentity,
} from "../../../../src/scripts/market-commerce-readiness/collector"
import type {
  CommerceArtifactRef,
  CommerceLiveState,
  FourMarketCommerceCollectionAuthority,
} from "../../../../src/scripts/market-commerce-readiness/collector-types"
import { collectMedusaCommerceLiveState } from "../../../../src/scripts/market-commerce-readiness/medusa-source"
import { COMMERCE_MARKET_CONTRACTS } from "../../../../src/scripts/market-commerce-readiness/types"
import { writeCommerceCollectionEvidence } from "../../../../src/scripts/market-commerce-readiness/writer"

const SHA = "a".repeat(64)
const SHA_256 = /^[a-f0-9]{64}$/
const MARKET_CODES = ["sk", "cz", "hu", "ro"] as const
const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true }))
  )
})

const environment = (): NodeJS.ProcessEnv => ({
  BACKEND_BUILD_HASH: "build-1",
  DATABASE_URL: "postgresql://user:secret@database.internal:5432/herbatika",
  MARKET_COMMERCE_DATABASE_INSTANCE_ID: "postgres-blue",
  MARKET_COMMERCE_ENVIRONMENT_ID: "production",
  MARKET_COMMERCE_RELEASE_ID: "release-1",
  RELEASE_SHA: "abcdef1234567890",
  ZANE_DEPLOYMENT_ID: "deployment-1",
  ZANE_DEPLOYMENT_SLOT: "blue",
})

const liveState = (): CommerceLiveState => ({
  inventoryLevels: [
    {
      incomingQuantity: 0,
      inventoryItemId: "iitem_1",
      locationId: "sloc_1",
      reservedQuantity: 1,
      stockedQuantity: 20,
    },
  ],
  inventoryLinks: [
    {
      inventoryItemId: "iitem_1",
      requiredQuantity: 1,
      variantId: "variant_1",
    },
  ],
  paymentProviders: MARKET_CODES.map((market) => ({
    enabled: true,
    id: `pp_${market}`,
  })),
  products: [
    {
      id: "prod_1",
      salesChannelIds: MARKET_CODES.map((market) => `sc_${market}`),
      variants: [
        {
          ean: "8580000000001",
          id: "variant_1",
          prices: MARKET_CODES.map((market) => ({
            amount: 1299,
            currencyCode: COMMERCE_MARKET_CONTRACTS[market].currencyCode,
          })),
          sku: "shared-1",
        },
      ],
    },
  ],
  regionPaymentProviderLinks: MARKET_CODES.map((market) => ({
    paymentProviderId: `pp_${market}`,
    regionId: `reg_${market}`,
  })),
  regions: MARKET_CODES.map((market) => ({
    countryCodes: [COMMERCE_MARKET_CONTRACTS[market].countryCode],
    currencyCode: COMMERCE_MARKET_CONTRACTS[market].currencyCode,
    id: `reg_${market}`,
  })),
  shippingOptions: MARKET_CODES.map((market) => ({
    countryCodes: [COMMERCE_MARKET_CONTRACTS[market].countryCode],
    currencyCodes: [COMMERCE_MARKET_CONTRACTS[market].currencyCode],
    id: `ship_${market}`,
  })),
  taxRates: MARKET_CODES.map((market) => ({
    enabled: true,
    id: `tax_${market}`,
    rate: 20,
    taxRegionId: `taxreg_${market}`,
  })),
  taxRegions: MARKET_CODES.map((market) => ({
    countryCode: COMMERCE_MARKET_CONTRACTS[market].countryCode,
    id: `taxreg_${market}`,
  })),
})

const artifactFixture = () => {
  const state = liveState()
  const sharedCatalog = {
    productIds: ["prod_1"],
    reviewedSha256: SHA,
    variants: [
      {
        ean: "8580000000001",
        id: "variant_1",
        productId: "prod_1",
        sku: "shared-1",
      },
    ],
  }
  const sharedInventory = {
    levels: state.inventoryLevels,
    links: state.inventoryLinks,
    reviewedSha256: SHA,
  }
  const baselineBytes = serializeCanonicalCommerceArtifact({
    kind: "shared-commerce-state-baseline",
    schemaVersion: 1,
    sharedCatalogSha256: computeSharedCatalogSha256(sharedCatalog),
    sharedInventorySha256: computeSharedInventorySha256(sharedInventory),
  })
  const files = new Map<string, string>([
    ["/review/shared.json", baselineBytes],
  ])
  const markets = MARKET_CODES.map((market) => {
    const contract = COMMERCE_MARKET_CONTRACTS[market]
    const pricePath = `/review/${market}-prices.json`
    const canaryPath = `/review/${market}-canary.json`
    const priceBytes = serializeCanonicalCommerceArtifact({
      currencyCode: contract.currencyCode,
      kind: "market-approved-variant-prices",
      market,
      prices: [{ amount: 1299, variantId: "variant_1" }],
      schemaVersion: 1,
    })
    const canaryBytes = serializeCanonicalCommerceArtifact({
      artifactKind: "checkout-readiness-canary",
      checkedAt: "2026-08-21T10:00:00.000Z",
      countryCode: contract.countryCode,
      currencyCode: contract.currencyCode,
      enabledPaymentAvailable: true,
      mutationPolicy: "no-order-no-payment-mutation",
      orderId: null,
      paymentCollectionId: null,
      paymentSessionId: null,
      regionId: `reg_${market}`,
      salesChannelId: `sc_${market}`,
      schemaVersion: 1,
      shippingAvailable: true,
      taxAvailable: true,
      variantId: "variant_1",
    })
    files.set(pricePath, priceBytes)
    files.set(canaryPath, canaryBytes)
    return {
      checkoutCanary: ref(canaryPath, canaryBytes),
      market,
      paymentProviderIds: [`pp_${market}`],
      priceAuthority: ref(pricePath, priceBytes),
      regionId: `reg_${market}`,
      salesChannelId: `sc_${market}`,
      shippingOptionIds: [`ship_${market}`],
      taxRateIds: [`tax_${market}`],
      taxRegionId: `taxreg_${market}`,
    }
  })
  const authority: FourMarketCommerceCollectionAuthority = {
    kind: "four-market-commerce-collection-authority",
    markets,
    releaseIdentity: observeCommerceReleaseIdentity(environment()),
    schemaVersion: 1,
    sharedBaseline: ref("/review/shared.json", baselineBytes),
  }
  const authorityBytes = serializeCanonicalCommerceArtifact(authority)
  files.set("/review/authority.json", authorityBytes)
  return { authority, authorityBytes, files, state }
}

const ref = (path: string, bytes: string): CommerceArtifactRef => ({
  path,
  sha256: sha256CommerceArtifactBytes(bytes),
})

describe("four-market commerce live collector", () => {
  it("parses repeated medusa exec argument tokens without an apply surface", () => {
    expect(
      parseCommerceCollectionCliOptions([
        "--authority",
        "/review/authority.json",
        "--expected-authority-sha256",
        SHA,
        "--proof-output-directory",
        "/evidence/markets",
        "--receipt-output",
        "/evidence/operations/four-market-commerce-collection.json",
      ])
    ).toEqual({
      authorityPath: "/review/authority.json",
      expectedAuthoritySha256: SHA,
      proofOutputDirectory: "/evidence/markets",
      receiptOutputPath:
        "/evidence/operations/four-market-commerce-collection.json",
    })
    expect(() =>
      parseCommerceCollectionCliOptions(["--apply", "true"])
    ).toThrow("exactly four flag/value pairs")
  })

  it("collects four ready proofs entirely from reviewed artifacts and live reads", async () => {
    const fixture = artifactFixture()
    const collectLiveState = vi.fn(async () => fixture.state)
    const writeEvidence = vi.fn(async (collection, options) =>
      buildCommerceCollectionReceipt({
        authority: options.authority,
        capturedAt: options.capturedAt,
        proofs: Object.fromEntries(
          MARKET_CODES.map((market) => [
            market,
            { path: `/proof/${market}.json`, sha256: SHA },
          ])
        ) as Record<(typeof MARKET_CODES)[number], CommerceArtifactRef>,
        ready: collection.bundle.ready,
        releaseIdentity: options.releaseIdentity,
      })
    )
    const result = await runFourMarketCommerceCollection(
      {
        authorityPath: "/review/authority.json",
        expectedAuthoritySha256: sha256CommerceArtifactBytes(
          fixture.authorityBytes
        ),
        proofOutputDirectory: "/evidence/markets",
        receiptOutputPath:
          "/evidence/operations/four-market-commerce-collection.json",
      },
      {
        collectLiveState,
        environment: environment(),
        now: () => new Date("2026-08-21T11:00:00.000Z"),
        readReviewedArtifacts: (authority) =>
          readFourMarketReviewedArtifacts(authority, async (path) => {
            const bytes = fixture.files.get(path)
            if (!bytes) {
              throw new Error(`missing fixture ${path}`)
            }
            return bytes
          }),
        readTextFile: async () => fixture.authorityBytes,
        writeEvidence,
      }
    )

    expect(result.collection.bundle.ready).toBe(true)
    expect(result.receipt.ready).toBe(true)
    expect(Object.keys(result.collection.proofs)).toEqual(MARKET_CODES)
    expect(collectLiveState).toHaveBeenCalledOnce()
    expect(writeEvidence).toHaveBeenCalledOnce()
  })

  it("rejects release identity drift before querying Medusa", async () => {
    const fixture = artifactFixture()
    const collectLiveState = vi.fn(async () => fixture.state)
    await expect(
      runFourMarketCommerceCollection(
        {
          authorityPath: "/review/authority.json",
          expectedAuthoritySha256: sha256CommerceArtifactBytes(
            fixture.authorityBytes
          ),
          proofOutputDirectory: "/evidence/markets",
          receiptOutputPath:
            "/evidence/operations/four-market-commerce-collection.json",
        },
        {
          collectLiveState,
          environment: { ...environment(), RELEASE_SHA: "different" },
          now: () => new Date(),
          readReviewedArtifacts: vi.fn(),
          readTextFile: async () => fixture.authorityBytes,
          writeEvidence: vi.fn(),
        }
      )
    ).rejects.toThrow("differs at backendReleaseSha")
    expect(collectLiveState).not.toHaveBeenCalled()
  })

  it("rejects price evidence whose bytes differ from the reviewed ref", async () => {
    const fixture = artifactFixture()
    fixture.files.set(
      "/review/cz-prices.json",
      serializeCanonicalCommerceArtifact({ tampered: true })
    )

    await expect(
      readFourMarketReviewedArtifacts(fixture.authority, async (path) => {
        const bytes = fixture.files.get(path)
        if (!bytes) {
          throw new Error(path)
        }
        return bytes
      })
    ).rejects.toThrow("cz price authority bytes do not match")
  })

  it("rejects a non-array market authority before reading market entries", () => {
    const fixture = artifactFixture()
    const bytes = serializeCanonicalCommerceArtifact({
      ...fixture.authority,
      markets: {},
    })

    expect(() => parseFourMarketCommerceCollectionAuthority(bytes)).toThrow(
      "commerce collection authority contract is invalid"
    )
  })

  it.each([
    {
      collection: "regions",
      expected: "sk region differs from the reviewed identity scope",
      missingId: "reg_sk",
    },
    {
      collection: "taxRegions",
      expected: "sk tax region differs from the reviewed identity scope",
      missingId: "taxreg_sk",
    },
  ] as const)("fails closed when $collection omits the reviewed identity", async ({
    collection,
    expected,
    missingId,
  }) => {
    const fixture = artifactFixture()
    const artifacts = await readFourMarketReviewedArtifacts(
      fixture.authority,
      async (path) => fixture.files.get(path) ?? Promise.reject(new Error(path))
    )
    const state =
      collection === "regions"
        ? {
            ...fixture.state,
            regions: fixture.state.regions.filter(({ id }) => id !== missingId),
          }
        : {
            ...fixture.state,
            taxRegions: fixture.state.taxRegions.filter(
              ({ id }) => id !== missingId
            ),
          }

    expect(() =>
      buildCollectedCommerceReadiness(
        fixture.authority,
        artifacts,
        state,
        "2026-08-21T11:00:00.000Z"
      )
    ).toThrow(expected)
  })

  it("queries only the read-only commerce entities and no cart/order/payment collection", async () => {
    const entities: string[] = []
    const container = {
      resolve: () => ({
        graph: async ({ entity }: { entity: string }) => {
          entities.push(entity)
          return { data: [] }
        },
      }),
    }
    const state = await collectMedusaCommerceLiveState(container as never)

    expect(state.products).toEqual([])
    expect(entities.sort()).toEqual(
      [
        "inventory_level",
        "payment_provider",
        "product",
        "product_variant_inventory_item",
        "region",
        "region_payment_provider",
        "shipping_option",
        "shipping_option_price_set",
        "tax_rate",
        "tax_region",
      ].sort()
    )
    expect(entities).not.toEqual(
      expect.arrayContaining(["cart", "order", "payment_collection"])
    )
  })

  it("writes mode-0600 canonical evidence and refuses to clobber it", async () => {
    const fixture = artifactFixture()
    const artifacts = await readFourMarketReviewedArtifacts(
      fixture.authority,
      async (path) => fixture.files.get(path) ?? Promise.reject(new Error(path))
    )
    const collection = buildCollectedCommerceReadiness(
      fixture.authority,
      artifacts,
      fixture.state,
      "2026-08-21T11:00:00.000Z"
    )
    const createdDirectory = await mkdtemp(
      join(tmpdir(), "commerce-readiness-")
    )
    temporaryDirectories.push(createdDirectory)
    const directory = await realpath(createdDirectory)
    const options = {
      authority: ref("/review/authority.json", fixture.authorityBytes),
      capturedAt: "2026-08-21T11:00:00.000Z",
      proofOutputDirectory: join(directory, "markets"),
      receiptOutputPath: join(
        directory,
        "operations",
        "four-market-commerce-collection.json"
      ),
      releaseIdentity: fixture.authority.releaseIdentity,
    }

    const receipt = await writeCommerceCollectionEvidence(collection, options)
    expect(receipt.ready).toBe(true)
    expect(
      (await stat(options.receiptOutputPath)).mode.toString(8).slice(-3)
    ).toBe("600")
    expect(
      sha256CommerceArtifactBytes(
        await readFile(options.receiptOutputPath, "utf8")
      )
    ).toMatch(SHA_256)
    await expect(
      writeCommerceCollectionEvidence(collection, options)
    ).rejects.toMatchObject({ code: "EEXIST" })
  })
})
