import { createHash } from "node:crypto"
import type { Market } from "@/lib/url/types"
import {
  POPULATION_MARKETS,
  POPULATION_SHA256,
  type PopulationBinding,
  type PopulationEntity,
  type PopulationManifest,
  PopulationManifestError,
} from "./manifest-contracts"
import {
  parsePopulationApproval,
  parsePopulationBinding,
  parsePopulationEntity,
} from "./manifest-parsers"
import {
  assertPopulationExactKeys,
  canonicalizePopulationValue,
  populationRecord,
  populationText,
} from "./manifest-primitives"

const assertUniqueEntities = (entities: readonly PopulationEntity[]) => {
  const identities = new Set<string>()
  const slugs = new Set<string>()
  const equivalences = new Set<string>()
  for (const entity of entities) {
    const identity = `${entity.market}:${entity.kind}:${entity.sourceId}`
    const slug = `${entity.market}:${entity.kind}:${entity.publicSlug}`
    const equivalence = `${entity.market}:${entity.kind}:${entity.equivalenceKey}`
    if (
      identities.has(identity) ||
      slugs.has(slug) ||
      equivalences.has(equivalence)
    ) {
      throw new PopulationManifestError(
        `Ambiguous population entity ${identity}`
      )
    }
    identities.add(identity)
    slugs.add(slug)
    equivalences.add(equivalence)
  }
}

const parseBindings = (value: unknown): readonly PopulationBinding[] => {
  if (!Array.isArray(value)) {
    throw new PopulationManifestError("manifest.bindings must be an array")
  }
  const bindings = value.map(parsePopulationBinding)
  const byMarket = new Map(bindings.map((binding) => [binding.market, binding]))
  if (
    bindings.length !== POPULATION_MARKETS.length ||
    byMarket.size !== POPULATION_MARKETS.length
  ) {
    throw new PopulationManifestError(
      "manifest requires exactly one binding for every market"
    )
  }
  return bindings
}

export const parsePopulationManifest = (value: unknown): PopulationManifest => {
  const input = populationRecord(value, "manifest")
  assertPopulationExactKeys(
    input,
    [
      "bindings",
      "completeInventory",
      "entities",
      "generatedAt",
      "generator",
      "schemaVersion",
      "sourceSnapshotHash",
      "taxonomyApproval",
    ],
    "manifest"
  )
  if (input.schemaVersion !== 1 || input.completeInventory !== true) {
    throw new PopulationManifestError("manifest fixed fields are invalid")
  }
  if (!Array.isArray(input.entities)) {
    throw new PopulationManifestError("manifest.entities must be an array")
  }
  const bindings = parseBindings(input.bindings)
  const byMarket = new Map<Market, PopulationBinding>(
    bindings.map((binding) => [binding.market, binding])
  )
  const generatedAt = populationText(input.generatedAt, "manifest.generatedAt")
  if (new Date(generatedAt).toISOString() !== generatedAt) {
    throw new PopulationManifestError(
      "manifest.generatedAt must be a canonical timestamp"
    )
  }
  if (
    typeof input.sourceSnapshotHash !== "string" ||
    !POPULATION_SHA256.test(input.sourceSnapshotHash)
  ) {
    throw new PopulationManifestError("manifest.sourceSnapshotHash is invalid")
  }
  const entities = input.entities.map((entity, index) =>
    parsePopulationEntity(entity, index, byMarket)
  )
  assertUniqueEntities(entities)
  return {
    bindings,
    completeInventory: true,
    entities,
    generatedAt,
    generator: populationText(input.generator, "manifest.generator"),
    schemaVersion: 1,
    sourceSnapshotHash: input.sourceSnapshotHash as `sha256:${string}`,
    taxonomyApproval: parsePopulationApproval(input.taxonomyApproval),
  }
}

export const hashPopulationManifest = (
  manifest: PopulationManifest
): `sha256:${string}` =>
  `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalizePopulationValue(manifest)))
    .digest("hex")}`
