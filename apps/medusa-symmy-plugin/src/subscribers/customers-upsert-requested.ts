import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { runImportJob } from "../lib/import-job-runner"
import {
  SYMMY_CUSTOMERS_UPSERT_REQUESTED_EVENT,
  type SymmyCustomersUpsertRequestedEvent,
} from "../workflows/upsert-customers-batch/async"
import type {
  UpsertCustomersBatchInput,
  UpsertCustomersBatchOutput,
} from "../workflows/upsert-customers-batch/types"
import { upsertCustomersBatchWorkflow } from "../workflows/upsert-customers-batch/workflow"

export default async function customersUpsertRequestedHandler({
  event: { data },
  container,
}: SubscriberArgs<SymmyCustomersUpsertRequestedEvent>) {
  await runImportJob<UpsertCustomersBatchInput, UpsertCustomersBatchOutput>({
    container,
    jobId: data.job_id,
    jobLabel: "Customer upsert",
    lockKey: `symmy-customers-upsert:${data.job_id}`,
    run: async (input) => {
      const { result } = await upsertCustomersBatchWorkflow(container).run({
        input,
      })
      return result as UpsertCustomersBatchOutput
    },
    getCompletionStats: (output) => ({
      processed: output.processed,
      failed: output.failed,
    }),
  })
}

export const config: SubscriberConfig = {
  event: SYMMY_CUSTOMERS_UPSERT_REQUESTED_EVENT,
}
