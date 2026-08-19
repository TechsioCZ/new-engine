import { isCatalogMarket } from "../../../utils/catalog-translation"
import {
  POPULATION_SOURCE_KINDS,
  type PopulationSourceQuery,
} from "./population-source-contracts"

const MAX_LIMIT = 100

const integer = (value: unknown, fallback: number): number | null => {
  const parsed = value === undefined ? fallback : Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

export const parsePopulationSourceQuery = (
  query: Readonly<Record<string, unknown>>
): PopulationSourceQuery | null => {
  const limit = integer(query.limit, 50)
  const offset = integer(query.offset, 0)
  const sourceKind = query.sourceKind
  if (
    !(limit && limit <= MAX_LIMIT) ||
    offset === null ||
    typeof sourceKind !== "string" ||
    !POPULATION_SOURCE_KINDS.includes(
      sourceKind as (typeof POPULATION_SOURCE_KINDS)[number]
    ) ||
    !isCatalogMarket(query.market)
  ) {
    return null
  }
  return {
    limit,
    market: query.market,
    offset,
    sourceKind: sourceKind as PopulationSourceQuery["sourceKind"],
  }
}
