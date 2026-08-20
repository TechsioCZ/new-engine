import {
  buildPopulationStaticTaxonomy,
  type PopulationStaticRoute,
  staticRoutePath,
} from "../../src/lib/url-registry/population/static-taxonomy"
import {
  hashStaticTaxonomyArtifact,
  RO_DEMO_STATIC_ROOTS,
} from "./static-taxonomy-approval"
import {
  demoStaticRoutes,
  type RouteUpdateCommand,
  STATIC_TAXONOMY_HASH,
  type StaticTaxonomyPreflightRow,
  type StaticTransitionAction,
  type StaticTransitionBlocker,
} from "./static-taxonomy-preflight-contract"
import { parseStaticTaxonomyPreflight } from "./static-taxonomy-preflight-parser"

const command = (
  route: StaticTaxonomyPreflightRow,
  expectedVersion: number,
  indexPolicy: "indexable" | "noindex",
  rollback: boolean
): RouteUpdateCommand => {
  if (!route.routeId) {
    throw new Error(`Cannot update missing route ${route.routeKey}`)
  }
  const transition = rollback ? "rollback-indexable" : "apply-noindex"
  const sourceEventId = `urlr-taxonomy-cutover-v1:${STATIC_TAXONOMY_HASH}:ro:${route.routeKey}:${transition}:v${expectedVersion}`
  return {
    idempotencyKey: sourceEventId,
    request: {
      commandType: "update-route",
      expectedVersion,
      metadata: {
        equivalenceKey: `static:${route.routeKey}`,
        indexPolicy,
      },
      source: {
        producer: "urlr-taxonomy-cutover-v1",
        sourceEventId,
        sourceId: route.routeKey,
        sourceSystem: "deployment",
        sourceType: "route-taxonomy",
        sourceVersion: STATIC_TAXONOMY_HASH,
      },
      target: {
        identity: {
          sourceId: null,
          sourceSystem: null,
          sourceType: null,
          staticRouteKey: route.routeKey,
          targetType: "static",
        },
        routeId: route.routeId,
      },
    },
  }
}

type Evaluation =
  | Readonly<{ action: StaticTransitionAction; kind: "action" }>
  | Readonly<{ blocker: StaticTransitionBlocker; kind: "blocker" }>
  | Readonly<{ kind: "noop"; routeKey: string }>

const pathMatches = (
  row: StaticTaxonomyPreflightRow,
  expected: PopulationStaticRoute
) => {
  const current = row.currentPaths[0]
  const publicPath = RO_DEMO_STATIC_ROOTS.find(
    ([key]) => `root:${key}` === row.routeKey
  )?.[1]
  return (
    row.currentPaths.length === 1 &&
    current?.parentRouteKey === expected.parentRouteKey &&
    current?.segment === expected.segment &&
    current?.matchMode === expected.matchMode &&
    staticRoutePath(expected, buildPopulationStaticTaxonomy()) === publicPath
  )
}

const blocker = (
  code: StaticTransitionBlocker["code"],
  message: string,
  routeKey: string
): Evaluation => ({ blocker: { code, message, routeKey }, kind: "blocker" })

const evaluate = (
  row: StaticTaxonomyPreflightRow,
  expected: PopulationStaticRoute
): Evaluation => {
  if (row.status !== "active") {
    return blocker(
      "TERMINAL_STATIC_ROUTE",
      `Existing route is ${row.status ?? "unknown"}; immutable identity cannot be recreated`,
      row.routeKey
    )
  }
  if (row.equivalenceKey !== expected.equivalenceKey) {
    return blocker(
      "STATIC_METADATA_CONFLICT",
      "Existing equivalence key differs from the approved taxonomy",
      row.routeKey
    )
  }
  if (!pathMatches(row, expected)) {
    return blocker(
      "STATIC_PATH_CONFLICT",
      "Existing current path differs from the approved taxonomy",
      row.routeKey
    )
  }
  if (row.indexPolicy === "noindex") {
    return { kind: "noop", routeKey: row.routeKey }
  }
  if (row.indexPolicy !== "indexable") {
    return blocker(
      "STATIC_METADATA_CONFLICT",
      `Unexpected index policy ${row.indexPolicy ?? "null"}`,
      row.routeKey
    )
  }
  const version = row.version as number
  if (!row.routeId) {
    throw new Error(`Existing route ${row.routeKey} has no route ID`)
  }
  return {
    action: {
      apply: command(row, version, "noindex", false),
      from: "indexable",
      kind: "update-route-index-policy",
      rollbackTemplate: command(row, version + 1, "indexable", true),
      routeId: row.routeId,
      routeKey: row.routeKey,
      to: "noindex",
    },
    kind: "action",
  }
}

export const buildStaticTaxonomyTransitionPlan = (value: unknown) => {
  const evidence = parseStaticTaxonomyPreflight(value)
  const expected = new Map(
    demoStaticRoutes().map((route) => [route.routeKey, route])
  )
  const existingCount = evidence.filter((row) => row.routeId !== null).length
  const blockers: StaticTransitionBlocker[] = []
  const actions: StaticTransitionAction[] = []
  const noops: string[] = []
  if (existingCount !== 0 && existingCount !== evidence.length) {
    blockers.push({
      code: "PARTIAL_STATIC_INVENTORY",
      message: `Expected either 0 or ${evidence.length} existing RO demo roots; found ${existingCount}`,
      routeKey: null,
    })
  }
  for (const row of evidence) {
    if (!row.routeId) {
      continue
    }
    const route = expected.get(row.routeKey)
    if (!route) {
      throw new Error(`No expected taxonomy for ${row.routeKey}`)
    }
    const result = evaluate(row, route)
    if (result.kind === "action") {
      actions.push(result.action)
    } else if (result.kind === "blocker") {
      blockers.push(result.blocker)
    } else {
      noops.push(result.routeKey)
    }
  }
  const core = {
    actions,
    blockers,
    evidenceHash: hashStaticTaxonomyArtifact(evidence),
    existingCount,
    mode:
      existingCount === 0 ? ("greenfield" as const) : ("transition" as const),
    noops: noops.sort(),
    ready: blockers.length === 0 && actions.length === 0,
    schemaVersion: 1 as const,
    taxonomyApprovalHash: STATIC_TAXONOMY_HASH,
  }
  return { ...core, transitionPlanHash: hashStaticTaxonomyArtifact(core) }
}
