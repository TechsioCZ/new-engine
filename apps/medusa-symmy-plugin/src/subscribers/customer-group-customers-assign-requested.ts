import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { runImportJob } from "../lib/import-job-runner"
import {
  SYMMY_CUSTOMER_GROUP_CUSTOMERS_ASSIGN_REQUESTED_EVENT,
  type SymmyCustomerGroupCustomersAssignRequestedEvent,
} from "../workflows/customer-group-customers-batch/async"
import type {
  AssignCustomersToGroupBatchInput,
  AssignCustomersToGroupBatchOutput,
} from "../workflows/customer-group-customers-batch/types"
import { assignCustomersToGroupBatchWorkflow } from "../workflows/customer-group-customers-batch/workflow"

export default async function customerGroupCustomersAssignRequestedHandler({
  event: { data },
  container,
}: SubscriberArgs<SymmyCustomerGroupCustomersAssignRequestedEvent>) {
  await runImportJob<
    AssignCustomersToGroupBatchInput,
    AssignCustomersToGroupBatchOutput
  >({
    container,
    jobId: data.job_id,
    jobLabel: "Customer group customers assign",
    lockKey: `symmy-customer-group-customers-assign:${data.job_id}`,
    run: async (input) => {
      const { result } = await assignCustomersToGroupBatchWorkflow(
        container
      ).run({
        input,
      })
      return result as AssignCustomersToGroupBatchOutput
    },
    getCompletionStats: (output) => ({
      processed: output.assigned,
      failed: output.failed,
    }),
  })
}

export const config: SubscriberConfig = {
  event: SYMMY_CUSTOMER_GROUP_CUSTOMERS_ASSIGN_REQUESTED_EVENT,
}
