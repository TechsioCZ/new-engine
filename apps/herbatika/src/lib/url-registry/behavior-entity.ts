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

export const runEntityBehavior = (createHarness: HarnessFactory) => {
  it("creates a logical entity route and resolves its current slug", async () => {
    const harness = await createHarness()
    try {
      const created = await createEntity(harness, "create")
      const slug = created.result.snapshot.currentSlug.normalizedSlug
      expect(created.result).toMatchObject({
        commit: { outcome: "applied", replayed: false },
        snapshot: {
          projectionType: "entity",
          route: { status: "active", version: 1 },
          currentSlug: { disposition: "current" },
        },
      })
      expect(
        foundValue(
          await harness.registry.resolve({
            market: "sk",
            kind: "product",
            normalizedSlug: slug,
          })
        ).disposition
      ).toBe("current")
      const audits = foundValue(
        await harness.registry.listAuditRecords({ limit: 100 })
      )
      const outbox = foundValue(
        await harness.registry.listPendingInvalidations({ limit: 100 })
      )
      expect(audits.items).toHaveLength(1)
      expect(outbox.items).toHaveLength(1)
      expect(outbox.items[0].tags).toEqual([...outbox.items[0].tags].sort())
    } finally {
      await harness.cleanup()
    }
  })

  it("keeps aliases target-free and joins them to the latest current slug", async () => {
    const harness = await createHarness()
    try {
      const created = await createEntity(harness, "aliases", {
        slug: `${harness.namespace}-first`,
      })
      const routeId = created.result.snapshot.route.id
      const change = async (slug: string, version: number) =>
        harness.registry.changeSlug(
          command(`${harness.namespace}:slug:${version}`, {
            commandType: "change-slug",
            expectedVersion: version,
            source: entitySource(
              created.identity,
              `${harness.namespace}:slug:${version}`,
              String(version + 1)
            ),
            target: { routeId, identity: created.identity },
            slug: { normalizedSlug: slug, normalizationVersion: 1 },
          })
        )
      await change(`${harness.namespace}-second`, 1)
      const latest = await change(`${harness.namespace}-third`, 2)
      expect(
        latest.snapshot.slugHistory.filter(
          (slug) => slug.disposition === "current"
        )
      ).toHaveLength(1)
      for (const oldSlug of [
        `${harness.namespace}-first`,
        `${harness.namespace}-second`,
      ]) {
        const resolution = foundValue(
          await harness.registry.resolve({
            market: "sk",
            kind: "product",
            normalizedSlug: oldSlug,
          })
        )
        expect(resolution).toMatchObject({
          disposition: "alias",
          currentSlug: { normalizedSlug: `${harness.namespace}-third` },
        })
        expect("targetSlug" in resolution.matchedSlug).toBe(false)
      }
    } finally {
      await harness.cleanup()
    }
  })

  it("never reuses historical, gone, or stable identity reservations", async () => {
    const harness = await createHarness()
    try {
      const first = await createEntity(harness, "reserved", {
        slug: `${harness.namespace}-old`,
      })
      await harness.registry.changeSlug(
        command(`${harness.namespace}:reserve-change`, {
          commandType: "change-slug",
          expectedVersion: 1,
          source: entitySource(
            first.identity,
            `${harness.namespace}:reserve-change`
          ),
          target: {
            routeId: first.result.snapshot.route.id,
            identity: first.identity,
          },
          slug: {
            normalizedSlug: `${harness.namespace}-new`,
            normalizationVersion: 1,
          },
        })
      )
      const other = entityIdentity(`${harness.namespace}-other`)
      await expect(
        harness.registry.createEntityRoute(
          command(
            `${harness.namespace}:reuse-alias`,
            createEntityRequest({
              identity: other,
              eventId: `${harness.namespace}:reuse-alias`,
              slug: `${harness.namespace}-old`,
              equivalenceKey: null,
            })
          )
        )
      ).rejects.toMatchObject({ code: "SLUG_CONFLICT" })
      const gone = `${harness.namespace}-gone`
      await harness.registry.registerGone(
        command(`${harness.namespace}:gone`, {
          commandType: "register-gone",
          expectedVersion: 0,
          source: entitySource(other, `${harness.namespace}:gone`),
          slug: {
            market: "sk",
            kind: "product",
            normalizedSlug: gone,
            normalizationVersion: 1,
          },
        })
      )
      await expect(
        harness.registry.createEntityRoute(
          command(
            `${harness.namespace}:reuse-gone`,
            createEntityRequest({
              identity: other,
              eventId: `${harness.namespace}:reuse-gone`,
              slug: gone,
              equivalenceKey: null,
            })
          )
        )
      ).rejects.toMatchObject({ code: "SLUG_CONFLICT" })
      await expect(
        harness.registry.createEntityRoute(
          command(
            `${harness.namespace}:reuse-id`,
            createEntityRequest({
              identity: first.identity,
              eventId: `${harness.namespace}:reuse-id`,
              slug: `${harness.namespace}-another`,
              equivalenceKey: null,
            })
          )
        )
      ).rejects.toMatchObject({ code: "IDENTITY_CONFLICT" })
    } finally {
      await harness.cleanup()
    }
  })
}
