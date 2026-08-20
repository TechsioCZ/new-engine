import type { Market } from "../../src/lib/url/types"
import {
  POPULATION_ENTITY_KINDS,
  POPULATION_MARKETS,
} from "../../src/lib/url-registry/population/manifest-contracts"
import {
  PopulationSourceExportError,
  type PopulationSourceExportPage,
  type PopulationSourceKind,
  parsePopulationSourceExportPage,
  populationSourceGroupKey,
} from "./population-manifest-source-contracts"

export type PopulationSourceFetchResponse = Readonly<{
  json: () => Promise<unknown>
  ok: boolean
  status: number
}>

export type PopulationSourceFetch = (
  input: string,
  init: Readonly<{
    headers: Readonly<Record<string, string>>
    method: "GET"
  }>
) => Promise<PopulationSourceFetchResponse>

export type PopulationSourceClientOptions = Readonly<{
  baseUrl: string
  fetchImpl?: PopulationSourceFetch
  maxPages?: number
  token: string
}>

const DEFAULT_MAX_PAGES = 1000

const populationSourceBaseUrl = (value: string): string => {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new PopulationSourceExportError(
      "population source baseUrl must be a credential-free HTTPS URL"
    )
  }
  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    value.includes("?") ||
    value.includes("#") ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new PopulationSourceExportError(
      "population source baseUrl must be credential-free HTTPS without query or fragment"
    )
  }
  return url.toString()
}

const sourceExportUrl = (
  baseUrl: string,
  market: Market,
  kind: PopulationSourceKind,
  page: number
): string => {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
  const url = new URL(`population-exports/${market}/${kind}`, base)
  url.searchParams.set("page", String(page))
  return url.toString()
}

/**
 * Fetches every page of one authenticated, paginated population-source
 * export (a single market/kind slot), enforcing strict in-order
 * pagination, a bearer-token GET-only request (never any mutating
 * method), and never including the token anywhere but the Authorization
 * header. Fails closed on a non-OK response, an out-of-order page, or a
 * pagination sequence that never terminates within `maxPages`.
 */
export const fetchPopulationSourceExport = async (
  market: Market,
  kind: PopulationSourceKind,
  options: PopulationSourceClientOptions
): Promise<readonly PopulationSourceExportPage[]> => {
  const fetchImpl = options.fetchImpl ?? fetch
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES
  const baseUrl = populationSourceBaseUrl(options.baseUrl)
  if (!Number.isSafeInteger(maxPages) || maxPages < 1) {
    throw new PopulationSourceExportError(
      "population source maxPages must be an integer >= 1"
    )
  }
  if (!options.token) {
    throw new PopulationSourceExportError(
      "population source bearer token must be non-empty"
    )
  }
  const groupLabel = `population-exports/${market}/${kind}`
  const pages: PopulationSourceExportPage[] = []
  for (let page = 1; ; page += 1) {
    if (page > maxPages) {
      throw new PopulationSourceExportError(
        `${groupLabel} exceeded ${maxPages} pages without completing pagination`
      )
    }
    const response = await fetchImpl(
      sourceExportUrl(baseUrl, market, kind, page),
      {
        headers: { authorization: `Bearer ${options.token}` },
        method: "GET",
      }
    )
    if (!response.ok) {
      throw new PopulationSourceExportError(
        `${groupLabel} page ${page} request failed with status ${response.status}`
      )
    }
    const parsed = parsePopulationSourceExportPage(
      await response.json(),
      { kind, market },
      groupLabel
    )
    if (parsed.page !== page) {
      throw new PopulationSourceExportError(
        `${groupLabel} returned out-of-order page ${parsed.page}, expected ${page}`
      )
    }
    pages.push(parsed)
    if (page >= parsed.pageCount) {
      return pages
    }
  }
}

/**
 * Fetches every page of every population-source export across all six
 * source kinds and all four markets, sequentially and in deterministic
 * (market-major, kind-minor) order.
 */
export const fetchAllPopulationSourceExports = async (
  options: PopulationSourceClientOptions
): Promise<ReadonlyMap<string, readonly PopulationSourceExportPage[]>> => {
  const groups = new Map<string, readonly PopulationSourceExportPage[]>()
  for (const market of POPULATION_MARKETS) {
    for (const kind of POPULATION_ENTITY_KINDS) {
      const pages = await fetchPopulationSourceExport(market, kind, options)
      groups.set(populationSourceGroupKey(market, kind), pages)
    }
  }
  return groups
}
