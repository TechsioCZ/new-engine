import { createHash } from "node:crypto"
import {
  hashPopulationStaticTaxonomy,
  type PopulationStaticRoute,
  staticRoutePath,
} from "../../src/lib/url-registry/population/static-taxonomy"

const ROOT_ROUTE_PREFIX = /^root:/

export const APPROVED_STATIC_TAXONOMY_HASH =
  "sha256:82b02610cfd4346b1251c261e2a0cdfbd91ea0701d8e617f75b20dc61724a0d9"

export const APPROVED_STATIC_CUTOVER_PLAN_HASH =
  "sha256:8a9d5879cf8c0b1931a69a5459484a12334332d7febb0515736364904ede4529"

export const RO_DEMO_STATIC_APPROVAL = Object.freeze({
  editorialApproval: "demo-generated-unreviewed:ro-static-pages:v1",
  legalApproval: "demo-generated-unreviewed:ro-static-legal:v1",
})

export const RO_DEMO_STATIC_ROOTS = Object.freeze([
  ["affiliate", "/program-afiliere"],
  ["contact", "/contact"],
  ["cookies", "/politica-cookies"],
  ["dropshipping", "/dropshipping"],
  ["giftVoucher", "/voucher-cadou"],
  ["privacy", "/politica-de-confidentialitate"],
  ["privateLabel", "/marca-proprie"],
  ["returns", "/retururi"],
  ["shipping", "/livrare"],
  ["terms", "/termeni-si-conditii"],
  ["wholesale", "/vanzare-en-gros"],
] as const)

const APPROVED_MARKET_PROJECTIONS = Object.freeze({
  cz: [
    36,
    "sha256:5d4056d09c0bfb03e59e5c4d666ebcfdce40db409aaa77a5ffa5d82ec19ed086",
  ],
  hu: [
    36,
    "sha256:a312e8716adad9d30b6979cd3e191496fe49b98a95d626cc95db12e3a8608564",
  ],
  sk: [
    36,
    "sha256:0158ec934add6f522e02e77ceb4ae792e2c80524632a61d23c97af6234d0e0e8",
  ],
} as const)

type DemoRootKey = (typeof RO_DEMO_STATIC_ROOTS)[number][0]

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stableValue)
  }
  if (value === null || typeof value !== "object") {
    return value
  }
  const record = value as Readonly<Record<string, unknown>>
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .map((key) => [key, stableValue(record[key])])
  )
}

export const hashStaticTaxonomyArtifact = (
  value: unknown
): `sha256:${string}` =>
  `sha256:${createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex")}`

export const assertApprovedStaticCutoverPlan = (
  plan: unknown
): `sha256:${string}` => {
  const planHash = hashStaticTaxonomyArtifact(plan)
  if (planHash !== APPROVED_STATIC_CUTOVER_PLAN_HASH) {
    throw new Error(
      "Static cutover plan differs from the approved release plan"
    )
  }
  return planHash
}

export const projectStaticTaxonomy = (
  routes: readonly PopulationStaticRoute[]
) =>
  [...routes]
    .sort((left, right) =>
      `${left.market}:${left.routeKey}`.localeCompare(
        `${right.market}:${right.routeKey}`
      )
    )
    .map((route) => ({
      indexPolicy: route.indexPolicy,
      market: route.market,
      matchMode: route.matchMode,
      parentRouteKey: route.parentRouteKey,
      path: staticRoutePath(route, routes),
      routeKey: route.routeKey,
    }))

const assertRoEditorialRoots = (routes: readonly PopulationStaticRoute[]) => {
  for (const [pageKey, expectedPath] of [
    ["about", "/despre-noi"],
    ["faq", "/intrebari-frecvente"],
  ] as const) {
    const route = routes.find(
      (candidate) =>
        candidate.market === "ro" && candidate.routeKey === `root:${pageKey}`
    )
    if (
      !route ||
      route.indexPolicy !== "indexable" ||
      route.matchMode !== "exact" ||
      route.parentRouteKey !== null ||
      staticRoutePath(route, routes) !== expectedPath
    ) {
      throw new Error(
        `RO ${pageKey} root must remain indexable at ${expectedPath}`
      )
    }
  }
}

const assertRoDemoRoots = (routes: readonly PopulationStaticRoute[]) => {
  const expected = new Map<DemoRootKey, string>(RO_DEMO_STATIC_ROOTS)
  const actual = routes.filter((route) => {
    const key = route.routeKey.replace(ROOT_ROUTE_PREFIX, "") as DemoRootKey
    return route.market === "ro" && expected.has(key)
  })
  if (actual.length !== RO_DEMO_STATIC_ROOTS.length) {
    throw new Error(
      `RO demo taxonomy must contain exactly 11 roots; found ${actual.length}`
    )
  }
  for (const route of actual) {
    const pageKey = route.routeKey.replace(ROOT_ROUTE_PREFIX, "") as DemoRootKey
    if (staticRoutePath(route, routes) !== expected.get(pageKey)) {
      throw new Error(`RO demo route ${pageKey} has an unexpected public path`)
    }
    if (route.indexPolicy !== "noindex") {
      throw new Error(`RO demo route ${pageKey} must be noindex`)
    }
    if (route.matchMode !== "exact" || route.parentRouteKey !== null) {
      throw new Error(`RO demo route ${pageKey} must be an exact root route`)
    }
  }
}

const assertMarketIsolation = (routes: readonly PopulationStaticRoute[]) => {
  const projected = projectStaticTaxonomy(routes)
  for (const market of ["sk", "cz", "hu"] as const) {
    const marketRoutes = projected.filter((route) => route.market === market)
    const [routeCount, projectionHash] = APPROVED_MARKET_PROJECTIONS[market]
    if (
      marketRoutes.length !== routeCount ||
      hashStaticTaxonomyArtifact(marketRoutes) !== projectionHash
    ) {
      throw new Error(
        `${market.toUpperCase()} static taxonomy projection drifted`
      )
    }
  }
}

export const assertApprovedStaticTaxonomy = (
  routes: readonly PopulationStaticRoute[]
) => {
  assertRoDemoRoots(routes)
  assertRoEditorialRoots(routes)
  assertMarketIsolation(routes)
  if (hashPopulationStaticTaxonomy(routes) !== APPROVED_STATIC_TAXONOMY_HASH) {
    throw new Error(
      "Static taxonomy differs from the approved cutover snapshot"
    )
  }
}
