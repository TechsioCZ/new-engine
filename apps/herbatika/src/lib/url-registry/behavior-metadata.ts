import { expect, it } from "vitest"
import {
  command,
  createEntity,
  createEntityRequest,
  entityIdentity,
  entitySource,
  type HarnessFactory,
} from "./behavior-helpers"

export const runMetadataBehavior = (createHarness: HarnessFactory) => {
  it("enforces active equivalence uniqueness per market and kind", async () => {
    const harness = await createHarness()
    try {
      const equivalenceKey = `${harness.namespace}:shared-equivalence`
      await createEntity(harness, "equivalence-first", { equivalenceKey })
      const conflict = entityIdentity(
        `${harness.namespace}-equivalence-conflict`
      )
      await expect(
        harness.registry.createEntityRoute(
          command(
            `${harness.namespace}:equivalence-conflict`,
            createEntityRequest({
              identity: conflict,
              eventId: `${harness.namespace}:equivalence-conflict`,
              slug: `${harness.namespace}-equivalence-conflict`,
              equivalenceKey,
            })
          )
        )
      ).rejects.toMatchObject({ code: "EQUIVALENCE_CONFLICT" })
      const otherMarket = await createEntity(harness, "equivalence-cz", {
        equivalenceKey,
        market: "cz",
      })
      expect(otherMarket.result.snapshot.route.market).toBe("cz")
    } finally {
      await harness.cleanup()
    }
  })

  it("updates metadata optimistically and audits exact no-op commands", async () => {
    const harness = await createHarness()
    try {
      const created = await createEntity(harness, "metadata", {
        equivalenceKey: `${harness.namespace}:metadata-old`,
      })
      const routeId = created.result.snapshot.route.id
      const update = await harness.registry.updateRoute(
        command(`${harness.namespace}:metadata-update`, {
          commandType: "update-route",
          expectedVersion: 1,
          source: entitySource(
            created.identity,
            `${harness.namespace}:metadata-update`
          ),
          target: { routeId, identity: created.identity },
          metadata: {
            equivalenceKey: `${harness.namespace}:metadata-new`,
            indexPolicy: "noindex",
          },
        })
      )
      expect(update.snapshot.route).toMatchObject({
        equivalenceKey: `${harness.namespace}:metadata-new`,
        indexPolicy: "noindex",
        version: 2,
      })
      const noop = await harness.registry.updateRoute(
        command(`${harness.namespace}:metadata-noop`, {
          commandType: "update-route",
          expectedVersion: 2,
          source: entitySource(
            created.identity,
            `${harness.namespace}:metadata-noop`
          ),
          target: { routeId, identity: created.identity },
          metadata: {
            equivalenceKey: `${harness.namespace}:metadata-new`,
            indexPolicy: "noindex",
          },
        })
      )
      expect(noop).toMatchObject({
        snapshot: { route: { version: 2 } },
        commit: { outcome: "noop", invalidation: null },
      })
      const occupied = await createEntity(harness, "metadata-occupied", {
        equivalenceKey: `${harness.namespace}:occupied`,
      })
      expect(occupied.result.snapshot.route.version).toBe(1)
      await expect(
        harness.registry.updateRoute(
          command(`${harness.namespace}:metadata-conflict`, {
            commandType: "update-route",
            expectedVersion: 2,
            source: entitySource(
              created.identity,
              `${harness.namespace}:metadata-conflict`
            ),
            target: { routeId, identity: created.identity },
            metadata: {
              equivalenceKey: `${harness.namespace}:occupied`,
              indexPolicy: "indexable",
            },
          })
        )
      ).rejects.toMatchObject({ code: "EQUIVALENCE_CONFLICT" })
    } finally {
      await harness.cleanup()
    }
  })
}
