import {
  analyzePublicPath,
  createCollisionGroupKey,
} from "./path-collision-analysis"
import type {
  PublicPathClaim,
  PublicPathCollisionDiagnostic,
} from "./path-collision-contracts"
import type { Market } from "./types"

export function addPathDiagnostics(
  claims: readonly PublicPathClaim[],
  diagnostics: PublicPathCollisionDiagnostic[]
): void {
  const pathGroups = new Map<
    string,
    { market: Market; normalizedPath: string; claimIds: string[] }
  >()

  for (const claim of claims) {
    const analyzed = analyzePublicPath(claim)
    diagnostics.push(...analyzed.diagnostics)
    if (!analyzed.normalizedPath) {
      continue
    }

    const key = createCollisionGroupKey(claim.market, analyzed.normalizedPath)
    const group = pathGroups.get(key)
    if (group) {
      group.claimIds.push(claim.claimId)
    } else {
      pathGroups.set(key, {
        claimIds: [claim.claimId],
        market: claim.market,
        normalizedPath: analyzed.normalizedPath,
      })
    }
  }

  for (const group of pathGroups.values()) {
    if (group.claimIds.length > 1) {
      diagnostics.push({
        claimIds: group.claimIds,
        code: "duplicate-public-path",
        market: group.market,
        normalizedPath: group.normalizedPath,
      })
    }
  }
}

export function addRouteAndSourceDiagnostics(
  claims: readonly PublicPathClaim[],
  diagnostics: PublicPathCollisionDiagnostic[]
): void {
  const routeGroups = new Map<
    string,
    { claims: PublicPathClaim[]; market: Market; routeId: string }
  >()
  const sourceGroups = new Map<
    string,
    {
      claims: PublicPathClaim[]
      market: Market
      sourceId: string
      sourceKind: string
    }
  >()

  for (const claim of claims) {
    const routeKey = createCollisionGroupKey(claim.market, claim.owner.routeId)
    const routeGroup = routeGroups.get(routeKey)
    if (routeGroup) {
      routeGroup.claims.push(claim)
    } else {
      routeGroups.set(routeKey, {
        claims: [claim],
        market: claim.market,
        routeId: claim.owner.routeId,
      })
    }

    const sourceKey = createCollisionGroupKey(
      claim.market,
      claim.owner.sourceKind,
      claim.owner.sourceId
    )
    const sourceGroup = sourceGroups.get(sourceKey)
    if (sourceGroup) {
      sourceGroup.claims.push(claim)
    } else {
      sourceGroups.set(sourceKey, {
        claims: [claim],
        market: claim.market,
        sourceId: claim.owner.sourceId,
        sourceKind: claim.owner.sourceKind,
      })
    }
  }

  for (const group of routeGroups.values()) {
    const bindings = new Set(
      group.claims.map(({ owner }) =>
        createCollisionGroupKey(
          owner.routeKind,
          owner.sourceKind,
          owner.sourceId,
          owner.equivalenceKey ?? ""
        )
      )
    )
    if (bindings.size > 1) {
      diagnostics.push({
        claimIds: group.claims.map(({ claimId }) => claimId),
        code: "conflicting-route-binding",
        market: group.market,
        routeId: group.routeId,
      })
    }
  }

  for (const group of sourceGroups.values()) {
    const bindings = new Set(
      group.claims.map(({ owner }) =>
        createCollisionGroupKey(owner.routeId, owner.routeKind)
      )
    )
    if (bindings.size > 1) {
      diagnostics.push({
        claimIds: group.claims.map(({ claimId }) => claimId),
        code: "conflicting-source-binding",
        market: group.market,
        sourceId: group.sourceId,
        sourceKind: group.sourceKind,
      })
    }
  }
}

export function addEquivalenceDiagnostics(
  claims: readonly PublicPathClaim[],
  diagnostics: PublicPathCollisionDiagnostic[]
): void {
  const groups = new Map<string, PublicPathClaim[]>()

  for (const claim of claims) {
    const equivalenceKey = claim.owner.equivalenceKey
    if (!equivalenceKey) {
      continue
    }
    const group = groups.get(equivalenceKey)
    if (group) {
      group.push(claim)
    } else {
      groups.set(equivalenceKey, [claim])
    }
  }

  for (const [equivalenceKey, group] of groups) {
    const marketRoutes = new Map<Market, Set<string>>()
    const routeKinds = new Set<string>()
    const sourceKinds = new Set<string>()

    for (const claim of group) {
      const routes = marketRoutes.get(claim.market) ?? new Set<string>()
      routes.add(claim.owner.routeId)
      marketRoutes.set(claim.market, routes)
      routeKinds.add(claim.owner.routeKind)
      sourceKinds.add(claim.owner.sourceKind)
    }

    const marketConflict = Array.from(marketRoutes.values()).some(
      (routes) => routes.size > 1
    )
    if (marketConflict || routeKinds.size > 1 || sourceKinds.size > 1) {
      diagnostics.push({
        claimIds: group.map(({ claimId }) => claimId),
        code: "conflicting-equivalence-mapping",
        equivalenceKey,
      })
    }
  }
}
