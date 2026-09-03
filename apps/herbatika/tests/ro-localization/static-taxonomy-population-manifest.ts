import {
  hashPopulationManifest,
  parsePopulationManifest,
} from "../../src/lib/url-registry/population/manifest"
import type { PopulationManifest } from "../../src/lib/url-registry/population/manifest-contracts"
import {
  buildPopulationStaticTaxonomy,
  type PopulationStaticRoute,
} from "../../src/lib/url-registry/population/static-taxonomy"
import { RO_DEMO_STATIC_APPROVAL } from "./static-taxonomy-approval"
import { buildStaticTaxonomyCutoverPlan } from "./static-taxonomy-plan"

export const RO_DEMO_POPULATION_SCOPE = Object.freeze({
  brand: 103,
  category: 207,
  collection: 0,
  product: 2002,
})

export const assertRoDemoPopulationScope = (manifest: PopulationManifest) => {
  const actual = {
    brand: 0,
    category: 0,
    collection: 0,
    product: 0,
  }
  for (const entity of manifest.entities) {
    if (entity.market === "ro" && entity.kind in actual) {
      actual[entity.kind as keyof typeof actual] += 1
    }
  }
  for (const kind of Object.keys(
    RO_DEMO_POPULATION_SCOPE
  ) as (keyof typeof RO_DEMO_POPULATION_SCOPE)[]) {
    if (actual[kind] !== RO_DEMO_POPULATION_SCOPE[kind]) {
      throw new Error(
        `RO population scope ${kind} must be ${RO_DEMO_POPULATION_SCOPE[kind]}; found ${actual[kind]}`
      )
    }
  }
  return actual
}

const inputRecord = (value: unknown): Record<string, unknown> => {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new Error("Population manifest input must be an object")
  }
  return value as Record<string, unknown>
}

export const refreshStaticTaxonomyPopulationManifest = (
  input: unknown,
  routes: readonly PopulationStaticRoute[] = buildPopulationStaticTaxonomy()
): Readonly<{
  manifest: PopulationManifest
  manifestHash: `sha256:${string}`
  planHash: `sha256:${string}`
}> => {
  const plan = buildStaticTaxonomyCutoverPlan(routes)
  const source = structuredClone(inputRecord(input))
  const taxonomyApproval = inputRecord(source.taxonomyApproval)
  const markets = inputRecord(taxonomyApproval.markets)
  source.taxonomyApproval = {
    ...taxonomyApproval,
    hash: plan.taxonomyApprovalHash,
    markets: {
      ...markets,
      ro: RO_DEMO_STATIC_APPROVAL,
    },
  }
  const manifest = parsePopulationManifest(source)
  return {
    manifest,
    manifestHash: hashPopulationManifest(manifest),
    planHash: plan.planHash,
  }
}
