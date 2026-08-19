import { expect, it } from "vitest"
import {
  command,
  createEntity,
  createEntityRequest,
  entityIdentity,
  entitySource,
  foundValue,
  type HarnessFactory,
} from "./behavior-helpers"

export const runIdempotencyBehavior = (createHarness: HarnessFactory) => {
  it("replays keys and source events before optimistic locking", async () => {
    const harness = await createHarness()
    try {
      const identity = entityIdentity(`${harness.namespace}-replay`)
      const request = createEntityRequest({
        identity,
        eventId: `${harness.namespace}:replay-event`,
        slug: `${harness.namespace}-replay`,
        equivalenceKey: null,
      })
      const first = await harness.registry.createEntityRoute(
        command(`${harness.namespace}:replay-key`, request)
      )
      const sameKey = await harness.registry.createEntityRoute(
        command(`${harness.namespace}:replay-key`, request)
      )
      const sameEvent = await harness.registry.createEntityRoute(
        command(`${harness.namespace}:replay-alternate-key`, request)
      )
      expect(sameKey.commit).toMatchObject({
        replayed: true,
        audit: { id: first.commit.audit.id },
      })
      expect(sameEvent.commit).toMatchObject({
        replayed: true,
        audit: { id: first.commit.audit.id },
      })
      const drift = {
        ...request,
        slug: { ...request.slug, normalizedSlug: `${harness.namespace}-drift` },
      }
      await expect(
        harness.registry.createEntityRoute(
          command(`${harness.namespace}:replay-key`, drift)
        )
      ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
      await expect(
        harness.registry.createEntityRoute(
          command(`${harness.namespace}:replay-drift-key`, drift)
        )
      ).rejects.toMatchObject({ code: "SOURCE_EVENT_CONFLICT" })
      expect(
        foundValue(await harness.registry.listAuditRecords({ limit: 100 }))
          .items
      ).toHaveLength(1)
    } finally {
      await harness.cleanup()
    }
  })

  it("allows only one concurrent command for an expected route version", async () => {
    const harness = await createHarness()
    try {
      const created = await createEntity(harness, "concurrent")
      const commands = ["one", "two"].map((suffix) =>
        command(`${harness.namespace}:concurrent:${suffix}`, {
          commandType: "change-slug" as const,
          expectedVersion: 1,
          source: entitySource(
            created.identity,
            `${harness.namespace}:concurrent:${suffix}`
          ),
          target: {
            routeId: created.result.snapshot.route.id,
            identity: created.identity,
          },
          slug: {
            normalizedSlug: `${harness.namespace}-concurrent-${suffix}`,
            normalizationVersion: 1,
          },
        })
      )
      const outcomes = await Promise.allSettled(
        commands.map((item) => harness.registry.changeSlug(item))
      )
      expect(
        outcomes.filter((item) => item.status === "fulfilled")
      ).toHaveLength(1)
      const rejected = outcomes.find((item) => item.status === "rejected")
      expect(rejected).toMatchObject({
        status: "rejected",
        reason: { code: "VERSION_CONFLICT" },
      })
    } finally {
      await harness.cleanup()
    }
  })

  it("audits no-ops without invalidation and returns typed missing and gone", async () => {
    const harness = await createHarness()
    try {
      const created = await createEntity(harness, "noop")
      const slug = created.result.snapshot.currentSlug.normalizedSlug
      const noop = await harness.registry.changeSlug(
        command(`${harness.namespace}:noop-change`, {
          commandType: "change-slug",
          expectedVersion: 1,
          source: entitySource(
            created.identity,
            `${harness.namespace}:noop-change`
          ),
          target: {
            routeId: created.result.snapshot.route.id,
            identity: created.identity,
          },
          slug: { normalizedSlug: slug, normalizationVersion: 1 },
        })
      )
      expect(noop).toMatchObject({
        snapshot: { route: { version: 1 } },
        commit: { outcome: "noop", invalidation: null },
      })
      expect(
        foundValue(
          await harness.registry.listPendingInvalidations({ limit: 100 })
        ).items
      ).toHaveLength(1)
      expect(
        await harness.registry.resolve({
          market: "sk",
          kind: "product",
          normalizedSlug: `${harness.namespace}-missing`,
        })
      ).toEqual({ kind: "missing" })
      const goneIdentity = entityIdentity(`${harness.namespace}-gone-source`)
      const goneSlug = `${harness.namespace}-standalone-gone`
      await harness.registry.registerGone(
        command(`${harness.namespace}:standalone-gone`, {
          commandType: "register-gone",
          expectedVersion: 0,
          source: entitySource(
            goneIdentity,
            `${harness.namespace}:standalone-gone`
          ),
          slug: {
            market: "sk",
            kind: "product",
            normalizedSlug: goneSlug,
            normalizationVersion: 1,
          },
        })
      )
      expect(
        foundValue(
          await harness.registry.resolve({
            market: "sk",
            kind: "product",
            normalizedSlug: goneSlug,
          })
        )
      ).toMatchObject({ disposition: "gone", route: null })
    } finally {
      await harness.cleanup()
    }
  })
}
