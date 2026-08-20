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
  marketAssignments: (["sk", "cz"] as const).map((marketCode) => ({
    assignment: null,
    marketCode,
    sourceVersion: "2026-08-18T08:00:00.000Z",
  })),
  occurredAt: "2026-08-18T08:15:30.000Z",
  productId: "prod_1",
  reason,
})

const deliveryInput = (
  eventId: string,
  productId: string,
  reason: "created" | "updated" = "updated"
) => ({
  ...input(eventId, reason),
  affectedMarketCodes: ["sk"] as const,
  marketAssignments: [
    {
      assignment: null,
      marketCode: "sk" as const,
      sourceVersion: "2026-08-18T08:00:00.000Z",
    },
  ],
  productId,
})

const catalogInput = (
  eventId: string,
  entityKind: "category" | "brand" | "collection" = "category",
  marketCode: "sk" | "ro" = "ro"
) => ({
  affectedMarketCodes: [marketCode],
  entityId: `${entityKind}_1`,
  entityKind,
  eventId,
  marketAssignments: [
    {
      assignment: {
        publicationStatus: "published" as const,
        publicSlug: `${entityKind}-${marketCode}`,
        salesChannelId: `sc_${marketCode}`,
      },
      marketCode,
      sourceVersion: "3",
    },
  ],
  occurredAt: "2026-08-20T10:00:00.000Z",
  reason: "assignment-upsert" as const,
})

