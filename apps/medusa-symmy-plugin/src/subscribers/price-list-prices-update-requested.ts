import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { runImportJob } from "../lib/import-job-runner"
import {
  SYMMY_PRICE_LIST_PRICES_UPDATE_REQUESTED_EVENT,
  type SymmyPriceListPricesUpdateRequestedEvent,
} from "../workflows/price-lists-batch/async"
import type {
  UpdatePriceListPricesBatchInput,
  UpdatePriceListPricesBatchOutput,
} from "../workflows/price-lists-batch/types"
import { updatePriceListPricesBatchWorkflow } from "../workflows/price-lists-batch/workflow"

export default async function priceListPricesUpdateRequestedHandler({
  event: { data },
  container,
}: SubscriberArgs<SymmyPriceListPricesUpdateRequestedEvent>) {
  await runImportJob<
    UpdatePriceListPricesBatchInput,
    UpdatePriceListPricesBatchOutput
  >({
    container,
    jobId: data.job_id,
    jobLabel: "Price list prices update",
    lockKey: `symmy-price-list-prices-update:${data.job_id}`,
    run: async (input) => {
      const { result } = await updatePriceListPricesBatchWorkflow(
        container
      ).run({
        input,
      })
      return result as UpdatePriceListPricesBatchOutput
    },
    getCompletionStats: (output) => ({
      processed: output.results.length,
      failed: output.prices_failed,
    }),
  })
}

export const config: SubscriberConfig = {
  event: SYMMY_PRICE_LIST_PRICES_UPDATE_REQUESTED_EVENT,
}
