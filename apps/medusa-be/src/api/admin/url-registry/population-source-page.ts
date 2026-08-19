import { MedusaError } from "@medusajs/framework/utils"
import { resolveCatalogMarketLocale } from "../../../utils/catalog-translation"
import type {
  PopulationSourcePage,
  PopulationSourceQuery,
  PopulationSourceRead,
} from "./population-source-contracts"

export const createPopulationSourcePage = (
  query: PopulationSourceQuery,
  items: PopulationSourcePage["items"],
  total: number,
  scanned: number
): PopulationSourceRead => {
  if (
    !Number.isSafeInteger(total) ||
    total < 0 ||
    !Number.isSafeInteger(scanned) ||
    scanned < 0 ||
    (scanned === 0 && query.offset < total)
  ) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Population source returned invalid pagination metadata"
    )
  }
  const sourceIds = new Set<string>()
  const publicSlugs = new Set<string>()
  for (const item of items) {
    if (sourceIds.has(item.sourceId)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Population source returned a duplicate stable ID"
      )
    }
    sourceIds.add(item.sourceId)
    if ("publicSlug" in item) {
      if (publicSlugs.has(item.publicSlug)) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "Population source returned a duplicate public slug"
        )
      }
      publicSlugs.add(item.publicSlug)
    }
  }
  const nextOffset = query.offset + scanned
  const complete = nextOffset >= total
  return {
    kind: "found",
    page: {
      complete,
      items,
      locale: resolveCatalogMarketLocale(query.market) ?? "",
      market: query.market,
      nextOffset: complete ? null : nextOffset,
      offset: query.offset,
      scanned,
      schemaVersion: 1,
      sourceKind: query.sourceKind,
      total,
    },
  }
}
