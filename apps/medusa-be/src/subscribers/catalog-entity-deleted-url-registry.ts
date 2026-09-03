import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  ProductCategoryWorkflowEvents,
  ProductCollectionWorkflowEvents,
} from "@medusajs/framework/utils"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../modules/storefront-url-assignment"
import { unpublishCatalogEntityAssignments } from "../modules/storefront-url-assignment/catalog-lifecycle"
import type StorefrontUrlAssignmentModuleService from "../modules/storefront-url-assignment/service"
import { URL_REGISTRY_OUTBOX_MODULE } from "../modules/url-registry-outbox"
import type UrlRegistryOutboxModuleService from "../modules/url-registry-outbox/service"
import { UrlRegistryOutboxInputError } from "../modules/url-registry-outbox/types"

type DeletedCatalogEntityEvent = Readonly<{ id: string }>
const ENTITY_KIND_BY_EVENT = {
  [ProductCategoryWorkflowEvents.DELETED]: "category",
  [ProductCollectionWorkflowEvents.DELETED]: "collection",
} as const

export default async function catalogEntityDeletedUrlRegistryHandler({
  container,
  event,
}: SubscriberArgs<DeletedCatalogEntityEvent>) {
  const entityKind =
    ENTITY_KIND_BY_EVENT[event.name as keyof typeof ENTITY_KIND_BY_EVENT]
  if (!(entityKind && typeof event.data?.id === "string" && event.data.id)) {
    throw new UrlRegistryOutboxInputError(
      "catalog delete lifecycle event is invalid"
    )
  }
  await unpublishCatalogEntityAssignments({
    assignmentService: container.resolve<StorefrontUrlAssignmentModuleService>(
      STOREFRONT_URL_ASSIGNMENT_MODULE
    ),
    entityId: event.data.id,
    entityKind,
    outboxService: container.resolve<UrlRegistryOutboxModuleService>(
      URL_REGISTRY_OUTBOX_MODULE
    ),
  })
}

export const config: SubscriberConfig = {
  event: [
    ProductCategoryWorkflowEvents.DELETED,
    ProductCollectionWorkflowEvents.DELETED,
  ],
}
