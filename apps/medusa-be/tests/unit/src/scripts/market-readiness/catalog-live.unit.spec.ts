import { mkdtemp, readFile, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  buildFourMarketCatalogAuditReport,
  hashFourMarketCatalogTranslationFields,
} from "../../../../../src/scripts/market-readiness/catalog-audit"
import {
  buildFourMarketCatalogLiveArtifact,
  collectFourMarketCatalogAuditInput,
  type FourMarketCatalogLiveReader,
  type FourMarketCatalogScopeAuthority,
  type FourMarketCatalogTranslationAuthority,
  hashFourMarketCatalogArtifactBytes,
  hashFourMarketCatalogLiveArtifact,
  parseFourMarketCatalogLiveCliOptions,
  parseFourMarketCatalogScopeAuthority,
  parseFourMarketCatalogTranslationAuthority,
  readFourMarketReleaseIdentity,
  runFourMarketCatalogLiveCollection,
  serializeFourMarketCatalogLiveArtifact,
  writeFourMarketCatalogLiveArtifact,
} from "../../../../../src/scripts/market-readiness/catalog-live"

const SHA256_PATTERN = /^[a-f0-9]{64}$/
const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true }))
  )
})

const marketProfiles = [
  ["sk", "sk", "eur", "sk-SK"],
  ["cz", "cz", "czk", "cs-CZ"],
  ["hu", "hu", "huf", "hu-HU"],
  ["ro", "ro", "ron", "ro-RO"],
] as const
const translationFields = ["title", "subtitle", "description"] as const
const translationValues = (localeCode: string) => ({
  description: `Verified description for ${localeCode}`,
  subtitle: `Verified subtitle for ${localeCode}`,
  title: `Verified title for ${localeCode}`,
})

const scopeAuthority = (): FourMarketCatalogScopeAuthority => ({
  kind: "herbatika-four-market-catalog-scope-authority",
  markets: marketProfiles.map(
    ([market, countryCode, currencyCode, localeCode]) => ({
      countryCode,
      currencyCode,
      excludedProductIds: [],
      localeCode,
      market,
      publications: [
        {
          entityId: "prod_shared",
          entityKind: "product",
          publicSlug: `shared-${market}`,
        },
      ],
      publishedProductIds: ["prod_shared"],
      regionId: `reg_${market}`,
      salesChannelId: `sc_${market}`,
    })
  ),
  schemaVersion: 2,
  sharedCatalog: [
    {
      attributes: {
        collectionId: "pcol_shared",
        description: "Shared description",
        externalId: "external-shared",
        handle: "shared-product",
        metadata: { dosage: "10 ml" },
        subtitle: "Shared subtitle",
        title: "Shared product",
      },
      brandId: "brand_shared",
      categoryIds: ["pcat_shared"],
      imageUrls: ["https://cdn.example.com/shared.jpg"],
      productId: "prod_shared",
      status: "published",
      thumbnailUrl: "https://cdn.example.com/shared-thumbnail.jpg",
      variants: [
        {
          allowBackorder: false,
          currencyCodes: ["eur", "czk", "huf", "ron"],
          ean: "8580000000001",
          inventoryItemIds: ["iitem_shared"],
          manageInventory: true,
          sku: "SHARED-1",
          variantId: "variant_shared",
        },
      ],
    },
  ],
})

const translationAuthority = (): FourMarketCatalogTranslationAuthority => ({
  kind: "herbatika-four-market-catalog-translation-authority",
  markets: marketProfiles.map(([market, , , localeCode]) => ({
    market,
    publications: [
      {
        entityId: "prod_shared",
        entityKind: "product",
        reviewedTranslationSha256: hashFourMarketCatalogTranslationFields(
          translationValues(localeCode),
          translationFields
        ),
      },
    ],
  })),
  schemaVersion: 2,
})

