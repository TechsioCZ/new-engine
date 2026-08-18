import { describe, expect, it } from "vitest"
import { runUrlRegistryBehaviorSuite } from "./behavior-contract"
import { createEntity } from "./behavior-helpers"
import { InMemoryUrlRegistry } from "./memory"

let sequence = 0

runUrlRegistryBehaviorSuite("in-memory URL registry behavior", async () => {
  await Promise.resolve()
  sequence += 1
  return {
    namespace: `memory-${sequence}`,
    registry: new InMemoryUrlRegistry({
      now: () => new Date("2026-08-17T12:00:00.000Z"),
    }),
    cleanup: async () => Promise.resolve(),
  }
})

describe("in-memory URL registry ID integrity", () => {
  it("rejects a generated primary-key collision without replacing state", async () => {
    const registry = new InMemoryUrlRegistry({
      now: () => new Date("2026-08-17T12:00:00.000Z"),
      createId: (kind) => kind,
    })
    const harness = {
      namespace: "duplicate-id",
      registry,
      cleanup: async () => Promise.resolve(),
    }
    const first = await createEntity(harness, "first")
    await expect(createEntity(harness, "second")).rejects.toMatchObject({
      code: "INVARIANT_VIOLATION",
    })
    expect(
      await registry.getRoute(first.result.snapshot.route.id)
    ).toMatchObject({
      kind: "found",
      value: { route: { sourceId: first.identity.sourceId } },
    })
  })
})
