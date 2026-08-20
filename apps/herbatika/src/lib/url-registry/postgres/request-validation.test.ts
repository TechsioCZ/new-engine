import { describe, expect, it } from "vitest"
import type { UrlRegistryCommand } from "../contracts"
import { assertCommandRequest } from "./request-validation"

describe("Postgres command request validation", () => {
  it("classifies mixed supersede projections as an invalid transition", () => {
    const entityIdentity = {
      targetType: "entity" as const,
      sourceSystem: "medusa",
      sourceType: "product",
      sourceId: "prod_1",
      staticRouteKey: null,
    }
    const command = {
      commandVersion: 1,
      idempotencyKey: "mixed-projection",
      requestFingerprint: `sha256:${"0".repeat(64)}`,
      request: {
        commandType: "supersede-route",
        expectedVersion: 1,
        source: {
          producer: "test",
          sourceSystem: "medusa",
          sourceType: "product",
          sourceId: "prod_1",
          sourceVersion: "1",
          sourceEventId: "mixed-projection",
        },
        target: {
          routeId: "00000000-0000-4000-8000-000000000001",
          identity: entityIdentity,
        },
        successor: {
          routeId: "00000000-0000-4000-8000-000000000002",
          identity: {
            targetType: "static" as const,
            sourceSystem: null,
            sourceType: null,
            sourceId: null,
            staticRouteKey: "about",
          },
        },
      },
    } as unknown as UrlRegistryCommand

    expect(() => assertCommandRequest(command, "supersede-route")).toThrowError(
      expect.objectContaining({ code: "INVALID_TRANSITION" })
    )
  })
})