const reader = (): FourMarketCatalogLiveReader => ({
  listAssignments: vi.fn(async () =>
    marketProfiles.map(([market]) => ({
      entity_id: "prod_shared",
      entity_kind: "product",
      market_code: market,
      public_slug: `shared-${market}`,
      publication_status: "published",
      sales_channel_id: `sc_${market}`,
    }))
  ),
  listGraphRows: vi.fn(async ({ entity }) => {
    if (entity === "locale") {
      return marketProfiles.map(([, , , localeCode]) => ({
        code: localeCode,
        id: `locale_${localeCode}`,
      }))
    }
    if (entity === "region") {
      return marketProfiles.map(([market, countryCode, currencyCode]) => ({
        countries: [{ iso_2: countryCode }],
        currency_code: currencyCode,
        id: `reg_${market}`,
      }))
    }
    if (entity === "sales_channel") {
      return marketProfiles.map(([market]) => ({ id: `sc_${market}` }))
    }
    if (entity === "product_variant_inventory_item") {
      return [
        {
          inventory_item_id: "iitem_shared",
          variant_id: "variant_shared",
        },
      ]
    }
    if (entity === "product") {
      return [
        {
          brand: { id: "brand_shared" },
          categories: [{ id: "pcat_shared" }],
          collection_id: "pcol_shared",
          description: "Shared description",
          external_id: "external-shared",
          handle: "shared-product",
          id: "prod_shared",
          images: [{ url: "https://cdn.example.com/shared.jpg" }],
          metadata: { dosage: "10 ml" },
          sales_channels: marketProfiles.map(([market]) => ({
            id: `sc_${market}`,
          })),
          status: "published",
          subtitle: "Shared subtitle",
          thumbnail: "https://cdn.example.com/shared-thumbnail.jpg",
          title: "Shared product",
          variants: [
            {
              allow_backorder: false,
              ean: "8580000000001",
              id: "variant_shared",
              manage_inventory: true,
              prices: marketProfiles.map(([, , currencyCode]) => ({
                amount: 100,
                currency_code: currencyCode,
              })),
              sku: "SHARED-1",
            },
          ],
        },
      ]
    }
    throw new Error(`Unexpected entity ${entity}`)
  }),
  listTranslations: vi.fn(async ({ localeCode }) => [
    {
      id: `translation_${localeCode}`,
      locale_code: localeCode,
      reference: "product",
      reference_id: "prod_shared",
      translations: translationValues(localeCode),
    },
  ]),
})

const releaseIdentity = () => ({
  backendBuildHash: "build-hash",
  backendDeploymentId: "deployment-id",
  backendReleaseSha: "release-sha",
  backendSlot: "blue" as const,
  databaseInstanceFingerprint: "a".repeat(64),
  environmentId: "environment-id",
  releaseId: "release-id",
})