const FIRST_CLAIM_AT = "2030-01-01T00:00:00.000Z"
const SECOND_CLAIM_AT = "2030-01-01T00:00:02.000Z"

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
          marketAssignments: [input("shared-event").marketAssignments[0]],
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

    describe("enqueueCatalogLifecycleEvent", () => {
      it.each([
        "category",
        "brand",
        "collection",
      ] as const)("preserves the %s stream identity and replays exactly", async (entityKind) => {
        const event = catalogInput(`catalog:${entityKind}`, entityKind)
        const first = await service.enqueueCatalogLifecycleEvent(event)
        const replay = await service.enqueueCatalogLifecycleEvent(event)

        expect(first.events).toEqual([
          expect.objectContaining({ marketCode: "ro", streamSequence: 1 }),
        ])
        expect(replay.events[0]).toEqual(
          expect.objectContaining({ replayed: true, streamSequence: 1 })
        )
        const [stored] = await service.listUrlRegistryOutboxEvents({
          event_id: event.eventId,
        })
        expect(stored).toMatchObject({
          entity_id: `${entityKind}_1`,
          entity_kind: entityKind,
          market_code: "ro",
        })
      })

      it("isolates the same entity and slug between SK and RO streams", async () => {
        const ro = await service.enqueueCatalogLifecycleEvent(
          catalogInput("catalog:ro", "category", "ro")
        )
        const sk = await service.enqueueCatalogLifecycleEvent(
          catalogInput("catalog:sk", "category", "sk")
        )

        expect(ro.events[0]?.streamSequence).toBe(1)
        expect(sk.events[0]?.streamSequence).toBe(1)
        expect(ro.events[0]?.streamId).not.toBe(sk.events[0]?.streamId)
      })

      it("rejects multi-market catalog events before allocating a stream", async () => {
        await expect(
          service.enqueueCatalogLifecycleEvent({
            ...catalogInput("catalog:cross-market"),
            affectedMarketCodes: ["sk", "ro"],
            marketAssignments: [
              catalogInput("catalog:cross-market", "category", "sk")
                .marketAssignments[0],
              catalogInput("catalog:cross-market", "category", "ro")
                .marketAssignments[0],
            ],
          })
        ).rejects.toMatchObject({ name: "UrlRegistryOutboxInputError" })
        expect(
          await service.listUrlRegistryOutboxEvents({
            event_id: "catalog:cross-market",
          })
        ).toHaveLength(0)
      })
    })

    describe("delivery state", () => {
      it("claims only the FIFO head of each stream", async () => {
        await service.enqueueProductLifecycleEvent(
          deliveryInput("fifo-a-1", "prod_fifo_a")
        )
        await service.enqueueProductLifecycleEvent(
          deliveryInput("fifo-a-2", "prod_fifo_a")
        )
        await service.enqueueProductLifecycleEvent(
          deliveryInput("fifo-b-1", "prod_fifo_b")
        )

        const claimed = await service.claimUrlRegistryOutboxEvents({
          claimedBy: "worker-a",
          leaseDurationMs: 60_000,
          limit: 10,
          now: FIRST_CLAIM_AT,
        })

        expect(claimed).toHaveLength(2)
        expect(claimed.map((event) => event.eventId).sort()).toEqual([
          "fifo-a-1",
          "fifo-b-1",
        ])
        expect(
          claimed.every(
            (event) =>
              event.attemptCount === 1 &&
              event.claimedBy === "worker-a" &&
              event.status === "processing"
          )
        ).toBe(true)

        const first = claimed.find((event) => event.eventId === "fifo-a-1")
        expect(first).toBeDefined()
        await service.acknowledgeUrlRegistryOutboxEvent({
          claimToken: first?.claimToken,
          id: first?.id,
          now: "2030-01-01T00:00:01.000Z",
          outcome: "applied",
        })

        const next = await service.claimUrlRegistryOutboxEvents({
          claimedBy: "worker-b",
          leaseDurationMs: 60_000,
          limit: 10,
          now: SECOND_CLAIM_AT,
        })
        expect(next.map((event) => event.eventId)).toEqual(["fifo-a-2"])
      })

      it("uses row locks to give concurrent workers disjoint claims", async () => {
        for (let index = 0; index < 6; index += 1) {
          await service.enqueueProductLifecycleEvent(
            deliveryInput(`concurrent-claim-${index}`, `prod_claim_${index}`)
          )
        }

        const [first, second] = await Promise.all([
          service.claimUrlRegistryOutboxEvents({
            claimedBy: "worker-a",
            leaseDurationMs: 60_000,
            limit: 3,
            now: FIRST_CLAIM_AT,
          }),
          service.claimUrlRegistryOutboxEvents({
            claimedBy: "worker-b",
            leaseDurationMs: 60_000,
            limit: 3,
            now: FIRST_CLAIM_AT,
          }),
        ])

        expect(first).toHaveLength(3)
        expect(second).toHaveLength(3)
        expect(
          new Set([...first, ...second].map((event) => event.id)).size
        ).toBe(6)
      })

      it("retries with a delay and rejects a stale claim token", async () => {
        await service.enqueueProductLifecycleEvent(
          deliveryInput("retry-1", "prod_retry")
        )
        const [firstClaim] = await service.claimUrlRegistryOutboxEvents({
          claimedBy: "worker-a",
          leaseDurationMs: 60_000,
          limit: 1,
          now: FIRST_CLAIM_AT,
        })
        expect(firstClaim).toBeDefined()

        await service.retryUrlRegistryOutboxEvent({
          claimToken: firstClaim?.claimToken,
          errorCode: "urlr-unavailable",
          id: firstClaim?.id,
          now: "2030-01-01T00:00:01.000Z",
          retryAfterMs: 1000,
        })

        expect(
          await service.claimUrlRegistryOutboxEvents({
            claimedBy: "worker-b",
            leaseDurationMs: 60_000,
            limit: 1,
            now: "2030-01-01T00:00:01.999Z",
          })
        ).toEqual([])

        const [secondClaim] = await service.claimUrlRegistryOutboxEvents({
          claimedBy: "worker-b",
          leaseDurationMs: 60_000,
          limit: 1,
          now: SECOND_CLAIM_AT,
        })
        expect(secondClaim?.attemptCount).toBe(2)
        expect(secondClaim?.claimToken).not.toBe(firstClaim?.claimToken)

        await expect(
          service.acknowledgeUrlRegistryOutboxEvent({
            claimToken: firstClaim?.claimToken,
            id: firstClaim?.id,
            now: "2030-01-01T00:00:03.000Z",
            outcome: "applied",
          })
        ).rejects.toMatchObject({
          name: "UrlRegistryOutboxClaimConflictError",
        })

        const [stored] = await service.listUrlRegistryOutboxEvents({
          id: firstClaim?.id,
        })
        expect(stored?.claim_token).toBe(secondClaim?.claimToken)
        expect(stored?.status).toBe("processing")
      })

      it("reclaims only expired leases and invalidates their old tokens", async () => {
        await service.enqueueProductLifecycleEvent(
          deliveryInput("expired-lease", "prod_expired")
        )
        await service.enqueueProductLifecycleEvent(
          deliveryInput("active-lease", "prod_active")
        )

        const [expired] = await service.claimUrlRegistryOutboxEvents({
          claimedBy: "worker-a",
          leaseDurationMs: 1000,
          limit: 1,
          now: FIRST_CLAIM_AT,
        })
        const [active] = await service.claimUrlRegistryOutboxEvents({
          claimedBy: "worker-a",
          leaseDurationMs: 60_000,
          limit: 1,
          now: FIRST_CLAIM_AT,
        })
        expect(expired).toBeDefined()
        expect(active).toBeDefined()

        const reclaimed = await service.reclaimExpiredUrlRegistryOutboxEvents({
          limit: 10,
          now: SECOND_CLAIM_AT,
        })
        expect(reclaimed.map((event) => event.id)).toEqual([expired?.id])

        await expect(
          service.failUrlRegistryOutboxEvent({
            claimToken: expired?.claimToken,
            errorCode: "stale-worker",
            id: expired?.id,
            now: "2030-01-01T00:00:03.000Z",
          })
        ).rejects.toMatchObject({
          name: "UrlRegistryOutboxClaimConflictError",
        })

        const stored = await service.listUrlRegistryOutboxEvents({})
        expect(stored.find((event) => event.id === expired?.id)?.status).toBe(
          "pending"
        )
        expect(stored.find((event) => event.id === active?.id)?.status).toBe(
          "processing"
        )
      })

      it("makes delivered and failed states terminal and lets failure block FIFO", async () => {
        await service.enqueueProductLifecycleEvent(
          deliveryInput("terminal-failed-1", "prod_terminal")
        )
        await service.enqueueProductLifecycleEvent(
          deliveryInput("terminal-failed-2", "prod_terminal")
        )
        await service.enqueueProductLifecycleEvent(
          deliveryInput("terminal-delivered", "prod_delivered")
        )

        const claimed = await service.claimUrlRegistryOutboxEvents({
          claimedBy: "worker-a",
          leaseDurationMs: 60_000,
          limit: 10,
          now: FIRST_CLAIM_AT,
        })
        const failed = claimed.find(
          (event) => event.eventId === "terminal-failed-1"
        )
        const delivered = claimed.find(
          (event) => event.eventId === "terminal-delivered"
        )
        expect(failed).toBeDefined()
        expect(delivered).toBeDefined()

        await service.failUrlRegistryOutboxEvent({
          claimToken: failed?.claimToken,
          errorCode: "invalid-command",
          id: failed?.id,
          now: "2030-01-01T00:00:01.000Z",
        })
        await service.acknowledgeUrlRegistryOutboxEvent({
          claimToken: delivered?.claimToken,
          id: delivered?.id,
          now: "2030-01-01T00:00:01.000Z",
          outcome: "already-applied",
        })

        await expect(
          service.retryUrlRegistryOutboxEvent({
            claimToken: delivered?.claimToken,
            errorCode: "too-late",
            id: delivered?.id,
            now: SECOND_CLAIM_AT,
            retryAfterMs: 0,
          })
        ).rejects.toMatchObject({
          name: "UrlRegistryOutboxClaimConflictError",
        })
        expect(
          await service.claimUrlRegistryOutboxEvents({
            claimedBy: "worker-b",
            leaseDurationMs: 60_000,
            limit: 10,
            now: SECOND_CLAIM_AT,
          })
        ).toEqual([])

        const stored = await service.listUrlRegistryOutboxEvents({})
        expect(stored.find((event) => event.id === failed?.id)).toMatchObject({
          delivery_outcome: null,
          status: "failed",
        })
        expect(
          stored.find((event) => event.id === delivered?.id)
        ).toMatchObject({
          delivery_outcome: "already-applied",
          status: "delivered",
        })
      })

      it("rejects unbounded and ambiguous delivery-state inputs", async () => {
        await expect(
          service.claimUrlRegistryOutboxEvents({
            claimedBy: "worker-a",
            leaseDurationMs: 60_000,
            limit: 0,
            now: FIRST_CLAIM_AT,
          })
        ).rejects.toMatchObject({
          name: "UrlRegistryOutboxDeliveryInputError",
        })
        await expect(
          service.claimUrlRegistryOutboxEvents({
            claimedBy: "w".repeat(129),
            leaseDurationMs: 60_000,
            limit: 101,
            now: FIRST_CLAIM_AT,
          })
        ).rejects.toMatchObject({
          name: "UrlRegistryOutboxDeliveryInputError",
        })
        await expect(
          service.claimUrlRegistryOutboxEvents({
            claimedBy: "worker-a",
            leaseDurationMs: 0,
            limit: 1,
            now: FIRST_CLAIM_AT,
          })
        ).rejects.toMatchObject({
          name: "UrlRegistryOutboxDeliveryInputError",
        })
        await Promise.all(
          [null, 0, true].map((now) =>
            expect(
              service.claimUrlRegistryOutboxEvents({
                claimedBy: "worker-a",
                leaseDurationMs: 60_000,
                limit: 1,
                now,
              })
            ).rejects.toMatchObject({
              name: "UrlRegistryOutboxDeliveryInputError",
            })
          )
        )

        await service.enqueueProductLifecycleEvent(
          deliveryInput("bounded-retry", "prod_bounded")
        )
        const [claimed] = await service.claimUrlRegistryOutboxEvents({
          claimedBy: "worker-a",
          leaseDurationMs: 60_000,
          limit: 1,
          now: FIRST_CLAIM_AT,
        })
        await expect(
          service.retryUrlRegistryOutboxEvent({
            claimToken: claimed?.claimToken,
            errorCode: "e".repeat(129),
            id: claimed?.id,
            now: FIRST_CLAIM_AT,
            retryAfterMs: 86_400_001,
          })
        ).rejects.toMatchObject({
          name: "UrlRegistryOutboxDeliveryInputError",
        })
        await expect(
          service.acknowledgeUrlRegistryOutboxEvent({
            claimToken: claimed?.claimToken,
            eventId: claimed?.id,
            now: FIRST_CLAIM_AT,
            outcome: "applied",
          })
        ).rejects.toMatchObject({
          name: "UrlRegistryOutboxDeliveryInputError",
        })
      })
    })
  },
})
