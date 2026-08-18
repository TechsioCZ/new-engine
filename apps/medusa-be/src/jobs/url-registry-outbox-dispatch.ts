import { randomUUID } from "node:crypto"
import type { MedusaContainer } from "@medusajs/framework/types"
import { dispatchUrlRegistryOutboxWorkflow } from "../workflows/url-registry-outbox/dispatch-workflow"
import { readUrlRegistryDispatchSchedule } from "../workflows/url-registry-outbox/dispatcher-config"

const WORKER_ID = `medusa-urlr-${process.pid}-${randomUUID()}`

export default async function urlRegistryOutboxDispatchJob(
  container: MedusaContainer
) {
  await dispatchUrlRegistryOutboxWorkflow(container).run({
    input: { workerId: WORKER_ID },
  })
}

export const config = {
  name: "url-registry-outbox-dispatch",
  schedule: readUrlRegistryDispatchSchedule(),
}
