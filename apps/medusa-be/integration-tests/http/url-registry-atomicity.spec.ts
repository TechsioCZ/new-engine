import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { describe, expect, it, vi } from "vitest"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../../src/modules/storefront-url-assignment"
import {
  enqueueCatalogAssignmentLifecycle,
  unpublishCatalogEntityAssignments,
} from "../../src/modules/storefront-url-assignment/catalog-lifecycle"
import type StorefrontUrlAssignmentModuleService from "../../src/modules/storefront-url-assignment/service"
import { URL_REGISTRY_OUTBOX_MODULE } from "../../src/modules/url-registry-outbox"
import type UrlRegistryOutboxModuleService from "../../src/modules/url-registry-outbox/service"

vi.setConfig({ testTimeout: 60_000 })

medusaIntegrationTestRunner({
  inApp: true,
  testSuite: ({ getContainer }) => {
    describe("catalog assignment and URL registry outbox atomicity", () => {
      it("commits, replays, retires, and rolls back both real modules together", async () => {
        const container = getContainer()
        const assignmentService =
          container.resolve<StorefrontUrlAssignmentModuleService>(
            STOREFRONT_URL_ASSIGNMENT_MODULE
          )
        const outboxService = container.resolve<UrlRegistryOutboxModuleService>(
          URL_REGISTRY_OUTBOX_MODULE
        )
        const committedEntityId = "category_real_atomic_commit"

        const committed = await assignmentService.runInTransaction(
          async (sharedContext) => {
            const assignment =
              await assignmentService.createStorefrontUrlAssignments(
                {
                  entity_id: committedEntityId,
                  entity_kind: "category",
                  market_code: "ro",
                  publication_status: "published",
                  public_slug: "categorie-atomica",
                  sales_channel_id: "sc_ro",
                  schema_version: 1,
                  source_version: 1,
                },
                sharedContext
              )
            await enqueueCatalogAssignmentLifecycle(
              outboxService,
              assignment,
              sharedContext
            )
            return assignment
          }
        )

        await assignmentService.runInTransaction(async (sharedContext) => {
          await enqueueCatalogAssignmentLifecycle(
            outboxService,
            committed,
            sharedContext
          )
        })
        await expect(
          outboxService.listUrlRegistryOutboxEvents({
            entity_id: committedEntityId,
          })
        ).resolves.toHaveLength(1)
        await expect(
          outboxService.listUrlRegistryOutboxStreams({
            entity_id: committedEntityId,
          })
        ).resolves.toEqual([
          expect.objectContaining({ last_sequence: 1, market_code: "ro" }),
        ])

        await unpublishCatalogEntityAssignments({
          assignmentService,
          entityId: committedEntityId,
          entityKind: "category",
          outboxService,
        })
        await expect(
          assignmentService.listStorefrontUrlAssignments({
            entity_id: committedEntityId,
          })
        ).resolves.toEqual([
          expect.objectContaining({
            publication_status: "draft",
            source_version: 2,
          }),
        ])
        await expect(
          outboxService.listUrlRegistryOutboxEvents({
            entity_id: committedEntityId,
          })
        ).resolves.toHaveLength(2)
        await expect(
          outboxService.listUrlRegistryOutboxStreams({
            entity_id: committedEntityId,
          })
        ).resolves.toEqual([
          expect.objectContaining({ last_sequence: 2, market_code: "ro" }),
        ])

        const rollbackEntityId = "category_real_atomic_rollback"
        await expect(
          assignmentService.runInTransaction(async (sharedContext) => {
            const assignment =
              await assignmentService.createStorefrontUrlAssignments(
                {
                  entity_id: rollbackEntityId,
                  entity_kind: "category",
                  market_code: "sk",
                  publication_status: "published",
                  public_slug: "kategoria-rollback",
                  sales_channel_id: "sc_sk",
                  schema_version: 1,
                  source_version: 1,
                },
                sharedContext
              )
            await enqueueCatalogAssignmentLifecycle(
              outboxService,
              assignment,
              sharedContext
            )
            throw new Error("deliberate cross-module rollback")
          })
        ).rejects.toThrow("deliberate cross-module rollback")
        await expect(
          assignmentService.listStorefrontUrlAssignments({
            entity_id: rollbackEntityId,
          })
        ).resolves.toEqual([])
        await expect(
          outboxService.listUrlRegistryOutboxEvents({
            entity_id: rollbackEntityId,
          })
        ).resolves.toEqual([])
        await expect(
          outboxService.listUrlRegistryOutboxStreams({
            entity_id: rollbackEntityId,
          })
        ).resolves.toEqual([])

        const concurrentEntityId = "category_real_delete_wins"
        const initial = await assignmentService.runInTransaction(
          async (sharedContext) => {
            const assignment =
              await assignmentService.createStorefrontUrlAssignments(
                {
                  entity_id: concurrentEntityId,
                  entity_kind: "category",
                  market_code: "ro",
                  publication_status: "published",
                  public_slug: "categorie-initiala",
                  sales_channel_id: "sc_ro",
                  schema_version: 1,
                  source_version: 1,
                },
                sharedContext
              )
            await enqueueCatalogAssignmentLifecycle(
              outboxService,
              assignment,
              sharedContext
            )
            return assignment
          }
        )
        let signalAdminLocked: (() => void) | undefined
        const adminLocked = new Promise<void>((resolve) => {
          signalAdminLocked = resolve
        })
        let releaseAdmin: (() => void) | undefined
        const adminCanCommit = new Promise<void>((resolve) => {
          releaseAdmin = resolve
        })
        const adminUpdate = assignmentService.runInTransaction(
          async (sharedContext) => {
            await assignmentService.lockCatalogEntityAssignments(
              "category",
              concurrentEntityId,
              sharedContext
            )
            signalAdminLocked?.()
            await adminCanCommit
            const [current] =
              await assignmentService.listStorefrontUrlAssignments(
                { id: initial.id },
                { take: 1 },
                sharedContext
              )
            const updated =
              await assignmentService.updateStorefrontUrlAssignments(
                {
                  id: current.id,
                  public_slug: "categorie-admin",
                  source_version: current.source_version + 1,
                },
                sharedContext
              )
            await enqueueCatalogAssignmentLifecycle(
              outboxService,
              updated,
              sharedContext
            )
          }
        )
        await adminLocked
        const deletion = unpublishCatalogEntityAssignments({
          assignmentService,
          entityId: concurrentEntityId,
          entityKind: "category",
          outboxService,
        })
        releaseAdmin?.()
        await Promise.all([adminUpdate, deletion])

        await expect(
          assignmentService.listStorefrontUrlAssignments({ id: initial.id })
        ).resolves.toEqual([
          expect.objectContaining({
            publication_status: "draft",
            public_slug: "categorie-admin",
            source_version: 3,
          }),
        ])
        await expect(
          outboxService.listUrlRegistryOutboxEvents({
            entity_id: concurrentEntityId,
          })
        ).resolves.toHaveLength(3)
        await expect(
          outboxService.listUrlRegistryOutboxStreams({
            entity_id: concurrentEntityId,
          })
        ).resolves.toEqual([
          expect.objectContaining({ last_sequence: 3, market_code: "ro" }),
        ])
      })
    })
  },
})
