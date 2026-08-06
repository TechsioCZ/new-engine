import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

import { UpsertPriceListsBatchSchema } from "../api/api/symmy/v1/price-lists/batch-upsert/validators"
import { runImportJob } from "../lib/import-job-runner"
import { SYMMY_PRICE_LISTS_UPSERT_REQUESTED_EVENT } from "../workflows/price-lists-batch/async"
import type { SymmyPriceListsUpsertRequestedEvent } from "../workflows/price-lists-batch/async"
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
    decodeInput: (value): value is UpsertPriceListsBatchInput => {
      UpsertPriceListsBatchSchema.parse(value)
      return true
    },
    getCompletionStats: (output) => ({
      failed: output.failed,
      processed: output.processed,
    }),
    jobId: data.job_id,
    jobLabel: "Price lists upsert",
    lockKey: `symmy-price-lists-upsert:${data.job_id}`,
    run: async (input) => {
      const { result } = await upsertPriceListsBatchWorkflow(container).run({
        input,
      })
      return result
    },
  })
}

export const config: SubscriberConfig = {
  event: SYMMY_PRICE_LISTS_UPSERT_REQUESTED_EVENT,
}
