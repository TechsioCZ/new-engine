import { expect, it } from "vitest"
import {
  command,
  createEntity,
  createStatic,
  entitySource,
  type HarnessFactory,
} from "./behavior-helpers"
import type {
  SupersedeEntityRouteRequest,
  UrlRegistryCommand,
} from "./contracts"

export const runProjectionSafetyBehavior = (createHarness: HarnessFactory) => {
  it("rejects mixed entity and static supersede projections at runtime", async () => {
    const harness = await createHarness()
    try {
      const entity = await createEntity(harness, "mixed-entity")
      const staticRoute = await createStatic(harness, "mixed-static")
      const untrustedRequest = {
        commandType: "supersede-route",
        expectedVersion: 1,
        source: entitySource(entity.identity, `${harness.namespace}:mixed`),
        target: {
          routeId: entity.result.snapshot.route.id,
          identity: entity.identity,
        },
        successor: {
          routeId: staticRoute.result.snapshot.route.id,
          identity: staticRoute.identity,
        },
      } as unknown as SupersedeEntityRouteRequest
      const untrustedCommand: UrlRegistryCommand<SupersedeEntityRouteRequest> =
        command(`${harness.namespace}:mixed`, untrustedRequest)
      await expect(
        harness.registry.supersedeRoute(untrustedCommand)
      ).rejects.toMatchObject({ code: "INVALID_TRANSITION" })
    } finally {
      await harness.cleanup()
    }
  })
}
