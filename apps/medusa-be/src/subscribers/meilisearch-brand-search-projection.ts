import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  BRAND_SEARCH_PROJECTION_CHANGED,
  type BrandSearchProjectionChangedEventData,
} from "../workflows/meilisearch/events"
import { reconcileBrandSearchProjectionWorkflow } from "../workflows/meilisearch/workflows/reconcile-brand-search-projection"

export default async function meilisearchBrandSearchProjectionHandler({
  container,
  event,
}: SubscriberArgs<BrandSearchProjectionChangedEventData>) {
  await reconcileBrandSearchProjectionWorkflow(container).run({
    input: event.data,
  })
}

export const config: SubscriberConfig = {
  event: BRAND_SEARCH_PROJECTION_CHANGED,
}
