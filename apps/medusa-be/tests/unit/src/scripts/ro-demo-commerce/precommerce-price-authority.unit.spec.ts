import { createHash } from "node:crypto"
import { describe, expect, it } from "vitest"
import {
  buildPrecommercePriceAuthority,
  type PrecommerceExpectedCounts,
  type PrecommerceExpectedSourceRoots,
  parsePrecommercePriceAuthority,
  serializePrecommercePriceAuthority,
  sha256PrecommerceInventoryIdentity,
  sha256PrecommercePriceAuthority,
} from "../../../../../src/scripts/ro-demo-commerce/precommerce-price-authority"

const HASH = "a".repeat(64)
const CAPTURED_AT = "2026-08-20T18:25:00.000Z"
const DOWNSTREAM_BINDING_IDENTIFIER =
  /shippingOptionId|taxRegionId|paymentProviderId|salesChannelId|regionId/
const counts: PrecommerceExpectedCounts = {
  excludedProducts: 1,
  excludedVariants: 1,
  inventoryProducts: 3,
  inventoryVariants: 4,
  publishedProducts: 2,
  publishedVariants: 3,
  sellableVariants: 2,
  unavailableVariants: 1,
}

const publishLine = ({
  ean,
  price,
  productId,
  sku,
  variantId,
}: Readonly<{
  ean: string
  price: number
  productId: string
  sku: null | string
  variantId: string
}>) => ({
  approval: "demo-generated-unreviewed",
  canonical_url: `https://www.herbatica.ro/products/${ean}/`,
  demo_scope: { decision: "publish-candidate" },
  ean,
  matchingStatus: "matched",
  medusaProductId: productId,
  medusa_match: {
    matching_variant_ids: [variantId],
    medusa: { matching_variant_ids: [variantId], product_id: productId },
    method: "exact_ean",
    official_identity: { ean, sku },
    status: "matched",
  },
  price: { amount: price, currency: "RON" },
  schema_version: 1,
  sku,
  source: { content_sha256: HASH, retrieved_at: CAPTURED_AT },
})

const fixture = () => {
  const mergedProductsJsonl = [
    publishLine({
      ean: "111",
      price: 12.5,
      productId: "prod_a",
      sku: "official-a",
      variantId: "variant_a",
    }),
    publishLine({
      ean: "222",
      price: 80,
      productId: "prod_b",
      sku: null,
      variantId: "variant_b",
    }),
    {
      approval: "demo-generated-unreviewed",
      demo_scope: { decision: "exclude-unreviewed" },
      schema_version: 1,
    },
  ]
    .map((value) => JSON.stringify(value))
    .join("\n")
  const products = [
    {
      id: "prod_b",
      variants: [{ ean: "222", id: "variant_b", sku: "live-b" }],
    },
    {
      id: "prod_excluded",
      variants: [{ ean: "444", id: "variant_excluded", sku: null }],
    },
    {
      id: "prod_a",
      variants: [
        { ean: "333", id: "variant_a_extra", sku: "extra-a" },
        { ean: "111", id: "variant_a", sku: "live-a" },
      ],
    },
  ]
  const rawLiveInventoryJson = JSON.stringify({ products })
  const inventoryEnvelopeJson = JSON.stringify({
    inventory: {
      products: products.map((product) => ({
        id: product.id,
        ...(product.id === "prod_excluded"
          ? {
              roExclusionDecision: {
                approvedAt: CAPTURED_AT,
                approvedBy: "user-demo-authorization",
                reason: "No exact official RO identity",
                reference: "demo:exclude:prod_excluded",
              },
            }
          : {}),
        variants: product.variants.map(({ ean, sku }) => ({ ean, sku })),
      })),
    },
    mergedEvidenceCapturedAt: CAPTURED_AT,
  })
  const root = (value: string) =>
    createHash("sha256").update(value, "utf8").digest("hex")
  const expectedRoots: PrecommerceExpectedSourceRoots = {
    inventoryEnvelopeSha256: root(inventoryEnvelopeJson),
    mergedProductsSha256: root(mergedProductsJsonl),
    rawLiveInventorySha256: root(rawLiveInventoryJson),
  }
  return {
    expectedRoots,
    input: {
      inventoryEnvelopeJson,
      mergedProductsJsonl,
      rawLiveInventoryJson,
    },
  }
}

