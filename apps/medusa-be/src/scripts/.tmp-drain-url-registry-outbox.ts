import { randomUUID } from "node:crypto"
import type { ExecArgs } from "@medusajs/framework/types"
import { dispatchUrlRegistryOutboxWorkflow } from "../workflows/url-registry-outbox/dispatch-workflow"

const MAX_BATCHES = 1000

export default async function drain({ container }: ExecArgs) {
  console.log(
    `URL Registry lifecycle origin: ${process.env.URL_REGISTRY_HERBATIKA_INTERNAL_ORIGIN}`
  )
  const workerId = `manual-urlr-${process.pid}-${randomUUID()}`
  const totals = {
    acknowledged: 0,
    claimed: 0,
    failed: 0,
    retried: 0,
    transitionErrors: 0,
  }

  for (let batch = 1; batch <= MAX_BATCHES; batch += 1) {
    const { result } = await dispatchUrlRegistryOutboxWorkflow(container).run({
      input: { workerId },
    })
    totals.acknowledged += result.acknowledged
    totals.claimed += result.claimed
    totals.failed += result.failed
    totals.retried += result.retried
    totals.transitionErrors += result.transitionErrors

    if (batch % 20 === 0 || result.claimed === 0 || result.failed > 0) {
      console.log(JSON.stringify({ batch, result, totals }))
    }
    if (result.status !== "completed") {
      throw new Error("URL Registry dispatcher is disabled")
    }
    if (result.failed > 0 || result.transitionErrors > 0) {
      throw new Error("URL Registry dispatch failed")
    }
    if (result.claimed === 0) {
      console.log(`URL Registry outbox drained: ${JSON.stringify(totals)}`)
      return
    }
  }

  throw new Error(`URL Registry outbox exceeded ${MAX_BATCHES} batches`)
}
