import { createHash } from "node:crypto"
import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type { Context } from "@medusajs/framework/types"
import type UrlRegistryOutboxModuleService from "../url-registry-outbox/service"
import type { UrlRegistryOutboxMarket } from "../url-registry-outbox/types"
import type { StorefrontUrlAssignmentEntityKind } from "./contracts"
import type { StorefrontUrlAssignmentRecord } from "./models/storefront-url-assignment"
import type StorefrontUrlAssignmentModuleService from "./service"

const catalogLifecycleEventId = (assignment: StorefrontUrlAssignmentRecord) =>
  `sha256:${createHash("sha256")
    .update(
      JSON.stringify([
        "catalog-assignment",
        assignment.entity_kind,
        assignment.entity_id,
        assignment.market_code,
        assignment.source_version,
      ])
    )
    .digest("hex")}`

const assignmentOccurrenceTime = (
  assignment: StorefrontUrlAssignmentRecord
): string => {
  const candidate = assignment.updated_at
  let parsed = new Date(0)
  if (candidate instanceof Date) {
    parsed = candidate
  } else if (typeof candidate === "string") {
    parsed = new Date(candidate)
  }
  return Number.isNaN(parsed.getTime())
    ? new Date(0).toISOString()
    : parsed.toISOString()
}

export const enqueueCatalogAssignmentLifecycle = async (
  outboxService: UrlRegistryOutboxModuleService,
  assignment: StorefrontUrlAssignmentRecord,
  sharedContext: Context<SqlEntityManager>
) => {
  await outboxService.enqueueCatalogLifecycleEvent(
    {
      affectedMarketCodes: [assignment.market_code],
      entityId: assignment.entity_id,
      entityKind: assignment.entity_kind,
      eventId: catalogLifecycleEventId(assignment),
      marketAssignments: [
        {
          assignment: {
            publicationStatus: assignment.publication_status,
            publicSlug: assignment.public_slug,
            salesChannelId: assignment.sales_channel_id,
          },
          marketCode: assignment.market_code,
          sourceVersion: String(assignment.source_version),
        },
      ],
      occurredAt: assignmentOccurrenceTime(assignment),
      reason: "assignment-upsert",
    },
    sharedContext
  )
}

export const unpublishCatalogEntityAssignments = async (input: {
  assignmentService: StorefrontUrlAssignmentModuleService
  entityId: string
  entityKind: StorefrontUrlAssignmentEntityKind
  marketCode?: UrlRegistryOutboxMarket
  outboxService: UrlRegistryOutboxModuleService
}) =>
  await input.assignmentService.runInTransaction(async (sharedContext) => {
    await input.assignmentService.lockCatalogEntityAssignments(
      input.entityKind,
      input.entityId,
      sharedContext
    )
    const assignments =
      await input.assignmentService.listStorefrontUrlAssignments(
        {
          entity_id: input.entityId,
          entity_kind: input.entityKind,
          ...(input.marketCode ? { market_code: input.marketCode } : {}),
        },
        { take: 10 },
        sharedContext
      )
    const published = assignments
      .filter((assignment) => assignment.publication_status === "published")
      .sort((left, right) =>
        `${left.market_code}\0${left.id}`.localeCompare(
          `${right.market_code}\0${right.id}`
        )
      )
    const unpublished: StorefrontUrlAssignmentRecord[] = []
    for (const assignment of published) {
      const sourceVersion = Number(assignment.source_version)
      if (!Number.isSafeInteger(sourceVersion) || sourceVersion < 1) {
        throw new Error("Catalog assignment source version is invalid")
      }
      const persisted =
        await input.assignmentService.updateStorefrontUrlAssignments(
          {
            id: assignment.id,
            publication_status: "draft",
            source_version: sourceVersion + 1,
          },
          sharedContext
        )
      await enqueueCatalogAssignmentLifecycle(
        input.outboxService,
        persisted,
        sharedContext
      )
      unpublished.push(persisted)
    }
    return unpublished
  })
