import { expect, it } from "vitest"
import {
  command,
  createEntity,
  entitySource,
  foundValue,
  type HarnessFactory,
} from "./behavior-helpers"

export const runReadBehavior = (createHarness: HarnessFactory) => {
  it("supports bounded batch, stable-identity, and equivalence reads", async () => {
    const harness = await createHarness()
    try {
      const equivalenceKey = `${harness.namespace}:read-equivalence`
      const sk = await createEntity(harness, "read-sk", { equivalenceKey })
      const cz = await createEntity(harness, "read-cz", {
        equivalenceKey,
        market: "cz",
      })
      const current = sk.result.snapshot.currentSlug.normalizedSlug
      const byIdentity = foundValue(
        await harness.registry.findActiveEntityRoute({
          market: "sk",
          sourceSystem: sk.identity.sourceSystem,
          sourceType: sk.identity.sourceType,
          sourceId: sk.identity.sourceId,
        })
      )
      expect(byIdentity.currentSlug.normalizedSlug).toBe(current)
      expect("slugHistory" in byIdentity).toBe(false)

      const batch = foundValue(
        await harness.registry.resolveMany({
          market: "sk",
          kind: "product",
          normalizedSlugs: [current, `${harness.namespace}-missing`, current],
        })
      )
      expect(batch.map((item) => item.result.kind)).toEqual([
        "found",
        "missing",
        "found",
      ])
      expect(batch.map((item) => item.normalizedSlug)).toEqual([
        current,
        `${harness.namespace}-missing`,
        current,
      ])
      await expect(
        harness.registry.resolveMany({
          market: "sk",
          kind: "product",
          normalizedSlugs: Array.from(
            { length: 11 },
            (_, index) => `item-${index}`
          ),
        })
      ).rejects.toMatchObject({ code: "INVALID_COMMAND" })

      const equivalents = foundValue(
        await harness.registry.findActiveEquivalents({
          kind: "product",
          equivalenceKey,
        })
      )
      expect(equivalents.map((target) => target.route.market)).toEqual([
        "cz",
        "sk",
      ])
      expect(equivalents.map((target) => target.route.id).sort()).toEqual(
        [sk.result.snapshot.route.id, cz.result.snapshot.route.id].sort()
      )
      expect(
        await harness.registry.findActiveEquivalents({
          kind: "product",
          equivalenceKey: `${harness.namespace}:absent`,
        })
      ).toEqual({ kind: "missing" })
      expect(await harness.registry.listStaticRouteSnapshots("ro")).toEqual({
        kind: "found",
        value: [],
      })
    } finally {
      await harness.cleanup()
    }
  })

  it("pages audit and pending outbox reads with strict cursors", async () => {
    const harness = await createHarness()
    try {
      const created = await createEntity(harness, "page")
      const routeId = created.result.snapshot.route.id
      for (const version of [1, 2]) {
        await harness.registry.changeSlug(
          command(`${harness.namespace}:page:${version}`, {
            commandType: "change-slug",
            expectedVersion: version,
            source: entitySource(
              created.identity,
              `${harness.namespace}:page:${version}`,
              String(version + 1)
            ),
            target: { routeId, identity: created.identity },
            slug: {
              normalizedSlug: `${harness.namespace}-page-${version}`,
              normalizationVersion: 1,
            },
          })
        )
      }
      const first = foundValue(
        await harness.registry.listAuditRecords({ limit: 2 })
      )
      expect(first.items).toHaveLength(2)
      expect(first.nextCursor).not.toBeNull()
      const second = foundValue(
        await harness.registry.listAuditRecords({
          limit: 2,
          cursor: first.nextCursor ?? undefined,
        })
      )
      expect(second.items).toHaveLength(1)
      expect(second.nextCursor).toBeNull()
      expect(
        new Set([...first.items, ...second.items].map((item) => item.id)).size
      ).toBe(3)
      const outbox = foundValue(
        await harness.registry.listPendingInvalidations({ limit: 2 })
      )
      expect(outbox.items).toHaveLength(2)
      expect(outbox.nextCursor).not.toBeNull()
      for (const reader of [
        () =>
          harness.registry.listAuditRecords({ limit: 1, cursor: "malformed" }),
        () => harness.registry.listPendingInvalidations({ limit: 101 }),
      ]) {
        await expect(reader()).rejects.toMatchObject({
          code: "INVALID_COMMAND",
        })
      }
    } finally {
      await harness.cleanup()
    }
  })
}
