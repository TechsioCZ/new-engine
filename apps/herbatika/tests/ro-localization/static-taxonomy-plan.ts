import {
  buildPopulationStaticTaxonomy,
  hashPopulationStaticTaxonomy,
  type PopulationStaticRoute,
} from "../../src/lib/url-registry/population/static-taxonomy"
import {
  assertApprovedStaticCutoverPlan,
  assertApprovedStaticTaxonomy,
  hashStaticTaxonomyArtifact,
  projectStaticTaxonomy,
  RO_DEMO_STATIC_APPROVAL,
  RO_DEMO_STATIC_ROOTS,
} from "./static-taxonomy-approval"

export const buildStaticTaxonomyCutoverPlan = (
  routes: readonly PopulationStaticRoute[] = buildPopulationStaticTaxonomy()
) => {
  assertApprovedStaticTaxonomy(routes)
  const projected = projectStaticTaxonomy(routes)
  const marketSummaries = Object.fromEntries(
    (["sk", "cz", "hu", "ro"] as const).map((market) => {
      const marketRoutes = projected.filter((route) => route.market === market)
      return [
        market,
        {
          routeCount: marketRoutes.length,
          routeProjectionHash: hashStaticTaxonomyArtifact(marketRoutes),
        },
      ]
    })
  )
  const plan = {
    approval: RO_DEMO_STATIC_APPROVAL,
    demoPolicy: {
      indexPolicy: "noindex" as const,
      market: "ro" as const,
      rootCount: RO_DEMO_STATIC_ROOTS.length,
      roots: RO_DEMO_STATIC_ROOTS.map(([pageKey, path]) => ({
        pageKey,
        path,
        routeKey: `root:${pageKey}`,
      })),
    },
    generator: "herbatika-ro-static-taxonomy-plan/v1",
    isolation: {
      markets: marketSummaries,
      roOnlyRootKeys: [
        "root:affiliate",
        "root:dropshipping",
        "root:giftVoucher",
        "root:privateLabel",
        "root:wholesale",
      ],
    },
    populationManifestPatch: {
      taxonomyApproval: {
        hash: hashPopulationStaticTaxonomy(routes),
        markets: { ro: RO_DEMO_STATIC_APPROVAL },
      },
    },
    schemaVersion: 1 as const,
    taxonomyApprovalHash: hashPopulationStaticTaxonomy(routes),
  }
  return { ...plan, planHash: assertApprovedStaticCutoverPlan(plan) }
}