describe("four-market live catalog readiness", () => {
  it("parses only exact reviewed four-market authority schemas", () => {
    expect(
      parseFourMarketCatalogScopeAuthority(JSON.stringify(scopeAuthority()))
    ).toEqual(scopeAuthority())
    expect(
      parseFourMarketCatalogTranslationAuthority(
        JSON.stringify(translationAuthority())
      )
    ).toEqual(translationAuthority())

    const wrongBinding = scopeAuthority()
    expect(() =>
      parseFourMarketCatalogScopeAuthority(
        JSON.stringify({
          ...wrongBinding,
          markets: wrongBinding.markets.map((market) =>
            market.market === "cz" ? { ...market, localeCode: "sk-SK" } : market
          ),
        })
      )
    ).toThrow("exact canonical binding")
    expect(() =>
      parseFourMarketCatalogTranslationAuthority(
        JSON.stringify({
          ...translationAuthority(),
          markets: [...translationAuthority().markets].reverse(),
        })
      )
    ).toThrow("exact ordered SK/CZ/HU/RO profiles")

    expect(() =>
      parseFourMarketCatalogTranslationAuthority(
        JSON.stringify({ ...translationAuthority(), schemaVersion: 1 })
      )
    ).toThrow("translation authority discriminator is invalid")
    const authorityWithCallerSelectedFields = translationAuthority()
    expect(() =>
      parseFourMarketCatalogTranslationAuthority(
        JSON.stringify({
          ...authorityWithCallerSelectedFields,
          markets: authorityWithCallerSelectedFields.markets.map((market) => ({
            ...market,
            publications: market.publications.map((publication) => ({
              ...publication,
              contracts: [{ requiredFields: ["title"] }],
            })),
          })),
        })
      )
    ).toThrow("must contain exactly")

    expect(() =>
      parseFourMarketCatalogScopeAuthority(
        JSON.stringify({ ...scopeAuthority(), schemaVersion: 1 })
      )
    ).toThrow("scope authority discriminator is invalid")
    const incompleteProduct = scopeAuthority()
    expect(() =>
      parseFourMarketCatalogScopeAuthority(
        JSON.stringify({
          ...incompleteProduct,
          sharedCatalog: incompleteProduct.sharedCatalog.map(
            ({ imageUrls: _imageUrls, ...product }) => product
          ),
        })
      )
    ).toThrow("must contain exactly")
  })

  it("collects the exact read-only snapshot required by the audit", async () => {
    const liveReader = reader()
    const input = await collectFourMarketCatalogAuditInput(
      liveReader,
      scopeAuthority(),
      translationAuthority()
    )
    const report = buildFourMarketCatalogAuditReport(
      input,
      "2026-08-21T01:00:00.000Z"
    )

    expect(report.ready).toBe(true)
    expect(input.expectedMarkets).toHaveLength(4)
    expect(input.products[0]?.variants[0]?.inventoryItemIds).toEqual([
      "iitem_shared",
    ])
    expect(input.products[0]).toMatchObject({
      brandId: "brand_shared",
      categoryIds: ["pcat_shared"],
      imageUrls: ["https://cdn.example.com/shared.jpg"],
      thumbnailUrl: "https://cdn.example.com/shared-thumbnail.jpg",
      variants: [
        {
          allowBackorder: false,
          currencyCodes: ["eur", "czk", "huf", "ron"],
          manageInventory: true,
        },
      ],
    })
    expect(liveReader.listGraphRows).toHaveBeenCalledTimes(5)
    expect(liveReader.listTranslations).toHaveBeenCalledTimes(4)
    expect(liveReader.listGraphRows).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "product",
        fields: expect.arrayContaining([
          "brand.id",
          "categories.id",
          "images.url",
          "thumbnail",
          "variants.allow_backorder",
          "variants.manage_inventory",
          "variants.prices.amount",
          "variants.prices.currency_code",
        ]),
      })
    )
  })

  it("fails closed when a live price row has no valid amount", async () => {
    const invalidReader = reader()
    vi.mocked(invalidReader.listGraphRows).mockImplementation(
      async ({ entity }) => {
        if (entity !== "product") {
          return reader().listGraphRows({ entity, fields: [] })
        }
        const rows = await reader().listGraphRows({ entity, fields: [] })
        return rows.map((row) => {
          if (!(row && typeof row === "object" && "variants" in row)) {
            return row
          }
          return {
            ...row,
            variants: (row.variants as readonly Record<string, unknown>[]).map(
              (variant) => ({
                ...variant,
                prices: [{ amount: null, currency_code: "eur" }],
              })
            ),
          }
        })
      }
    )

    await expect(
      collectFourMarketCatalogAuditInput(
        invalidReader,
        scopeAuthority(),
        translationAuthority()
      )
    ).rejects.toThrow("price.amount must be a non-negative finite number")
  })

  it("hash-binds reviewed authorities and emits one release-bound artifact", async () => {
    const scopeBytes = `${JSON.stringify(scopeAuthority())}\n`
    const translationBytes = `${JSON.stringify(translationAuthority())}\n`
    const writeArtifact = vi.fn(async () => {
      // Successful artifact writer seam.
    })
    const expected = releaseIdentity()
    const artifact = await runFourMarketCatalogLiveCollection(
      {
        expectedReleaseIdentity: expected,
        outputPath: "/private/catalog-live.json",
        scopeAuthority: {
          path: "/private/scope.json",
          sha256: hashFourMarketCatalogArtifactBytes(scopeBytes),
        },
        translationAuthority: {
          path: "/private/translations.json",
          sha256: hashFourMarketCatalogArtifactBytes(translationBytes),
        },
      },
      {
        buildDatabaseInstanceFingerprint: () =>
          expected.databaseInstanceFingerprint,
        environment: {
          BACKEND_BUILD_HASH: expected.backendBuildHash,
          MARKET_CATALOG_RELEASE_ID: expected.releaseId,
          RELEASE_SHA: expected.backendReleaseSha,
          RO_DEMO_ENVIRONMENT_ID: expected.environmentId,
          ZANE_DEPLOYMENT_ID: expected.backendDeploymentId,
          ZANE_DEPLOYMENT_SLOT: expected.backendSlot,
        },
        now: () => new Date("2026-08-21T01:00:00.000Z"),
        readTextFile: vi.fn(async (path) =>
          path.endsWith("scope.json") ? scopeBytes : translationBytes
        ),
        reader: reader(),
        writeArtifact,
      }
    )

    expect(artifact.audit.ready).toBe(true)
    expect(artifact.releaseIdentity).toEqual(expected)
    expect(writeArtifact).toHaveBeenCalledWith(
      "/private/catalog-live.json",
      artifact
    )

    await expect(
      runFourMarketCatalogLiveCollection(
        {
          expectedReleaseIdentity: expected,
          outputPath: "/private/catalog-live.json",
          scopeAuthority: {
            path: "/private/scope.json",
            sha256: "f".repeat(64),
          },
          translationAuthority: {
            path: "/private/translations.json",
            sha256: hashFourMarketCatalogArtifactBytes(translationBytes),
          },
        },
        {
          buildDatabaseInstanceFingerprint: () =>
            expected.databaseInstanceFingerprint,
          environment: {},
          now: () => new Date(),
          readTextFile: vi.fn(async (path) =>
            path.endsWith("scope.json") ? scopeBytes : translationBytes
          ),
          reader: reader(),
          writeArtifact,
        }
      )
    ).rejects.toThrow("scope authority bytes")
  })

  it("parses the repeated ExecArgs token seam and exposes no apply mode", () => {
    const values = {
      "--expected-backend-build-hash": "build-hash",
      "--expected-backend-deployment-id": "deployment-id",
      "--expected-backend-release-sha": "release-sha",
      "--expected-backend-slot": "blue",
      "--expected-database-instance-fingerprint":
        releaseIdentity().databaseInstanceFingerprint,
      "--expected-environment-id": "environment-id",
      "--expected-release-id": "release-id",
      "--output": "/private/catalog-live.json",
      "--scope-authority": "/private/scope.json",
      "--scope-authority-sha256": "b".repeat(64),
      "--translation-authority": "/private/translations.json",
      "--translation-authority-sha256": "c".repeat(64),
    }
    const args = Object.entries(values).flat()

    expect(parseFourMarketCatalogLiveCliOptions(args)).toEqual({
      expectedReleaseIdentity: releaseIdentity(),
      outputPath: values["--output"],
      scopeAuthority: {
        path: values["--scope-authority"],
        sha256: values["--scope-authority-sha256"],
      },
      translationAuthority: {
        path: values["--translation-authority"],
        sha256: values["--translation-authority-sha256"],
      },
    })
    expect(() =>
      parseFourMarketCatalogLiveCliOptions([...args, "--apply"])
    ).toThrow("Unknown four-market catalog live argument")
  })

  it("binds the current environment and database instance exactly", () => {
    const expected = releaseIdentity()
    expect(
      readFourMarketReleaseIdentity(
        expected,
        {
          BACKEND_BUILD_HASH: expected.backendBuildHash,
          MARKET_CATALOG_RELEASE_ID: expected.releaseId,
          RELEASE_SHA: expected.backendReleaseSha,
          RO_DEMO_ENVIRONMENT_ID: expected.environmentId,
          ZANE_DEPLOYMENT_ID: expected.backendDeploymentId,
          ZANE_DEPLOYMENT_SLOT: expected.backendSlot,
        },
        () => expected.databaseInstanceFingerprint
      )
    ).toEqual(expected)

    expect(() =>
      readFourMarketReleaseIdentity(
        expected,
        {
          BACKEND_BUILD_HASH: "other-build",
        },
        () => expected.databaseInstanceFingerprint
      )
    ).toThrow("does not match expected release identity")
  })

  it("writes one canonical private no-clobber live artifact", async () => {
    const directory = await mkdtemp(join(tmpdir(), "catalog-live-"))
    temporaryDirectories.push(directory)
    const outputPath = join(directory, "catalog-live.json")
    const input = await collectFourMarketCatalogAuditInput(
      reader(),
      scopeAuthority(),
      translationAuthority()
    )
    const audit = buildFourMarketCatalogAuditReport(
      input,
      "2026-08-21T01:00:00.000Z"
    )
    const artifact = buildFourMarketCatalogLiveArtifact({
      audit,
      authorities: {
        scope: { path: "/private/scope.json", sha256: "b".repeat(64) },
        translations: {
          path: "/private/translations.json",
          sha256: "c".repeat(64),
        },
      },
      capturedAt: "2026-08-21T01:00:00.000Z",
      releaseIdentity: releaseIdentity(),
    })

    await writeFourMarketCatalogLiveArtifact(outputPath, artifact)

    expect(await readFile(outputPath, "utf8")).toBe(
      serializeFourMarketCatalogLiveArtifact(artifact)
    )
    // biome-ignore lint/suspicious/noBitwiseOperators: POSIX permission bits require a mask.
    expect((await stat(outputPath)).mode & 0o777).toBe(0o600)
    expect(hashFourMarketCatalogLiveArtifact(artifact)).toMatch(SHA256_PATTERN)
    await expect(
      writeFourMarketCatalogLiveArtifact(outputPath, artifact)
    ).rejects.toMatchObject({ code: "EEXIST" })
  })
})
