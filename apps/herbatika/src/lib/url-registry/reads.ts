import type { Market } from "@/lib/url/types"
import type {
  EntityUrlKind,
  EntityUrlRoute,
  UrlEntitySlug,
  UrlRouteKind,
} from "./model"

export type SourceReadResult<Value> =
  | Readonly<{ kind: "found"; value: Value }>
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "unavailable"; retryAfterSeconds?: number }>
  | Readonly<{ kind: "invalid-response"; causeCode: string }>

type CurrentResolution = Readonly<{
  disposition: "current"
  route: EntityUrlRoute
  matchedSlug: UrlEntitySlug
  currentSlug: UrlEntitySlug
}>

type AliasResolution = Readonly<{
  disposition: "alias"
  route: EntityUrlRoute
  matchedSlug: UrlEntitySlug
  currentSlug: UrlEntitySlug
}>

type GoneResolution = Readonly<{
  disposition: "gone"
  route: EntityUrlRoute | null
  matchedSlug: UrlEntitySlug
}>

type SupersededResolution = Readonly<{
  disposition: "superseded"
  route: EntityUrlRoute
  matchedSlug: UrlEntitySlug
  successorRoute: EntityUrlRoute
  currentSlug: UrlEntitySlug
}>

export type UrlRegistryResolution =
  | CurrentResolution
  | AliasResolution
  | GoneResolution
  | SupersededResolution

export type UrlRegistryLookupResult =
  | Readonly<{ kind: "found"; value: UrlRegistryResolution }>
  | Readonly<{ kind: "missing" }>

export type UrlRegistryResolveInput = Readonly<{
  market: Market
  kind: EntityUrlKind
  normalizedSlug: string
}>

export type UrlRegistryResolveManyInput = Readonly<{
  market: Market
  kind: EntityUrlKind
  normalizedSlugs: readonly string[]
}>

export type UrlRegistryBatchResolution = Readonly<{
  normalizedSlug: string
  result: UrlRegistryLookupResult
}>

export type EntityIdentityLookup = Readonly<{
  market: Market
  sourceSystem: string
  sourceType: string
  sourceId: string
}>

export type ActiveEntityRoutePageRequest = Readonly<{
  cursor?: string
  kind: EntityUrlKind
  limit: number
  market: Market
}>

export type ActiveEquivalenceLookup = Readonly<{
  kind: UrlRouteKind
  equivalenceKey: string
}>

export type UrlRegistryPageRequest = Readonly<{
  limit: number
  cursor?: string
}>

export type UrlRegistryPage<Value> = Readonly<{
  items: readonly Value[]
  nextCursor: string | null
}>
