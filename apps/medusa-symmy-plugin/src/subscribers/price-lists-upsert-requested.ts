import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { runImportJob } from "../lib/import-job-runner"
import {
  SYMMY_PRICE_LISTS_UPSERT_REQUESTED_EVENT,
  type SymmyPriceListsUpsertRequestedEvent,
} from "../workflows/price-lists-batch/async"
import type {
  UpsertPriceListsBatchInput,
  UpsertPriceListsBatchOutput,
} from "../workflows/price-lists-batch/types"
import { upsertPriceListsBatchWorkflow } from "../workflows/price-lists-batch/workflow"

export default async function priceListsUpsertRequestedHandler({
  event: { data },
  container,
}: SubscriberArgs<SymmyPriceListsUpsertRequestedEvent>) {
  await runImportJob<UpsertPriceListsBatchInput, UpsertPriceListsBatchOutput>({
    container,
    jobId: data.job_id,
    jobLabel: "Price lists upsert",
    lockKey: `symmy-price-lists-upsert:${data.job_id}`,
    run: async (input) => {
      const { result } = await upsertPriceListsBatchWorkflow(container).run({
        input,
      })
      return result as UpsertPriceListsBatchOutput
    },
    getCompletionStats: (output) => ({
      processed: output.processed,
      failed: output.failed,
    }),
  })
}

export const config: SubscriberConfig = {
  event: SYMMY_PRICE_LISTS_UPSERT_REQUESTED_EVENT,
}
