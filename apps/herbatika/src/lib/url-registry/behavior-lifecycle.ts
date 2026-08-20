import { expect, it } from "vitest"
import {
  command,
  createEntity,
  entitySource,
  foundValue,
  type HarnessFactory,
} from "./behavior-helpers"

export const runLifecycleBehavior = (createHarness: HarnessFactory) => {
  it("lets retired lifecycle override retained current and alias rows", async () => {
    const harness = await createHarness()
    try {
      const firstSlug = `${harness.namespace}-retired-first`
      const secondSlug = `${harness.namespace}-retired-second`
      const created = await createEntity(harness, "retired", {
        slug: firstSlug,
      })
      const routeId = created.result.snapshot.route.id
      await harness.registry.changeSlug(
        command(`${harness.namespace}:retired-change`, {
          commandType: "change-slug",
          expectedVersion: 1,
          source: entitySource(
            created.identity,
            `${harness.namespace}:retired-change`
          ),
          target: { routeId, identity: created.identity },
          slug: { normalizedSlug: secondSlug, normalizationVersion: 1 },
        })
      )
      const retired = await harness.registry.retireRoute(
        command(`${harness.namespace}:retire`, {
          commandType: "retire-route",
          expectedVersion: 2,
          source: entitySource(created.identity, `${harness.namespace}:retire`),
          target: { routeId, identity: created.identity },
        })
      )
      expect(retired.snapshot).toMatchObject({
        route: { status: "retired", successorRouteId: null, version: 3 },
        currentSlug: { normalizedSlug: secondSlug, disposition: "current" },
      })
      for (const normalizedSlug of [firstSlug, secondSlug]) {
        expect(
          foundValue(
            await harness.registry.resolve({
              market: "sk",
              kind: "product",
              normalizedSlug,
            })
          )
        ).toMatchObject({ disposition: "gone", route: { id: routeId } })
      }
    } finally {
      await harness.cleanup()
    }
  })

  it("flattens every superseded current and alias to the active successor", async () => {
    const harness = await createHarness()
    try {
      const first = await createEntity(harness, "predecessor", {
        slug: `${harness.namespace}-predecessor-old`,
      })
      const firstId = first.result.snapshot.route.id
      await harness.registry.changeSlug(
        command(`${harness.namespace}:predecessor-change`, {
          commandType: "change-slug",
          expectedVersion: 1,
          source: entitySource(
            first.identity,
            `${harness.namespace}:predecessor-change`
          ),
          target: { routeId: firstId, identity: first.identity },
          slug: {
            normalizedSlug: `${harness.namespace}-predecessor`,
            normalizationVersion: 1,
          },
        })
      )
      const second = await createEntity(harness, "successor")
      await harness.registry.supersedeRoute(
        command(`${harness.namespace}:supersede-first`, {
          commandType: "supersede-route",
          expectedVersion: 2,
          source: entitySource(
            first.identity,
            `${harness.namespace}:supersede-first`
          ),
          target: { routeId: firstId, identity: first.identity },
          successor: {
            routeId: second.result.snapshot.route.id,
            identity: second.identity,
          },
        })
      )
      for (const normalizedSlug of [
        `${harness.namespace}-predecessor-old`,
        `${harness.namespace}-predecessor`,
      ]) {
        expect(
          foundValue(
            await harness.registry.resolve({
              market: "sk",
              kind: "product",
              normalizedSlug,
            })
          )
        ).toMatchObject({
          disposition: "superseded",
          successorRoute: { id: second.result.snapshot.route.id },
          currentSlug: {
            normalizedSlug: second.result.snapshot.currentSlug.normalizedSlug,
          },
        })
      }
      const third = await createEntity(harness, "final")
      await harness.registry.supersedeRoute(
        command(`${harness.namespace}:supersede-second`, {
          commandType: "supersede-route",
          expectedVersion: 1,
          source: entitySource(
            second.identity,
            `${harness.namespace}:supersede-second`
          ),
          target: {
            routeId: second.result.snapshot.route.id,
            identity: second.identity,
          },
          successor: {
            routeId: third.result.snapshot.route.id,
            identity: third.identity,
          },
        })
      )
      expect(
        foundValue(await harness.registry.getRoute(firstId)).route
      ).toMatchObject({
        status: "superseded",
        successorRouteId: third.result.snapshot.route.id,
        version: 4,
      })
    } finally {
      await harness.cleanup()
    }
  })

  it("retires inbound predecessors when their active successor retires", async () => {
    const harness = await createHarness()
    try {
      const predecessor = await createEntity(harness, "cascade-from")
      const successor = await createEntity(harness, "cascade-to")
      await harness.registry.supersedeRoute(
        command(`${harness.namespace}:cascade-link`, {
          commandType: "supersede-route",
          expectedVersion: 1,
          source: entitySource(
            predecessor.identity,
            `${harness.namespace}:cascade-link`
          ),
          target: {
            routeId: predecessor.result.snapshot.route.id,
            identity: predecessor.identity,
          },
          successor: {
            routeId: successor.result.snapshot.route.id,
            identity: successor.identity,
          },
        })
      )
      const result = await harness.registry.retireRoute(
        command(`${harness.namespace}:cascade-retire`, {
          commandType: "retire-route",
          expectedVersion: 1,
          source: entitySource(
            successor.identity,
            `${harness.namespace}:cascade-retire`
          ),
          target: {
            routeId: successor.result.snapshot.route.id,
            identity: successor.identity,
          },
        })
      )
      expect(result.affectedRouteIds).toEqual(
        [
          predecessor.result.snapshot.route.id,
          successor.result.snapshot.route.id,
        ].sort()
      )
      expect(
        foundValue(
          await harness.registry.getRoute(predecessor.result.snapshot.route.id)
        ).route
      ).toMatchObject({ status: "retired", successorRouteId: null, version: 3 })
    } finally {
      await harness.cleanup()
    }
  })
}
