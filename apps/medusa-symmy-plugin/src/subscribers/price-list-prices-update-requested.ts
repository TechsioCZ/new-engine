import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { z } from "@medusajs/framework/zod"

import { UpdatePriceListPricesBatchSchema } from "../api/api/symmy/v1/price-lists/[code]/prices/batch/validators"
import { runImportJob } from "../lib/import-job-runner"
import { SYMMY_PRICE_LIST_PRICES_UPDATE_REQUESTED_EVENT } from "../workflows/price-lists-batch/async"
import type { SymmyPriceListPricesUpdateRequestedEvent } from "../workflows/price-lists-batch/async"
import type {
  UpdatePriceListPricesBatchInput,
  UpdatePriceListPricesBatchOutput,
} from "../workflows/price-lists-batch/types"
import { updatePriceListPricesBatchWorkflow } from "../workflows/price-lists-batch/workflow"

const UpdatePriceListPricesImportJobSchema = z.object({
  ...UpdatePriceListPricesBatchSchema.shape,
  code: z.string().min(1),
})

export default async function priceListPricesUpdateRequestedHandler({
  event: { data },
  container,
}: SubscriberArgs<SymmyPriceListPricesUpdateRequestedEvent>) {
  await runImportJob<
    UpdatePriceListPricesBatchInput,
    UpdatePriceListPricesBatchOutput
  >({
    container,
    decodeInput: (value): value is UpdatePriceListPricesBatchInput => {
      UpdatePriceListPricesImportJobSchema.parse(value)
      return true
    },
    getCompletionStats: (output) => ({
      failed: output.prices_failed,
      processed: output.results.length,
    }),
    jobId: data.job_id,
    jobLabel: "Price list prices update",
    lockKey: `symmy-price-list-prices-update:${data.job_id}`,
    run: async (input) => {
      const { result } = await updatePriceListPricesBatchWorkflow(
        container,
      ).run({
        input,
      })
      return result
    },
  })
}

export const config: SubscriberConfig = {
  event: SYMMY_PRICE_LIST_PRICES_UPDATE_REQUESTED_EVENT,
}
