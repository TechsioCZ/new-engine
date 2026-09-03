import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { BRAND_MODULE } from "../modules/brand"
import type BrandModuleService from "../modules/brand/service"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../modules/storefront-url-assignment"
import { unpublishCatalogEntityAssignments } from "../modules/storefront-url-assignment/catalog-lifecycle"
import type StorefrontUrlAssignmentModuleService from "../modules/storefront-url-assignment/service"
import { URL_REGISTRY_OUTBOX_MODULE } from "../modules/url-registry-outbox"
import type UrlRegistryOutboxModuleService from "../modules/url-registry-outbox/service"
import {
  BRAND_SEARCH_PROJECTION_CHANGED,
  type BrandSearchProjectionChangedEventData,
} from "../workflows/meilisearch/events"

export default async function brandDeletedUrlRegistryHandler({
  container,
  event,
}: SubscriberArgs<BrandSearchProjectionChangedEventData>) {
  if (
    event.name !== BRAND_SEARCH_PROJECTION_CHANGED ||
    !Array.isArray(event.data?.brand_ids) ||
    event.data.brand_ids.some(
      (brandId) => typeof brandId !== "string" || brandId.length === 0
    )
  ) {
    return
  }
  const requestedIds = [...new Set(event.data.brand_ids)].sort()
  const brandService = container.resolve<BrandModuleService>(BRAND_MODULE)
  const brands = await brandService.listBrands(
    { id: { $in: requestedIds } },
    { take: Math.max(requestedIds.length, 1), withDeleted: true }
  )
  const brandsById = new Map(brands.map((brand) => [brand.id, brand]))
  const deletedIds = requestedIds.filter(
    (brandId) => !brandsById.get(brandId) || brandsById.get(brandId)?.deleted_at
  )
  if (deletedIds.length === 0) {
    return
  }
  const assignmentService =
    container.resolve<StorefrontUrlAssignmentModuleService>(
      STOREFRONT_URL_ASSIGNMENT_MODULE
    )
  const outboxService = container.resolve<UrlRegistryOutboxModuleService>(
    URL_REGISTRY_OUTBOX_MODULE
  )
  for (const entityId of deletedIds) {
    await unpublishCatalogEntityAssignments({
      assignmentService,
      entityId,
      entityKind: "brand",
      outboxService,
    })
  }
}

export const config: SubscriberConfig = {
  event: BRAND_SEARCH_PROJECTION_CHANGED,
}
