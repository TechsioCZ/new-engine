import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { runImportJob } from "../lib/import-job-runner"
import { upsertProductsBatchWorkflow } from "../workflows/upsert-products-batch"
import {
  SYMMY_PRODUCTS_UPSERT_REQUESTED_EVENT,
  type SymmyProductsUpsertRequestedEvent,
} from "../workflows/upsert-products-batch/async"
import type {
  UpsertProductsBatchInput,
  UpsertProductsBatchOutput,
} from "../workflows/upsert-products-batch/types"

export default async function productsUpsertRequestedHandler({
  event: { data },
  container,
}: SubscriberArgs<SymmyProductsUpsertRequestedEvent>) {
  await runImportJob<UpsertProductsBatchInput, UpsertProductsBatchOutput>({
    container,
    jobId: data.job_id,
    jobLabel: "Product upsert",
    lockKey: `symmy-products-upsert:${data.job_id}`,
    run: async (input) => {
      const { result } = await upsertProductsBatchWorkflow(container).run({
        input,
      })
      return result as UpsertProductsBatchOutput
    },
    getCompletionStats: (output) => ({
      processed: output.processed,
      failed: output.failed,
    }),
  })
}

export const config: SubscriberConfig = {
  event: SYMMY_PRODUCTS_UPSERT_REQUESTED_EVENT,
}
