import type { ExecArgs, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  generateEntityId,
} from "@medusajs/framework/utils"
import { URL_REGISTRY_OUTBOX_MODULE } from "../modules/url-registry-outbox"
import type UrlRegistryOutboxModuleService from "../modules/url-registry-outbox/service"
import {
  buildProductLifecycleOutboxInputs,
  loadProductPublicationSnapshots,
} from "../workflows/url-registry-outbox/product-lifecycle-event"

const PAGE_SIZE = 50

export default async function reconcile({ container }: ExecArgs) {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const outbox = container.resolve<UrlRegistryOutboxModuleService>(
    URL_REGISTRY_OUTBOX_MODULE
  )
  let emitted = 0

  for (let skip = 0; ; skip += PAGE_SIZE) {
    const { data = [] } = await query.graph<{ id: string }>({
      entity: "product",
      fields: ["id"],
      pagination: { skip, take: PAGE_SIZE },
    })
    if (data.length === 0) {
      break
    }
    const productIds = data.map(({ id }) => id)
    const eventGroupId = generateEntityId(undefined, "")
    const productSnapshots = await loadProductPublicationSnapshots(productIds, {
      container,
    })
    const events = buildProductLifecycleOutboxInputs({
      eventGroupId,
      productIds,
      productSnapshots,
      reason: "updated",
    })
    for (const event of events) {
      await outbox.enqueueProductLifecycleEvent(event)
    }
    emitted += data.length
    console.log(`Emitted URL Registry reconciliation for ${emitted} products`)
    if (data.length < PAGE_SIZE) {
      break
    }
  }

  console.log(`Product URL Registry reconciliation emitted: ${emitted}`)
}
