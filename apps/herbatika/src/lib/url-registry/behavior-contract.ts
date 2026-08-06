import { describe, expect, it } from "vitest"
import type { UrlRegistry } from "./contracts"

export type RegistryBehaviorHarness = {
  registry: UrlRegistry
  entityId: string
  slugPrefix: string
  cleanup(): Promise<void>
}

export const runUrlRegistryBehaviorSuite = (
  name: string,
  createHarness: () => Promise<RegistryBehaviorHarness>,
  suite: typeof describe = describe
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
  })
}
