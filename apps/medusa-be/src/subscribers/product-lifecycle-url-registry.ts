import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { URL_REGISTRY_OUTBOX_MODULE } from "../modules/url-registry-outbox"
import type UrlRegistryOutboxModuleService from "../modules/url-registry-outbox/service"
import {
  normalizeProductLifecycleEventInput,
  UrlRegistryOutboxInputError,
} from "../modules/url-registry-outbox/types"
import {
  type ProductLifecycleOutboxInput,
  URL_REGISTRY_PRODUCT_LIFECYCLE_EVENT,
} from "../workflows/url-registry-outbox/product-lifecycle-event"

export default async function productLifecycleUrlRegistryHandler({
  event,
  container,
}: SubscriberArgs<unknown>) {
  if (event.name !== URL_REGISTRY_PRODUCT_LIFECYCLE_EVENT) {
    throw new UrlRegistryOutboxInputError("event.name is invalid")
  }

  normalizeProductLifecycleEventInput(event.data)
  const outboxService = container.resolve<UrlRegistryOutboxModuleService>(
    URL_REGISTRY_OUTBOX_MODULE
  )

  await outboxService.enqueueProductLifecycleEvent(
    event.data as ProductLifecycleOutboxInput
  )
}

export const config: SubscriberConfig = {
  event: URL_REGISTRY_PRODUCT_LIFECYCLE_EVENT,
}
