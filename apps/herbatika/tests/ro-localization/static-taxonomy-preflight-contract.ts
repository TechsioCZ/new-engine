import type { UpdateRouteRequest } from "../../src/lib/url-registry/commands"
import type { StaticRouteIdentity } from "../../src/lib/url-registry/model"
import {
  buildPopulationStaticTaxonomy,
  type PopulationStaticRoute,
} from "../../src/lib/url-registry/population/static-taxonomy"
import {
  APPROVED_STATIC_TAXONOMY_HASH,
  RO_DEMO_STATIC_ROOTS,
} from "./static-taxonomy-approval"

export const STATIC_TAXONOMY_HASH = APPROVED_STATIC_TAXONOMY_HASH

export type CurrentPathEvidence = Readonly<{
  matchMode: string
  parentRouteKey: null | string
  segment: string
}>

export type StaticTaxonomyPreflightRow = Readonly<{
  currentPaths: readonly CurrentPathEvidence[]
  equivalenceKey: null | string
  indexPolicy: null | string
  routeId: null | string
  routeKey: string
  status: null | string
  version: null | number
}>

export type RouteUpdateCommand = Readonly<{
  idempotencyKey: string
  request: UpdateRouteRequest<StaticRouteIdentity>
}>

export type StaticTransitionAction = Readonly<{
  apply: RouteUpdateCommand
  from: "indexable"
  kind: "update-route-index-policy"
  rollbackTemplate: RouteUpdateCommand
  routeKey: string
  routeId: string
  to: "noindex"
}>

export type StaticTransitionBlocker = Readonly<{
  code:
    | "PARTIAL_STATIC_INVENTORY"
    | "STATIC_METADATA_CONFLICT"
    | "STATIC_PATH_CONFLICT"
    | "TERMINAL_STATIC_ROUTE"
  message: string
  routeKey: string | null
}>

export const demoStaticRoutes = (
  routes: readonly PopulationStaticRoute[] = buildPopulationStaticTaxonomy()
) => {
  const keys = new Set(RO_DEMO_STATIC_ROOTS.map(([key]) => `root:${key}`))
  return routes
    .filter((route) => route.market === "ro" && keys.has(route.routeKey))
    .sort((left, right) => left.routeKey.localeCompare(right.routeKey))
}
