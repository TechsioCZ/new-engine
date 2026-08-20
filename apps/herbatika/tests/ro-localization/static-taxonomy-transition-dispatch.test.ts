import { describe, expect, it } from "vitest"
import { createUrlRegistryCommand } from "../../src/lib/url-registry/command-fingerprint"
import { InMemoryUrlRegistry } from "../../src/lib/url-registry/memory"
import type { StaticRouteSnapshot } from "../../src/lib/url-registry/model"
import type { StaticTaxonomyPreflightRow } from "./static-taxonomy-preflight-contract"
import { demoStaticRoutes } from "./static-taxonomy-preflight-contract"
import { authorizeStaticTaxonomyRollback } from "./static-taxonomy-rollback"
import { buildStaticTaxonomyTransitionPlan } from "./static-taxonomy-transition-plan"

const createIndexableInventory = async (registry: InMemoryUrlRegistry) => {
  const snapshots: StaticRouteSnapshot[] = []
  for (const route of demoStaticRoutes()) {
    const identity = {
      sourceId: null,
      sourceSystem: null,
      sourceType: null,
      staticRouteKey: route.routeKey,
      targetType: "static" as const,
    }
    const result = await registry.createStaticRoute(
      createUrlRegistryCommand({
        idempotencyKey: `test:create:${route.routeKey}`,
        request: {
          commandType: "create-static-route",
          expectedVersion: 0,
          path: {
            matchMode: route.matchMode,
            parentRouteKey: route.parentRouteKey,
            segment: route.segment,
          },
          route: {
            equivalenceKey: route.equivalenceKey,
            identity,
            indexPolicy: "indexable",
            kind: "static",
            market: "ro",
          },
          source: {
            producer: "test",
            sourceEventId: `test:create:${route.routeKey}`,
            sourceId: route.routeKey,
            sourceSystem: "deployment",
            sourceType: "route-taxonomy",
            sourceVersion: "test-v1",
          },
        },
      })
    )
    snapshots.push(result.snapshot)
  }
  return snapshots
}

const asPreflightRows = (
  snapshots: readonly StaticRouteSnapshot[]
): StaticTaxonomyPreflightRow[] =>
  snapshots.map(({ currentPath, route }) => ({
    currentPaths: [
      {
        matchMode: currentPath.matchMode,
        parentRouteKey: currentPath.parentRouteKey,
        segment: currentPath.segment,
      },
    ],
    equivalenceKey: route.equivalenceKey,
    indexPolicy: route.indexPolicy,
    routeId: route.id,
    routeKey: route.staticRouteKey,
    status: route.status,
    version: route.version,
  }))

describe("RO static taxonomy lifecycle commands", () => {
  it("dispatches the generated apply and rollback through production behavior", async () => {
    const registry = new InMemoryUrlRegistry()
    const inventory = await createIndexableInventory(registry)
    const plan = buildStaticTaxonomyTransitionPlan(asPreflightRows(inventory))
    const action = plan.actions[0]
    expect(action).toBeDefined()
    if (!action) {
      return
    }

    const applied = await registry.updateRoute(
      createUrlRegistryCommand(action.apply)
    )
    expect(applied.snapshot.route).toMatchObject({
      indexPolicy: "noindex",
      version: 2,
    })

    const rollback = authorizeStaticTaxonomyRollback(action, applied)
    const rolledBack = await registry.updateRoute(
      createUrlRegistryCommand(rollback)
    )
    expect(rolledBack.snapshot.route).toMatchObject({
      indexPolicy: "indexable",
      version: 3,
    })
  })

  it("rejects rollback authorization from a different same-version command", async () => {
    const registry = new InMemoryUrlRegistry()
    const inventory = await createIndexableInventory(registry)
    const action = buildStaticTaxonomyTransitionPlan(asPreflightRows(inventory))
      .actions[0]
    expect(action).toBeDefined()
    if (!action) {
      return
    }
    const otherApply = {
      idempotencyKey: `other:${action.routeKey}`,
      request: {
        ...action.apply.request,
        source: {
          ...action.apply.request.source,
          producer: "other-owner",
          sourceEventId: `other:${action.routeKey}`,
        },
      },
    }
    const otherReceipt = await registry.updateRoute(
      createUrlRegistryCommand(otherApply)
    )

    expect(() => authorizeStaticTaxonomyRollback(action, otherReceipt)).toThrow(
      "receipt does not belong to the planned apply command"
    )
  })
})
