import type { Market } from "@/lib/url/types"
import {
  parseCatalogAuthority,
  parseContentAuthority,
} from "./manifest-authorities"
import {
  POPULATION_CATALOG_KINDS,
  POPULATION_CONTENT_KINDS,
  POPULATION_ENTITY_KINDS,
  POPULATION_LOCALE_BY_MARKET,
  POPULATION_MARKETS,
  POPULATION_SHA256,
  POPULATION_SLUG,
  type PopulationBinding,
  type PopulationEntity,
  PopulationManifestError,
  type TaxonomyApproval,
} from "./manifest-contracts"
import {
  assertPopulationExactKeys,
  populationOneOf,
  populationRecord,
  populationText,
} from "./manifest-primitives"
import { hashPopulationStaticTaxonomy } from "./static-taxonomy"

export const parsePopulationBinding = (
  value: unknown,
  index: number
): PopulationBinding => {
  const label = `bindings[${index}]`
  const input = populationRecord(value, label)
  assertPopulationExactKeys(
    input,
    ["locale", "market", "salesChannelId"],
    label
  )
  const market = populationOneOf(
    input.market,
    POPULATION_MARKETS,
    `${label}.market`
  )
  const locale = populationText(input.locale, `${label}.locale`)
  if (locale !== POPULATION_LOCALE_BY_MARKET[market]) {
    throw new PopulationManifestError(`${label}.locale does not match market`)
  }
  return {
    locale,
    market,
    salesChannelId: populationText(
      input.salesChannelId,
      `${label}.salesChannelId`
    ),
  }
}

export const parsePopulationApproval = (value: unknown): TaxonomyApproval => {
  const input = populationRecord(value, "taxonomyApproval")
  assertPopulationExactKeys(input, ["hash", "markets"], "taxonomyApproval")
  if (typeof input.hash !== "string" || !POPULATION_SHA256.test(input.hash)) {
    throw new PopulationManifestError("taxonomyApproval.hash is invalid")
  }
  if (input.hash !== hashPopulationStaticTaxonomy()) {
    throw new PopulationManifestError(
      "taxonomyApproval.hash does not match this build"
    )
  }
  const markets = populationRecord(input.markets, "taxonomyApproval.markets")
  assertPopulationExactKeys(
    markets,
    POPULATION_MARKETS,
    "taxonomyApproval.markets"
  )
  return {
    hash: input.hash as `sha256:${string}`,
    markets: Object.fromEntries(
      POPULATION_MARKETS.map((market) => {
        const label = `taxonomyApproval.markets.${market}`
        const approval = populationRecord(markets[market], label)
        assertPopulationExactKeys(
          approval,
          ["editorialApproval", "legalApproval"],
          label
        )
        return [
          market,
          {
            editorialApproval: populationText(
              approval.editorialApproval,
              `${label}.editorialApproval`
            ),
            legalApproval: populationText(
              approval.legalApproval,
              `${label}.legalApproval`
            ),
          },
        ]
      })
    ) as TaxonomyApproval["markets"],
  }
}

const parseEntityBase = (
  input: Record<string, unknown>,
  label: string,
  bindings: ReadonlyMap<Market, PopulationBinding>
) => {
  const kind = populationOneOf(
    input.kind,
    POPULATION_ENTITY_KINDS,
    `${label}.kind`
  )
  const market = populationOneOf(
    input.market,
    POPULATION_MARKETS,
    `${label}.market`
  )
  const binding = bindings.get(market)
  if (!binding) {
    throw new PopulationManifestError(`${label} has no unique market binding`)
  }
  if (
    typeof input.publicSlug !== "string" ||
    input.publicSlug.length > 80 ||
    !POPULATION_SLUG.test(input.publicSlug)
  ) {
    throw new PopulationManifestError(`${label}.publicSlug is invalid`)
  }
  return {
    base: {
      equivalenceKey: populationText(
        input.equivalenceKey,
        `${label}.equivalenceKey`
      ),
      indexPolicy: populationOneOf(
        input.indexPolicy,
        ["indexable", "noindex"] as const,
        `${label}.indexPolicy`
      ),
      kind,
      market,
      publicSlug: input.publicSlug,
      sourceEventId: populationText(
        input.sourceEventId,
        `${label}.sourceEventId`
      ),
      sourceId: populationText(input.sourceId, `${label}.sourceId`),
      sourceVersion: populationText(
        input.sourceVersion,
        `${label}.sourceVersion`
      ),
    },
    binding,
    kind,
    market,
  }
}

export const parsePopulationEntity = (
  value: unknown,
  index: number,
  bindings: ReadonlyMap<Market, PopulationBinding>
): PopulationEntity => {
  const label = `entities[${index}]`
  const input = populationRecord(value, label)
  assertPopulationExactKeys(
    input,
    [
      "authority",
      "equivalenceKey",
      "indexPolicy",
      "kind",
      "market",
      "publicSlug",
      "sourceEventId",
      "sourceId",
      "sourceVersion",
    ],
    label
  )
  const parsed = parseEntityBase(input, label, bindings)
  const authority = populationRecord(input.authority, `${label}.authority`)
  if ((POPULATION_CATALOG_KINDS as readonly string[]).includes(parsed.kind)) {
    const catalogKind = parsed.kind as (typeof POPULATION_CATALOG_KINDS)[number]
    const catalogAuthority = parseCatalogAuthority(
      authority,
      `${label}.authority`,
      parsed.binding,
      catalogKind
    )
    if (
      catalogKind === "product" &&
      catalogAuthority.kind === "medusa-product-publication"
    ) {
      return {
        ...parsed.base,
        authority: catalogAuthority,
        kind: "product",
      }
    }
    const assignedKind = populationOneOf(
      catalogKind,
      ["category", "brand", "collection"] as const,
      `${label}.kind`
    )
    if (catalogAuthority.kind !== "medusa-published-assignment") {
      throw new PopulationManifestError(`${label}.authority kind mismatch`)
    }
    return {
      ...parsed.base,
      authority: catalogAuthority,
      kind: assignedKind,
    }
  }
  return {
    ...parsed.base,
    kind: populationOneOf(
      parsed.kind,
      POPULATION_CONTENT_KINDS,
      `${label}.kind`
    ),
    authority: parseContentAuthority(
      authority,
      `${label}.authority`,
      parsed.binding
    ),
  }
}
