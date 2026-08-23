import { describe, expect, it, vi } from "vitest"
import type UrlRegistryOutboxModuleService from "../../url-registry-outbox/service"
import { unpublishCatalogEntityAssignments } from "../catalog-lifecycle"
import type StorefrontUrlAssignmentModuleService from "../service"

const assignment = (
  marketCode: "sk" | "ro",
  publicationStatus: "draft" | "published" = "published"
) => ({
  entity_id: "pcat_1",
  entity_kind: "category",
  id: `assignment_${marketCode}`,
  market_code: marketCode,
  publication_status: publicationStatus,
  public_slug: `slug-${marketCode}`,
  sales_channel_id: `sc_${marketCode}`,
  source_version: marketCode === "sk" ? 3 : 7,
  updated_at: new Date("2026-08-20T10:00:00.000Z"),
})

describe("catalog assignment deletion lifecycle", () => {
  it("drafts and enqueues each published market in one shared transaction", async () => {
    const sharedContext = { transactionManager: { id: "tx" } }
    const records = [assignment("sk"), assignment("ro")]
    const updateStorefrontUrlAssignments = vi.fn(async (input) => ({
      ...records.find((record) => record.id === input.id),
      ...input,
      updated_at: new Date("2026-08-20T11:00:00.000Z"),
    }))
    const assignmentService = {
      lockCatalogEntityAssignments: vi.fn(() => Promise.resolve()),
      listStorefrontUrlAssignments: vi.fn(async () => records),
      runInTransaction: vi.fn(async (task) => task(sharedContext)),
      updateStorefrontUrlAssignments,
    } as unknown as StorefrontUrlAssignmentModuleService
    const enqueueCatalogLifecycleEvent = vi.fn(() => Promise.resolve())
    const outboxService = {
      enqueueCatalogLifecycleEvent,
    } as unknown as UrlRegistryOutboxModuleService

    await unpublishCatalogEntityAssignments({
      assignmentService,
      entityId: "pcat_1",
      entityKind: "category",
      outboxService,
    })

    expect(
      updateStorefrontUrlAssignments.mock.calls.map(([input]) => input)
    ).toEqual([
      expect.objectContaining({
        id: "assignment_ro",
        publication_status: "draft",
        source_version: 8,
      }),
      expect.objectContaining({
        id: "assignment_sk",
        publication_status: "draft",
        source_version: 4,
      }),
    ])
    expect(
      updateStorefrontUrlAssignments.mock.calls.every(
        ([, context]) => context === sharedContext
      )
    ).toBe(true)
    expect(enqueueCatalogLifecycleEvent).toHaveBeenCalledTimes(2)
    expect(
      enqueueCatalogLifecycleEvent.mock.calls.map(([input]) => input)
    ).toEqual([
      expect.objectContaining({
        affectedMarketCodes: ["ro"],
        marketAssignments: [
          expect.objectContaining({
            assignment: expect.objectContaining({
              publicationStatus: "draft",
            }),
            marketCode: "ro",
            sourceVersion: "8",
          }),
        ],
      }),
      expect.objectContaining({
        affectedMarketCodes: ["sk"],
        marketAssignments: [
          expect.objectContaining({ marketCode: "sk", sourceVersion: "4" }),
        ],
      }),
    ])
    expect(
      enqueueCatalogLifecycleEvent.mock.calls.every(
        ([, context]) => context === sharedContext
      )
    ).toBe(true)
    expect(assignmentService.lockCatalogEntityAssignments).toHaveBeenCalledWith(
      "category",
      "pcat_1",
      sharedContext
    )
  })

  it("is a no-op when every assignment is already draft", async () => {
    const assignmentService = {
      lockCatalogEntityAssignments: vi.fn(() => Promise.resolve()),
      listStorefrontUrlAssignments: vi.fn(async () => [
        assignment("sk", "draft"),
        assignment("ro", "draft"),
      ]),
      runInTransaction: vi.fn(async (task) =>
        task({ transactionManager: { id: "tx" } })
      ),
      updateStorefrontUrlAssignments: vi.fn(),
    } as unknown as StorefrontUrlAssignmentModuleService
    const outboxService = {
      enqueueCatalogLifecycleEvent: vi.fn(),
    } as unknown as UrlRegistryOutboxModuleService

    await expect(
      unpublishCatalogEntityAssignments({
        assignmentService,
        entityId: "pcat_1",
        entityKind: "category",
        outboxService,
      })
    ).resolves.toEqual([])
    expect(
      assignmentService.updateStorefrontUrlAssignments
    ).not.toHaveBeenCalled()
    expect(outboxService.enqueueCatalogLifecycleEvent).not.toHaveBeenCalled()
  })

  it("unpublishes only the market whose Translation became invalid", async () => {
    const sharedContext = { transactionManager: { id: "tx-ro" } }
    const records = [assignment("ro")]
    const assignmentService = {
      listStorefrontUrlAssignments: vi.fn(async () => records),
      lockCatalogEntityAssignments: vi.fn(() => Promise.resolve()),
      runInTransaction: vi.fn(async (task) => task(sharedContext)),
      updateStorefrontUrlAssignments: vi.fn(async (input) => ({
        ...records[0],
        ...input,
      })),
    } as unknown as StorefrontUrlAssignmentModuleService
    const outboxService = {
      enqueueCatalogLifecycleEvent: vi.fn(() => Promise.resolve()),
    } as unknown as UrlRegistryOutboxModuleService

    await unpublishCatalogEntityAssignments({
      assignmentService,
      entityId: "pcat_1",
      entityKind: "category",
      marketCode: "ro",
      outboxService,
    })

    expect(assignmentService.listStorefrontUrlAssignments).toHaveBeenCalledWith(
      {
        entity_id: "pcat_1",
        entity_kind: "category",
        market_code: "ro",
      },
      { take: 10 },
      sharedContext
    )
    expect(outboxService.enqueueCatalogLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({ affectedMarketCodes: ["ro"] }),
      sharedContext
    )
  })
})
