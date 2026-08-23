import { randomUUID } from "node:crypto"
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/medusa"
import { dispatchUrlRegistryOutboxWorkflow } from "../workflows/url-registry-outbox/dispatch-workflow"

// Drains pending url-registry outbox events once. Same mechanism as the
// scheduled dispatch job; requires the dispatcher env to be configured
// (URL_REGISTRY_PRODUCT_LIFECYCLE_ENABLED=1, URL_REGISTRY_HERBATIKA_INTERNAL_ORIGIN,
// URL_REGISTRY_PRODUCT_LIFECYCLE_TOKEN).
export default async function drainUrlRegistryOutbox({ container }: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const { result } = await dispatchUrlRegistryOutboxWorkflow(container).run({
    input: { workerId: `manual-drain-${process.pid}-${randomUUID()}` },
  })
  logger.info(`outbox drain result: ${JSON.stringify(result)}`)
  return result
}
