import { moduleIntegrationTestRunner } from "@medusajs/test-utils"
import { describe, expect, it, vi } from "vitest"
import { URL_REGISTRY_OUTBOX_MODULE } from "../constants"
import UrlRegistryOutboxEvent from "../models/url-registry-outbox-event"
import UrlRegistryOutboxStream from "../models/url-registry-outbox-stream"
import type UrlRegistryOutboxModuleService from "../service"

vi.setConfig({ testTimeout: 60_000 })

const input = (eventId: string, reason: "created" | "updated" = "updated") => ({
  affectedMarketCodes: ["sk", "cz"] as const,
  eventId,
  occurredAt: "2026-08-18T08:15:30.000Z",
  productId: "prod_1",
  reason,
})

moduleIntegrationTestRunner<UrlRegistryOutboxModuleService>({
  moduleName: URL_REGISTRY_OUTBOX_MODULE,
  moduleModels: [UrlRegistryOutboxStream, UrlRegistryOutboxEvent],
  resolve: "./src/modules/url-registry-outbox",
  testSuite: ({ service }) => {
    describe("enqueueProductLifecycleEvent", () => {
      it("creates one ordered event per market and replays it exactly", async () => {
        const first = await service.enqueueProductLifecycleEvent(
          input("workflow-1:prod_1")
        )
        const replay = await service.enqueueProductLifecycleEvent(
          input("workflow-1:prod_1")
        )

        expect(replay.eventId).toBe(first.eventId)
        expect(replay.fingerprint).toBe(first.fingerprint)
        expect(first.events.map((event) => event.marketCode)).toEqual([
          "cz",
          "sk",
        ])
        expect(first.events.map((event) => event.streamSequence)).toEqual([
          1, 1,
        ])
        expect(first.events.every((event) => !event.replayed)).toBe(true)
        expect(replay.events.every((event) => event.replayed)).toBe(true)
        expect(replay.events.map((event) => event.id)).toEqual(
          first.events.map((event) => event.id)
        )
        expect(new Set(first.events.map((event) => event.id)).size).toBe(2)

        const stored = await service.listUrlRegistryOutboxEvents({
          event_id: "workflow-1:prod_1",
        })
        expect(stored).toHaveLength(2)
      })

      it("rejects event-ID drift without consuming a sequence", async () => {
        await service.enqueueProductLifecycleEvent(input("workflow-2:prod_1"))

        await expect(
          service.enqueueProductLifecycleEvent(
            input("workflow-2:prod_1", "created")
          )
        ).rejects.toMatchObject({ name: "UrlRegistryOutboxConflictError" })

        const next = await service.enqueueProductLifecycleEvent(
          input("workflow-3:prod_1")
        )
        expect(next.events.map((event) => event.streamSequence)).toEqual([2, 2])
      })

      it("allocates unique increasing sequences under concurrency", async () => {
        const results = await Promise.all(
          Array.from({ length: 8 }, (_, index) =>
            service.enqueueProductLifecycleEvent(input(`concurrent-${index}`))
          )
        )

        for (const marketCode of ["cz", "sk"] as const) {
          const sequences = results
            .flatMap((result) => result.events)
            .filter((event) => event.marketCode === marketCode)
            .map((event) => event.streamSequence)
            .sort((left, right) => left - right)
          expect(sequences).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
        }
      })

      it("replays identical concurrent events without sequence gaps", async () => {
        const results = await Promise.all(
          Array.from({ length: 8 }, () =>
            service.enqueueProductLifecycleEvent(input("concurrent-replay"))
          )
        )

        for (const marketCode of ["cz", "sk"] as const) {
          const events = results
            .flatMap((result) => result.events)
            .filter((event) => event.marketCode === marketCode)
          expect(new Set(events.map((event) => event.id)).size).toBe(1)
          expect(new Set(events.map((event) => event.streamSequence))).toEqual(
            new Set([1])
          )
        }

        const stored = await service.listUrlRegistryOutboxEvents({
          event_id: "concurrent-replay",
        })
        expect(stored).toHaveLength(2)
        const streams = await service.listUrlRegistryOutboxStreams({})
        expect(streams.map((stream) => stream.last_sequence)).toEqual([1, 1])
      })

      it("rolls back every market when one replay conflicts", async () => {
        await service.enqueueProductLifecycleEvent({
          ...input("shared-event"),
          affectedMarketCodes: ["sk"],
        })

        await expect(
          service.enqueueProductLifecycleEvent({
            ...input("shared-event", "created"),
            affectedMarketCodes: ["cz", "sk"],
          })
        ).rejects.toMatchObject({ name: "UrlRegistryOutboxConflictError" })

        expect(
          await service.listUrlRegistryOutboxEvents({
            event_id: "shared-event",
            market_code: "cz",
          })
        ).toHaveLength(0)
        expect(
          await service.listUrlRegistryOutboxStreams({ market_code: "cz" })
        ).toHaveLength(0)
      })
    })
  },
})
