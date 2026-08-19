import type { Market } from "@/lib/url/types"

export type EntityUrlKind =
  | "product"
  | "category"
  | "brand"
  | "collection"
  | "campaign"
  | "article"
  | "page"

/**
 * Issue #545 does not name a static kind. This repo-local hardening keeps the
 * projections disjoint: entity kinds own slugs; `static` owns path rows.
 */
export type UrlRouteKind = EntityUrlKind | "static"
export type UrlRouteStatus = "active" | "retired" | "superseded"
export type UrlSlugDisposition = "current" | "alias" | "gone"
export type StaticPathDisposition = "current" | "alias"
export type StaticPathMatchMode = "exact" | "prefix"
export type UrlIndexPolicy = "indexable" | "noindex"

export type EntityRouteIdentity = Readonly<{
  targetType: "entity"
  sourceSystem: string
  sourceType: string
  sourceId: string
  staticRouteKey: null
}>

export type StaticRouteIdentity = Readonly<{
  targetType: "static"
  sourceSystem: null
  sourceType: null
  sourceId: null
  staticRouteKey: string
}>

export type UrlRouteIdentity = EntityRouteIdentity | StaticRouteIdentity

type UrlRouteBase = Readonly<{
  id: string
  market: Market
  equivalenceKey: string | null
  indexPolicy: UrlIndexPolicy
  status: UrlRouteStatus
  successorRouteId: string | null
  version: number
  createdAt: string
  updatedAt: string
}>

export type EntityUrlRoute = UrlRouteBase &
  Readonly<{
    kind: EntityUrlKind
    targetType: "entity"
    sourceSystem: string
    sourceType: string
    sourceId: string
    staticRouteKey: null
  }>

export type StaticUrlRoute = UrlRouteBase &
  Readonly<{
    kind: "static"
    targetType: "static"
    sourceSystem: null
    sourceType: null
    sourceId: null
    staticRouteKey: string
  }>

export type UrlRoute = EntityUrlRoute | StaticUrlRoute

export type UrlEntitySlug = Readonly<{
  id: string
  market: Market
  kind: EntityUrlKind
  normalizedSlug: string
  routeId: string | null
  disposition: UrlSlugDisposition
  normalizationVersion: number
  createdAt: string
}>

export type StaticRoutePath = Readonly<{
  id: string
  market: Market
  routeKey: string
  parentRouteKey: string | null
  segment: string
  matchMode: StaticPathMatchMode
  disposition: StaticPathDisposition
  introducedInVersion: number
  createdAt: string
}>

export type EntityRouteSnapshot = Readonly<{
  projectionType: "entity"
  route: EntityUrlRoute
  currentSlug: UrlEntitySlug
  slugHistory: readonly UrlEntitySlug[]
}>

export type StaticRouteSnapshot = Readonly<{
  projectionType: "static"
  route: StaticUrlRoute
  currentPath: StaticRoutePath
  pathHistory: readonly StaticRoutePath[]
}>

export type UrlRouteSnapshot = EntityRouteSnapshot | StaticRouteSnapshot

export type ActiveEntityRouteTarget = Readonly<{
  projectionType: "entity"
  route: EntityUrlRoute
  currentSlug: UrlEntitySlug
}>

export type ActiveStaticRouteTarget = Readonly<{
  projectionType: "static"
  route: StaticUrlRoute
  currentPath: StaticRoutePath
}>

export type ActiveRouteTarget =
  | ActiveEntityRouteTarget
  | ActiveStaticRouteTarget

export const identityFromRoute = (route: UrlRoute): UrlRouteIdentity =>
  route.targetType === "entity"
    ? {
        targetType: "entity",
        sourceSystem: route.sourceSystem,
        sourceType: route.sourceType,
        sourceId: route.sourceId,
        staticRouteKey: null,
      }
    : {
        targetType: "static",
        sourceSystem: null,
        sourceType: null,
        sourceId: null,
        staticRouteKey: route.staticRouteKey,
      }