describe("pre-commerce RO price authority", () => {
  it("binds official RON prices to the exact live product and variant partition", () => {
    const { expectedRoots, input } = fixture()
    const built = buildPrecommercePriceAuthority(
      input,
      counts,
      3,
      expectedRoots
    )

    expect(built.artifact.counts).toEqual(counts)
    expect(built.artifact.products.map(({ productId }) => productId)).toEqual([
      "prod_a",
      "prod_b",
    ])
    expect(built.artifact.products[0].variants).toEqual([
      expect.objectContaining({
        ean: "111",
        price: expect.objectContaining({ amount: 12.5, currencyCode: "ron" }),
        roAvailability: "sellable",
        variantId: "variant_a",
      }),
      {
        ean: "333",
        liveSku: "extra-a",
        officialSku: null,
        roAvailability: "unavailable",
        variantId: "variant_a_extra",
      },
    ])
    expect(built.artifact.exclusions).toEqual([
      expect.objectContaining({
        productId: "prod_excluded",
        variants: [
          { ean: "444", liveSku: null, variantId: "variant_excluded" },
        ],
      }),
    ])
    expect(built.canonicalJson.endsWith("\n")).toBe(true)
    expect(built.sha256).toBe(sha256PrecommercePriceAuthority(built.artifact))
    expect(
      parsePrecommercePriceAuthority(built.canonicalJson, counts, expectedRoots)
    ).toEqual(built.artifact)
  })

  it("derives the full inventory identity hash from all published and excluded variants", () => {
    const { expectedRoots, input } = fixture()
    const { artifact } = buildPrecommercePriceAuthority(
      input,
      counts,
      3,
      expectedRoots
    )
    const identity = [
      ...artifact.products.map(({ productId, variants }) => ({
        productId,
        variants: variants.map(({ ean, liveSku, variantId }) => ({
          ean,
          liveSku,
          variantId,
        })),
      })),
      ...artifact.exclusions.map(({ productId, variants }) => ({
        productId,
        variants,
      })),
    ].sort((left, right) => left.productId.localeCompare(right.productId))

    expect(artifact.inventoryIdentitySha256).toBe(
      sha256PrecommerceInventoryIdentity(identity)
    )
  })

  it("rejects an official-price edit against the reviewed merged source root", () => {
    const { expectedRoots, input } = fixture()
    const tampered = {
      ...input,
      mergedProductsJsonl: input.mergedProductsJsonl.replace(
        '"amount":12.5',
        '"amount":13.5'
      ),
    }

    expect(() =>
      buildPrecommercePriceAuthority(tampered, counts, 3, expectedRoots)
    ).toThrow("mergedProductsSha256 does not match the reviewed source root")
  })

  it("rejects root substitution and non-canonical authority bytes", () => {
    const { expectedRoots, input } = fixture()
    const built = buildPrecommercePriceAuthority(
      input,
      counts,
      3,
      expectedRoots
    )
    const substituted = {
      ...expectedRoots,
      mergedProductsSha256: "b".repeat(64),
    }

    expect(() =>
      parsePrecommercePriceAuthority(built.canonicalJson, counts, substituted)
    ).toThrow("mergedProductsSha256 does not match the reviewed source root")
    expect(() =>
      parsePrecommercePriceAuthority(
        serializePrecommercePriceAuthority(built.artifact).trimEnd(),
        counts,
        expectedRoots
      )
    ).toThrow("must be canonical JSON with LF")
  })

  it("contains no downstream commerce binding identifiers", () => {
    const { expectedRoots, input } = fixture()
    const { canonicalJson } = buildPrecommercePriceAuthority(
      input,
      counts,
      3,
      expectedRoots
    )

    expect(canonicalJson).not.toMatch(DOWNSTREAM_BINDING_IDENTIFIER)
  })
})
