import { describe, expect, it } from "vitest"
import type { UrlRegistry } from "./contracts"

export type RegistryBehaviorHarness = {
  registry: UrlRegistry
  entityId: string
  slugPrefix: string
  cleanup(): Promise<void>
}

type Suite = (name: string, factory: () => void) => unknown

export const runUrlRegistryBehaviorSuite = (
  name: string,
  createHarness: () => Promise<RegistryBehaviorHarness>,
  suite: Suite = describe
) => {
  suite(name, () => {
    it("shares unique, alias, lookup, and tombstone semantics", async () => {
      const harness = await createHarness()
      const { entityId, registry, slugPrefix } = harness
      const originalSlug = `${slugPrefix}-one`
      try {
        const original = await registry.create({
          market: "ro",
          kind: "campaign",
          slug: originalSlug,
          entityId,
          equivalenceKey: `campaign:${entityId}`,
          indexable: true,
        })
        await expect(
          registry.create({
            market: "ro",
            kind: "campaign",
            slug: originalSlug,
            entityId: `${entityId}-collision`,
            equivalenceKey: `campaign:${entityId}-collision`,
            indexable: true,
          })
        ).rejects.toMatchObject({ code: "UNIQUE_VIOLATION" })

        await registry.changeSlug(
          "ro",
          "campaign",
          entityId,
          `${slugPrefix}-two`
        )
        const current = await registry.changeSlug(
          "ro",
          "campaign",
          entityId,
          `${slugPrefix}-three`
        )
        expect(current.id).not.toBe(original.id)
        for (const slug of [originalSlug, `${slugPrefix}-two`]) {
          await expect(
            registry.lookup("ro", "campaign", slug)
          ).resolves.toMatchObject({
            type: "alias",
            currentRecord: { id: current.id, status: "current" },
          })
        }

        await registry.tombstone("ro", "campaign", entityId)
        for (const slug of [
          originalSlug,
          `${slugPrefix}-two`,
          `${slugPrefix}-three`,
        ]) {
          await expect(
            registry.lookup("ro", "campaign", slug)
          ).resolves.toMatchObject({ type: "tombstone" })
        }
      } finally {
        await harness.cleanup()
      }
    })

    it("tombstones every market in one registry operation", async () => {
      const harness = await createHarness()
      const { entityId, registry, slugPrefix } = harness
      const markets = ["sk", "cz", "hu", "ro"] as const
      try {
        for (const market of markets) {
          await registry.create({
            market,
            kind: "article",
            slug: `${slugPrefix}-${market}`,
            entityId,
            equivalenceKey: `article:${entityId}`,
            indexable: true,
          })
        }
        await expect(
          registry.tombstoneAllMarkets("article", entityId)
        ).resolves.toHaveLength(4)
        for (const market of markets) {
          await expect(
            registry.lookup(market, "article", `${slugPrefix}-${market}`)
          ).resolves.toMatchObject({ type: "tombstone" })
        }
      } finally {
        await harness.cleanup()
      }
    })

    it("syncs published entities idempotently across their lifecycle", async () => {
      const harness = await createHarness()
      const { entityId, registry, slugPrefix } = harness
      const firstSlug = `${slugPrefix}-sync-one`
      const secondSlug = `${slugPrefix}-sync-two`
      const baseInput = {
        market: "ro" as const,
        kind: "campaign" as const,
        entityId,
        equivalenceKey: `campaign:${entityId}`,
        indexable: true,
      }
      try {
        const initial = await registry.sync({ ...baseInput, slug: firstSlug })
        expect(initial).toMatchObject({
          slug: firstSlug,
          status: "current",
          indexable: true,
        })

        const idempotent = await registry.sync({
          ...baseInput,
          slug: firstSlug,
          equivalenceKey: `campaign:${entityId}:updated`,
          indexable: false,
        })
        expect(idempotent).toMatchObject({
          id: initial.id,
          equivalenceKey: `campaign:${entityId}:updated`,
          indexable: false,
        })

        const renamed = await registry.sync({
          ...baseInput,
          slug: secondSlug,
          equivalenceKey: `campaign:${entityId}:renamed`,
          indexable: true,
        })
        expect(renamed).toMatchObject({
          slug: secondSlug,
          equivalenceKey: `campaign:${entityId}:renamed`,
          indexable: true,
        })
        expect(renamed.id).not.toBe(initial.id)
        await expect(
          registry.lookup("ro", "campaign", firstSlug)
        ).resolves.toMatchObject({
          type: "alias",
          currentRecord: { id: renamed.id },
        })

        await expect(
          registry.sync({
            ...baseInput,
            slug: secondSlug,
            entityId: `${entityId}-collision`,
          })
        ).rejects.toMatchObject({ code: "UNIQUE_VIOLATION" })
        await expect(
          registry.findByEntity("ro", "campaign", entityId)
        ).resolves.toMatchObject({ id: renamed.id })

        await registry.tombstone("ro", "campaign", entityId)
        const restored = await registry.sync({
          ...baseInput,
          slug: firstSlug,
          equivalenceKey: `campaign:${entityId}:restored`,
          indexable: false,
        })
        expect(restored).toMatchObject({
          id: initial.id,
          slug: firstSlug,
          status: "current",
          aliasOf: null,
          equivalenceKey: `campaign:${entityId}:restored`,
          indexable: false,
        })
        await expect(
          registry.lookup("ro", "campaign", secondSlug)
        ).resolves.toMatchObject({
          type: "tombstone",
          record: { aliasOf: null },
        })

        const reclaimedTombstone = await registry.sync({
          ...baseInput,
          slug: secondSlug,
          equivalenceKey: `campaign:${entityId}:reclaimed-tombstone`,
          indexable: true,
        })
        expect(reclaimedTombstone).toMatchObject({
          id: renamed.id,
          slug: secondSlug,
          status: "current",
        })
        await expect(
          registry.lookup("ro", "campaign", firstSlug)
        ).resolves.toMatchObject({
          type: "alias",
          currentRecord: { id: reclaimedTombstone.id },
        })

        const reclaimedAlias = await registry.sync({
          ...baseInput,
          slug: firstSlug,
          equivalenceKey: `campaign:${entityId}:reclaimed-alias`,
          indexable: true,
        })
        expect(reclaimedAlias).toMatchObject({
          id: initial.id,
          slug: firstSlug,
          status: "current",
        })
        await expect(
          registry.lookup("ro", "campaign", secondSlug)
        ).resolves.toMatchObject({
          type: "alias",
          currentRecord: { id: reclaimedAlias.id },
        })
      } finally {
        await harness.cleanup()
      }
    })
  })
}
