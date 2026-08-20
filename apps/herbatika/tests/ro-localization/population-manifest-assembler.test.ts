import { describe, expect, it } from "vitest"
import {
  POPULATION_ENTITY_KINDS,
  POPULATION_LOCALE_BY_MARKET,
  POPULATION_MARKETS,
  type TaxonomyApproval,
} from "../../src/lib/url-registry/population/manifest-contracts"
import { hashPopulationStaticTaxonomy } from "../../src/lib/url-registry/population/static-taxonomy"
import {
  assemblePopulationManifest,
  canonicalPopulationManifestBytes,
} from "./population-manifest-assembler"
import {
  type PopulationSourceExportItem,
  type PopulationSourceExportPage,
  type PopulationSourceKind,
  populationSourceGroupKey,
} from "./population-manifest-source-contracts"

const approval: TaxonomyApproval = {
  hash: hashPopulationStaticTaxonomy(),
  markets: {
    cz: { editorialApproval: "approved", legalApproval: "approved" },
    hu: { editorialApproval: "approved", legalApproval: "approved" },
    ro: { editorialApproval: "approved", legalApproval: "approved" },
    sk: { editorialApproval: "approved", legalApproval: "approved" },
  },
}

const roCount = (kind: PopulationSourceKind) =>
  ({
    article: 0,
    brand: 103,
    category: 207,
    collection: 0,
    page: 0,
    product: 2002,
  })[kind]

const item = (
  kind: PopulationSourceKind,
  index: number
): PopulationSourceExportItem => ({
  assignmentId:
    kind === "brand" || kind === "category" || kind === "collection"
      ? `assignment_${kind}_${index}`
      : null,
  equivalenceKey: `equivalence:${kind}:${index}`,
  indexPolicy: "indexable",
  publicSlug: `${kind}-${index}`,
  slugMappingId:
    kind === "article" || kind === "page" ? `mapping_${kind}_${index}` : null,
  sourceId: `${kind}_${index}`,
  sourceVersion: `version_${index}`,
})

const groups = (reverseItems: boolean) => {
  const result = new Map<string, readonly PopulationSourceExportPage[]>()
  for (const market of [...POPULATION_MARKETS].reverse()) {
    for (const kind of [...POPULATION_ENTITY_KINDS].reverse()) {
      const items =
        market === "ro"
          ? Array.from({ length: roCount(kind) }, (_, index) =>
              item(kind, index)
            )
          : []
      if (reverseItems) {
        items.reverse()
      }
      result.set(populationSourceGroupKey(market, kind), [
        {
          binding: {
            locale: POPULATION_LOCALE_BY_MARKET[market],
            salesChannelId: `sales-channel-${market}`,
          },
          itemCount: items.length,
          items,
          kind,
          market,
          page: 1,
          pageCount: 1,
          schemaVersion: 1,
          snapshotId: `snapshot-${market}`,
        },
      ])
    }
  }
  return result
}

describe("population manifest assembler", () => {
  it("produces identical canonical bytes regardless of export item ordering", () => {
    const options = {
      generatedAt: "2026-08-20T18:00:00.000Z",
      taxonomyApproval: approval,
    }
    const forward = assemblePopulationManifest({
      ...options,
      groups: groups(false),
    })
    const reversed = assemblePopulationManifest({
      ...options,
      groups: groups(true),
    })

    expect(reversed.manifestHash).toBe(forward.manifestHash)
    expect(canonicalPopulationManifestBytes(reversed.manifest)).toBe(
      canonicalPopulationManifestBytes(forward.manifest)
    )
    expect(forward.roPublicationScope).toEqual({
      brand: 103,
      category: 207,
      collection: 0,
      product: 2002,
    })
  })

  it("rejects extra source groups instead of silently excluding them", () => {
    const sourceGroups = groups(false)
    sourceGroups.set("ro:unexpected", sourceGroups.get("ro:product") ?? [])
    expect(() =>
      assemblePopulationManifest({
        generatedAt: "2026-08-20T18:00:00.000Z",
        groups: sourceGroups,
        taxonomyApproval: approval,
      })
    ).toThrow("exactly every market/kind slot")
  })
})
