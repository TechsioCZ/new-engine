import { describe, expect, it } from "vitest"
import {
  type MarketVariantAuthorityRecord,
  normalizeMarketVariantAuthorityEnvelope,
  resolveExactMarketVariantAuthority,
} from "../contracts"

const HASH = "a".repeat(64)
const SOURCE_VERSION = "ro-demo-2026-08-20"

const record = (
  variantId: string,
  availability: "sellable" | "unavailable" = "sellable"
): MarketVariantAuthorityRecord => ({
  approval_provenance: { decisionId: `approval-${variantId}` },
  authority_sha256: HASH,
  availability,
  market_code: "ro",
  product_id: "prod_1",
  source_provenance: { recordKey: `source-${variantId}` },
  source_version: SOURCE_VERSION,
  variant_id: variantId,
})

describe("market variant authority contracts", () => {
  it("normalizes one exhaustive authority envelope without changing identities", () => {
    expect(
      normalizeMarketVariantAuthorityEnvelope({
        authoritySha256: HASH.toUpperCase(),
        entries: [
          {
            approvalProvenance: { decisionId: "approval-1" },
            availability: "sellable",
            productId: " prod_1 ",
            sourceProvenance: { recordKey: "source-1" },
            variantId: " variant_1 ",
          },
        ],
        marketCode: "RO",
        sourceVersion: ` ${SOURCE_VERSION} `,
      })
    ).toEqual({
      authoritySha256: HASH,
      entries: [
        {
          approval_provenance: { decisionId: "approval-1" },
          authority_sha256: HASH,
          availability: "sellable",
          market_code: "ro",
          product_id: "prod_1",
          source_provenance: { recordKey: "source-1" },
          source_version: SOURCE_VERSION,
          variant_id: "variant_1",
        },
      ],
      marketCode: "ro",
      sourceVersion: SOURCE_VERSION,
    })
  })

  it("returns exact sellable and unavailable sets", () => {
    const resolved = resolveExactMarketVariantAuthority({
      authoritySha256: HASH,
      marketCode: "ro",
      productId: "prod_1",
      records: [record("variant_1"), record("variant_2", "unavailable")],
      sourceVersion: SOURCE_VERSION,
      variantIds: ["variant_1", "variant_2"],
    })

    expect([...resolved.sellableVariantIds]).toEqual(["variant_1"])
    expect([...resolved.unavailableVariantIds]).toEqual(["variant_2"])
    expect(resolved.byVariantId.get("variant_2")?.availability).toBe(
      "unavailable"
    )
  })

  it.each([
    {
      label: "missing rows",
      records: [record("variant_1")],
      variantIds: ["variant_1", "variant_2"],
      message: "Missing current market variant authority",
    },
    {
      label: "duplicate rows",
      records: [record("variant_1"), record("variant_1")],
      variantIds: ["variant_1"],
      message: "Duplicate current market variant authority",
    },
    {
      label: "unexpected rows",
      records: [record("variant_1"), record("variant_2")],
      variantIds: ["variant_1"],
      message: "Unexpected market variant authority variant",
    },
    {
      label: "hash mismatch",
      records: [{ ...record("variant_1"), authority_sha256: "b".repeat(64) }],
      variantIds: ["variant_1"],
      message: "Market variant authority hash mismatch",
    },
    {
      label: "mixed source versions",
      records: [
        record("variant_1"),
        { ...record("variant_2"), source_version: "other" },
      ],
      variantIds: ["variant_1", "variant_2"],
      message: "Mixed market variant authority source versions",
    },
    {
      label: "empty source version",
      records: [{ ...record("variant_1"), source_version: "" }],
      variantIds: ["variant_1"],
      message: "source_version must be a non-empty string",
    },
    {
      label: "non-null deletion marker",
      records: [{ ...record("variant_1"), deleted_at: "" }],
      variantIds: ["variant_1"],
      message: "Retired market variant authority was supplied",
    },
  ])("fails closed for $label", ({ message, records, variantIds }) => {
    expect(() =>
      resolveExactMarketVariantAuthority({
        authoritySha256: HASH,
        marketCode: "ro",
        productId: "prod_1",
        records,
        variantIds,
      })
    ).toThrow(message)
  })

  it("rejects duplicate expected variants and empty provenance", () => {
    expect(() =>
      resolveExactMarketVariantAuthority({
        authoritySha256: HASH,
        marketCode: "ro",
        productId: "prod_1",
        records: [record("variant_1")],
        variantIds: ["variant_1", "variant_1"],
      })
    ).toThrow("variantIds must contain each expected variant exactly once")

    expect(() =>
      resolveExactMarketVariantAuthority({
        authoritySha256: HASH,
        marketCode: "ro",
        productId: "prod_1",
        records: [record("variant_1")],
        sourceVersion: " ",
        variantIds: ["variant_1"],
      })
    ).toThrow("sourceVersion must be a non-empty string")

    expect(() =>
      normalizeMarketVariantAuthorityEnvelope({
        authoritySha256: HASH,
        entries: [
          {
            approvalProvenance: {},
            availability: "sellable",
            productId: "prod_1",
            sourceProvenance: { recordKey: "source" },
            variantId: "variant_1",
          },
        ],
        marketCode: "ro",
        sourceVersion: SOURCE_VERSION,
      })
    ).toThrow("approvalProvenance must be a non-empty JSON object")

    expect(() =>
      normalizeMarketVariantAuthorityEnvelope({
        authoritySha256: HASH,
        entries: [],
        marketCode: "ro",
        sourceVersion: SOURCE_VERSION,
      })
    ).toThrow("entries must contain at least one market variant authority")
  })
})
