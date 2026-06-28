import { describe, expect, it } from "vitest"
import type { SmartSuggestSourceId } from "../src/source-catalog"
import {
  assertSmartSuggestSourceAllowsPermanentImport,
  getSmartSuggestSourcePolicy,
  requireSmartSuggestSourcePolicy,
  resolveSmartSuggestSourceId,
  SMART_SUGGEST_SOURCE_IDS,
  SMART_SUGGEST_SOURCE_POLICIES,
  smartSuggestSourceAllowsPermanentImport,
  smartSuggestSourceAllowsTtlCache,
  smartSuggestSourceAllowsWrite,
  smartSuggestSourceMaxTtlDays,
} from "../src/source-catalog"

describe("smart suggest source catalog", () => {
  const requiredSourceIds = [
    "ruian-cz",
    "register-adries-sk",
    "openaddresses",
    "mapy-cz",
    "radar-autocomplete",
    "here-discover",
    "nominatim-managed",
    "nominatim-public",
    "ruian-geocode",
  ] satisfies readonly SmartSuggestSourceId[]

  it("exports the required source policy entries", () => {
    expect(SMART_SUGGEST_SOURCE_IDS).toEqual(
      expect.arrayContaining(requiredSourceIds)
    )
    expect(SMART_SUGGEST_SOURCE_POLICIES).toHaveLength(
      SMART_SUGGEST_SOURCE_IDS.length
    )

    for (const sourceId of requiredSourceIds) {
      expect(getSmartSuggestSourcePolicy(sourceId)).toMatchObject({
        id: sourceId,
      })
    }
  })

  it("allows RUIAN CZ permanent owned imports with attribution and refresh metadata", () => {
    const policy = requireSmartSuggestSourcePolicy("ruian-cz")

    expect(policy).toMatchObject({
      attribution: {
        label: "CUZK RUIAN",
        license: "CC BY 4.0",
        licenseStatus: "confirmed",
        modificationNoticeRequired: true,
        required: true,
      },
      bulkImport: { allowed: true },
      cachePolicy: { kind: "permanent" },
      countryCoverage: {
        countryCodes: ["CZ"],
        kind: "countries",
      },
      durableRetention: { allowed: true },
      refresh: {
        cadence: "monthly",
        discovery: "atom",
        required: true,
      },
      sourceKind: "owned-dataset",
      status: "allowed",
    })
    expect(policy.notes.join(" ")).toContain("Atom")
    expect(smartSuggestSourceAllowsWrite("ruian-cz", "permanent-cache")).toBe(
      true
    )
    expect(smartSuggestSourceAllowsWrite("ruian-cz", "durable-retention")).toBe(
      true
    )
    expect(smartSuggestSourceAllowsWrite("ruian-cz", "bulk-import")).toBe(true)
    expect(smartSuggestSourceAllowsPermanentImport("ruian-cz")).toBe(true)
    expect(() =>
      assertSmartSuggestSourceAllowsPermanentImport("ruian-cz")
    ).not.toThrow()
  })

  it("blocks unsafe permanent source writes for live, pending, and blanket sources", () => {
    const unsafePermanentSourceIds = [
      "radar-autocomplete",
      "nominatim-public",
      "openaddresses",
      "register-adries-sk",
    ] satisfies readonly SmartSuggestSourceId[]

    for (const sourceId of unsafePermanentSourceIds) {
      expect(smartSuggestSourceAllowsWrite(sourceId, "permanent-cache")).toBe(
        false
      )
      expect(smartSuggestSourceAllowsWrite(sourceId, "durable-retention")).toBe(
        false
      )
      expect(smartSuggestSourceAllowsWrite(sourceId, "bulk-import")).toBe(false)
      expect(smartSuggestSourceAllowsPermanentImport(sourceId)).toBe(false)
      expect(() =>
        assertSmartSuggestSourceAllowsPermanentImport(sourceId)
      ).toThrow("permanent Smart Suggest source writes")
    }
  })

  it("allows deployment-approved live providers to save provider results permanently", () => {
    const deploymentApprovedProviderSourceIds = [
      "mapy-cz",
      "here-discover",
      "nominatim-managed",
    ] satisfies readonly SmartSuggestSourceId[]

    for (const sourceId of deploymentApprovedProviderSourceIds) {
      expect(requireSmartSuggestSourcePolicy(sourceId)).toMatchObject({
        cachePolicy: { kind: "permanent" },
        durableRetention: { allowed: true },
        sourceKind: "live-provider",
        status: "deployment-approved",
      })
      expect(smartSuggestSourceAllowsWrite(sourceId, "permanent-cache")).toBe(
        true
      )
      expect(smartSuggestSourceAllowsWrite(sourceId, "durable-retention")).toBe(
        true
      )
      expect(smartSuggestSourceAllowsWrite(sourceId, "bulk-import")).toBe(false)
      expect(smartSuggestSourceAllowsPermanentImport(sourceId)).toBe(false)
      expect(() =>
        assertSmartSuggestSourceAllowsPermanentImport(sourceId)
      ).toThrow("bulk-import/backfill permission")
    }
  })

  it("keeps live provider cache policy explicit", () => {
    expect(requireSmartSuggestSourcePolicy("mapy-cz")).toMatchObject({
      cachePolicy: { kind: "permanent" },
      durableRetention: { allowed: true },
    })
    expect(requireSmartSuggestSourcePolicy("radar-autocomplete")).toMatchObject(
      {
        cachePolicy: { kind: "ttl", maxTtlDays: 30 },
        durableRetention: { allowed: false },
      }
    )
    expect(requireSmartSuggestSourcePolicy("here-discover")).toMatchObject({
      cachePolicy: { kind: "permanent" },
      durableRetention: { allowed: true },
    })
    expect(requireSmartSuggestSourcePolicy("nominatim-managed")).toMatchObject({
      cachePolicy: { kind: "permanent" },
      durableRetention: { allowed: true },
    })
    expect(requireSmartSuggestSourcePolicy("nominatim-public")).toMatchObject({
      cachePolicy: { kind: "none" },
      status: "blocked",
    })

    expect(smartSuggestSourceAllowsTtlCache("mapy-cz", 1)).toBe(false)
    expect(smartSuggestSourceAllowsTtlCache("radar-autocomplete", 30)).toBe(
      true
    )
    expect(smartSuggestSourceAllowsTtlCache("radar-autocomplete", 31)).toBe(
      false
    )
    expect(smartSuggestSourceAllowsTtlCache("here-discover", 30)).toBe(false)
    expect(
      smartSuggestSourceAllowsTtlCache("here-discover", 30, {
        deploymentAllowsTtl: true,
      })
    ).toBe(false)
    expect(smartSuggestSourceMaxTtlDays("radar-autocomplete")).toBe(30)
    expect(smartSuggestSourceMaxTtlDays("mapy-cz")).toBeUndefined()
  })

  it("maps current provider ids to catalog ids where they differ", () => {
    expect(resolveSmartSuggestSourceId("nominatim")).toBe("nominatim-managed")
    expect(getSmartSuggestSourcePolicy("nominatim")).toMatchObject({
      id: "nominatim-managed",
      status: "deployment-approved",
    })
  })
})
