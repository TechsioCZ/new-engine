import { moduleIntegrationTestRunner } from "@medusajs/test-utils"
import { describe, expect, it } from "vitest"
import type UrlRegistryOutboxModuleService from "../../url-registry-outbox/service"
import { unpublishCatalogEntityAssignments } from "../catalog-lifecycle"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../index"
import StorefrontUrlAssignment from "../models/storefront-url-assignment"
import type StorefrontUrlAssignmentModuleService from "../service"

moduleIntegrationTestRunner<StorefrontUrlAssignmentModuleService>({
  moduleModels: [StorefrontUrlAssignment],
  moduleName: STOREFRONT_URL_ASSIGNMENT_MODULE,
  resolve: "./src/modules/storefront-url-assignment",
  testSuite: ({ service }) => {
    describe("runInTransaction", () => {
      it("rolls an assignment back when the downstream enqueue fails", async () => {
        const entityId = "category_atomic_rollback"

        await expect(
          service.runInTransaction(async (sharedContext) => {
            await service.createStorefrontUrlAssignments(
              {
                entity_id: entityId,
                entity_kind: "category",
                market_code: "ro",
                publication_status: "published",
                public_slug: "categorie-rollback",
                sales_channel_id: "sc_ro",
                schema_version: 1,
                source_version: 1,
              },
              sharedContext
            )
            throw new Error("simulated downstream enqueue failure")
          })
        ).rejects.toThrow("simulated downstream enqueue failure")

        await expect(
          service.listStorefrontUrlAssignments({ entity_id: entityId })
        ).resolves.toEqual([])
      })

      it("restores a published assignment when unpublish enqueue fails", async () => {
        const entityId = "category_unpublish_rollback"
        const created = await service.createStorefrontUrlAssignments({
          entity_id: entityId,
          entity_kind: "category",
          market_code: "sk",
          publication_status: "published",
          public_slug: "kategoria-rollback",
          sales_channel_id: "sc_sk",
          schema_version: 1,
          source_version: 4,
        })

        await expect(
          service.runInTransaction(async (sharedContext) => {
            await service.updateStorefrontUrlAssignments(
              {
                id: created.id,
                publication_status: "draft",
                source_version: 5,
              },
              sharedContext
            )
            throw new Error("simulated unpublish enqueue failure")
          })
        ).rejects.toThrow("simulated unpublish enqueue failure")

        await expect(
          service.listStorefrontUrlAssignments({ id: created.id })
        ).resolves.toEqual([
          expect.objectContaining({
            publication_status: "published",
            source_version: 4,
          }),
        ])
      })

      it("serializes a concurrent admin update before deletion so deletion wins", async () => {
        const entityId = "category_concurrent_delete_wins"
        const created = await service.createStorefrontUrlAssignments({
          entity_id: entityId,
          entity_kind: "category",
          market_code: "ro",
          publication_status: "published",
          public_slug: "categorie-initiala",
          sales_channel_id: "sc_ro",
          schema_version: 1,
          source_version: 1,
        })
        let signalAdminLocked: (() => void) | undefined
        const adminLocked = new Promise<void>((resolve) => {
          signalAdminLocked = resolve
        })
        let releaseAdmin: (() => void) | undefined
        const adminCanCommit = new Promise<void>((resolve) => {
          releaseAdmin = resolve
        })

        const adminUpdate = service.runInTransaction(async (sharedContext) => {
          await service.lockCatalogEntityAssignments(
            "category",
            entityId,
            sharedContext
          )
          signalAdminLocked?.()
          await adminCanCommit
          const [current] = await service.listStorefrontUrlAssignments(
            { id: created.id },
            { take: 1 },
            sharedContext
          )
          return await service.updateStorefrontUrlAssignments(
            {
              id: current.id,
              publication_status: "published",
              public_slug: "categorie-admin",
              source_version: current.source_version + 1,
            },
            sharedContext
          )
        })
        await adminLocked

        const delivered: unknown[] = []
        const outboxService = {
          enqueueCatalogLifecycleEvent: async (event: unknown) => {
            delivered.push(event)
          },
        } as unknown as UrlRegistryOutboxModuleService
        const deletion = unpublishCatalogEntityAssignments({
          assignmentService: service,
          entityId,
          entityKind: "category",
          outboxService,
        })

        releaseAdmin?.()
        await Promise.all([adminUpdate, deletion])

        await expect(
          service.listStorefrontUrlAssignments({ id: created.id })
        ).resolves.toEqual([
          expect.objectContaining({
            publication_status: "draft",
            public_slug: "categorie-admin",
            source_version: 3,
          }),
        ])
        expect(delivered).toEqual([
          expect.objectContaining({
            affectedMarketCodes: ["ro"],
            entityId,
            entityKind: "category",
            marketAssignments: [
              expect.objectContaining({
                assignment: expect.objectContaining({
                  publicationStatus: "draft",
                }),
                marketCode: "ro",
                sourceVersion: "3",
              }),
            ],
          }),
        ])
      })
    })
  },
})
