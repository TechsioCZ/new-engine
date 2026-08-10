import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

import { UpsertProductsBatchSchema } from "../api/api/symmy/v1/products/batch/validators"
import { runImportJob } from "../lib/import-job-runner"
import { SYMMY_PRODUCTS_UPSERT_REQUESTED_EVENT } from "../workflows/upsert-products-batch/async"
import type { SymmyProductsUpsertRequestedEvent } from "../workflows/upsert-products-batch/async"
import type {
  UpsertProductsBatchInput,
  UpsertProductsBatchOutput,
} from "../workflows/upsert-products-batch/types"
import { upsertProductsBatchWorkflow } from "../workflows/upsert-products-batch/workflow"

export default async function productsUpsertRequestedHandler({
  event: { data },
  container,
}: SubscriberArgs<SymmyProductsUpsertRequestedEvent>) {
  await runImportJob<UpsertProductsBatchInput, UpsertProductsBatchOutput>({
    container,
    decodeInput: (value): value is UpsertProductsBatchInput => {
      UpsertProductsBatchSchema.parse(value)
      return true
    },
    getCompletionStats: (output) => ({
      failed: output.failed,
      processed: output.processed,
    }),
    jobId: data.job_id,
    jobLabel: "Product upsert",
    lockKey: `symmy-products-upsert:${data.job_id}`,
    run: async (input) => {
      const { result } = await upsertProductsBatchWorkflow(container).run({
        input,
      })
      return result
    },
  })
}

export const config: SubscriberConfig = {
  event: SYMMY_PRODUCTS_UPSERT_REQUESTED_EVENT,
}
