import { MARKET_CODES, type MarketCode } from "@/lib/market/market-runtime"

const PUBLICATION_METADATA_KEY = "url_registry_publication"
const PUBLICATION_CONTRACT_KEYS = new Set(["markets", "schemaVersion"])
const PUBLICATION_ASSIGNMENT_KEYS = new Set([
  "publicationStatus",
  "publicSlug",
  "salesChannelId",
])
const PUBLIC_SLUG = /^(?=.*[a-z0-9])[a-z0-9-]+$/
const VISIBLE_ASCII = /^[\x21-\x7e]+$/

export type ProductPublicationAssignment = Readonly<{
  publicationStatus: "draft" | "published"
  publicSlug: string
  salesChannelId: string
}>

export type PublicationReadResult =
  | Readonly<{ kind: "found"; value: ProductPublicationAssignment }>
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "invalid-response" }>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const hasExactKeys = (
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  required: ReadonlySet<string> = allowed
) =>
  Object.keys(value).every((key) => allowed.has(key)) &&
  [...required].every((key) => Object.hasOwn(value, key))

const isIdentifier = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 255 &&
  VISIBLE_ASCII.test(value)

const parsePublicationAssignment = (
  value: unknown
): ProductPublicationAssignment | null => {
  if (!(isRecord(value) && hasExactKeys(value, PUBLICATION_ASSIGNMENT_KEYS))) {
    return null
  }
  if (
    (value.publicationStatus !== "draft" &&
      value.publicationStatus !== "published") ||
    typeof value.publicSlug !== "string" ||
    value.publicSlug.length > 255 ||
    !PUBLIC_SLUG.test(value.publicSlug) ||
    !isIdentifier(value.salesChannelId)
  ) {
    return null
  }
  return {
    publicationStatus: value.publicationStatus,
    publicSlug: value.publicSlug,
    salesChannelId: value.salesChannelId,
  }
}

export const readProductPublicationAssignment = (
  metadata: unknown,
  market: MarketCode
): PublicationReadResult => {
  if (metadata === null || metadata === undefined) {
    return { kind: "missing" }
  }
  if (!isRecord(metadata)) {
    return { kind: "invalid-response" }
  }
  const publication = metadata[PUBLICATION_METADATA_KEY]
  if (publication === null || publication === undefined) {
    return { kind: "missing" }
  }
  if (
    !(
      isRecord(publication) &&
      hasExactKeys(publication, PUBLICATION_CONTRACT_KEYS)
    ) ||
    publication.schemaVersion !== 1 ||
    !isRecord(publication.markets) ||
    !hasExactKeys(publication.markets, new Set(MARKET_CODES), new Set())
  ) {
    return { kind: "invalid-response" }
  }

  const parsedAssignments = new Map<MarketCode, ProductPublicationAssignment>()
  for (const configuredMarket of MARKET_CODES) {
    if (!Object.hasOwn(publication.markets, configuredMarket)) {
      continue
    }
    const assignment = parsePublicationAssignment(
      publication.markets[configuredMarket]
    )
    if (!assignment) {
      return { kind: "invalid-response" }
    }
    parsedAssignments.set(configuredMarket, assignment)
  }
  const assignment = parsedAssignments.get(market)
  return assignment ? { kind: "found", value: assignment } : { kind: "missing" }
}
