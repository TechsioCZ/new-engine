export const SEED_RESOURCE_IDENTITY_KEY = "seed_resource_identity"

export type SeedResourceIdentity = {
  owner: string
  kind: string
  handle: string
  version: 1
}

type PersistedSeedResource = {
  id: string
  name: string
  metadata?: Record<string, unknown> | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readPersistedSeedIdentity(
  metadata: Record<string, unknown> | null | undefined
): Partial<SeedResourceIdentity> | undefined {
  const value = metadata?.[SEED_RESOURCE_IDENTITY_KEY]
  return isRecord(value) ? value : undefined
}

function hasIdentityNamespace(
  actual: Partial<SeedResourceIdentity> | undefined,
  expected: SeedResourceIdentity
): boolean {
  return actual?.owner === expected.owner && actual.handle === expected.handle
}

export function hasExactSeedResourceIdentity(
  metadata: Record<string, unknown> | null | undefined,
  expected: SeedResourceIdentity
): boolean {
  const actual = readPersistedSeedIdentity(metadata)
  return (
    actual?.owner === expected.owner &&
    actual.kind === expected.kind &&
    actual.handle === expected.handle &&
    actual.version === expected.version
  )
}

export function buildSeedResourceMetadata(
  identity: SeedResourceIdentity,
  metadata?: Record<string, unknown> | null
): Record<string, unknown> {
  return {
    ...(metadata ?? {}),
    [SEED_RESOURCE_IDENTITY_KEY]: { ...identity },
  }
}

export function selectExactOwnedSeedResource<T extends PersistedSeedResource>(
  resources: readonly T[],
  expected: SeedResourceIdentity,
  resourceLabel: string
): T | undefined {
  const namespaceMatches = resources.filter((resource) =>
    hasIdentityNamespace(readPersistedSeedIdentity(resource.metadata), expected)
  )
  const malformed = namespaceMatches.filter(
    (resource) => !hasExactSeedResourceIdentity(resource.metadata, expected)
  )
  if (malformed.length > 0) {
    throw new Error(
      `${resourceLabel} seed identity conflict for ${expected.owner}/${expected.handle}: incompatible marker on ${malformed.map(({ id }) => id).join(", ")}`
    )
  }
  if (namespaceMatches.length > 1) {
    throw new Error(
      `${resourceLabel} seed identity conflict for ${expected.owner}/${expected.handle}: multiple owned resources ${namespaceMatches.map(({ id }) => id).join(", ")}`
    )
  }
  return namespaceMatches[0]
}

export function assertSeedResourceNameAvailable<
  T extends PersistedSeedResource,
>(
  resources: readonly T[],
  expectedName: string,
  selectedResourceId: string | undefined,
  resourceLabel: string
): void {
  const conflicts = resources.filter(
    (resource) =>
      resource.name === expectedName && resource.id !== selectedResourceId
  )
  if (conflicts.length > 0) {
    throw new Error(
      `${resourceLabel} seed name conflict for "${expectedName}": resource is not owned by this seed (${conflicts.map(({ id }) => id).join(", ")})`
    )
  }
}
