import { expect, it } from "vitest"
import {
  command,
  createEntity,
  entitySource,
  foundValue,
  type HarnessFactory,
} from "./behavior-helpers"

export const runReadBehavior = (createHarness: HarnessFactory) => {
  it("reads full entity snapshots by stable identity across lifecycle states", async () => {
    const harness = await createHarness()
    try {
      const firstSlug = `${harness.namespace}-identity-first`
      const secondSlug = `${harness.namespace}-identity-second`
      const created = await createEntity(harness, "identity-snapshot", {
        slug: firstSlug,
      })
      const routeId = created.result.snapshot.route.id
      const identityLookup = {
        market: "sk" as const,
        sourceSystem: created.identity.sourceSystem,
        sourceType: created.identity.sourceType,
        sourceId: created.identity.sourceId,
      }
      await harness.registry.changeSlug(
        command(`${harness.namespace}:identity-change`, {
          commandType: "change-slug",
          expectedVersion: 1,
          source: entitySource(
            created.identity,
            `${harness.namespace}:identity-change`,
            "2"
          ),
          target: { routeId, identity: created.identity },
          slug: { normalizedSlug: secondSlug, normalizationVersion: 1 },
        })
      )

      expect(
        foundValue(await harness.registry.findEntityRoute(identityLookup))
      ).toMatchObject({
        route: { id: routeId, status: "active", version: 2 },
        currentSlug: { normalizedSlug: secondSlug },
        slugHistory: [
          { normalizedSlug: firstSlug, disposition: "alias" },
          { normalizedSlug: secondSlug, disposition: "current" },
        ],
      })

      await harness.registry.retireRoute(
        command(`${harness.namespace}:identity-retire`, {
          commandType: "retire-route",
          expectedVersion: 2,
          source: entitySource(
            created.identity,
            `${harness.namespace}:identity-retire`,
            "3"
          ),
          target: { routeId, identity: created.identity },
        })
      )

      expect(
        await harness.registry.findActiveEntityRoute(identityLookup)
      ).toEqual({ kind: "missing" })
      expect(
        foundValue(await harness.registry.findEntityRoute(identityLookup))
      ).toMatchObject({
        route: { id: routeId, status: "retired", version: 3 },
        currentSlug: { normalizedSlug: secondSlug },
        slugHistory: [
          { normalizedSlug: firstSlug, disposition: "alias" },
          { normalizedSlug: secondSlug, disposition: "current" },
        ],
      })
      expect(
        await harness.registry.findEntityRoute({
          ...identityLookup,
          sourceId: `${harness.namespace}-missing`,
        })
      ).toEqual({ kind: "missing" })
    } finally {
      await harness.cleanup()
    }
  })

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

  it("pages only active current entity projections for one market and kind", async () => {
    const harness = await createHarness()
    try {
      const first = await createEntity(harness, "active-page-first")
      const second = await createEntity(harness, "active-page-second")
      await createEntity(harness, "active-page-other-market", { market: "cz" })
      const retired = await createEntity(harness, "active-page-retired")
      await harness.registry.retireRoute(
        command(`${harness.namespace}:active-page-retire`, {
          commandType: "retire-route",
          expectedVersion: 1,
          source: entitySource(
            retired.identity,
            `${harness.namespace}:active-page-retire`,
            "2"
          ),
          target: {
            routeId: retired.result.snapshot.route.id,
            identity: retired.identity,
          },
        })
      )

      const firstPage = foundValue(
        await harness.registry.listActiveEntityRoutes({
          kind: "product",
          limit: 1,
          market: "sk",
        })
      )
      expect(firstPage.items).toHaveLength(1)
      expect(firstPage.nextCursor).not.toBeNull()
      const secondPage = foundValue(
        await harness.registry.listActiveEntityRoutes({
          cursor: firstPage.nextCursor ?? undefined,
          kind: "product",
          limit: 1,
          market: "sk",
        })
      )
      expect(secondPage.items).toHaveLength(1)
      expect(secondPage.nextCursor).toBeNull()
      expect(
        new Set(
          [...firstPage.items, ...secondPage.items].map(
            (item) => item.route.id
          )
        )
      ).toEqual(
        new Set([first.result.snapshot.route.id, second.result.snapshot.route.id])
      )
    } finally {
      await harness.cleanup()
    }
  })

  it("rejects malformed active-route page limits and cursors consistently", async () => {
    const harness = await createHarness()
    try {
      for (const limit of [0, 101, 1.5]) {
        await expect(
          Promise.resolve().then(() =>
            harness.registry.listActiveEntityRoutes({
              kind: "product",
              limit,
              market: "sk",
            })
          )
        ).rejects.toMatchObject({ code: "INVALID_COMMAND" })
      }
      for (const cursor of ["not-base64!", "bm90LWEtdXVpZA", "YQ=="]) {
        await expect(
          Promise.resolve().then(() =>
            harness.registry.listActiveEntityRoutes({
              cursor,
              kind: "product",
              limit: 10,
              market: "sk",
            })
          )
        ).rejects.toMatchObject({ code: "INVALID_COMMAND" })
      }
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
