import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { z } from "@medusajs/framework/zod"

import { AssignCustomersToGroupBatchSchema } from "../api/api/symmy/v1/customer-groups/[code]/customers/batch/validators"
import { runImportJob } from "../lib/import-job-runner"
import { SYMMY_CUSTOMER_GROUP_CUSTOMERS_ASSIGN_REQUESTED_EVENT } from "../workflows/customer-group-customers-batch/async"
import type { SymmyCustomerGroupCustomersAssignRequestedEvent } from "../workflows/customer-group-customers-batch/async"
import type {
  AssignCustomersToGroupBatchInput,
  AssignCustomersToGroupBatchOutput,
} from "../workflows/customer-group-customers-batch/types"
import { assignCustomersToGroupBatchWorkflow } from "../workflows/customer-group-customers-batch/workflow"

const AssignCustomersToGroupImportJobSchema = z.object({
  ...AssignCustomersToGroupBatchSchema.shape,
  code: z.string().min(1),
})

export default async function customerGroupCustomersAssignRequestedHandler({
  event: { data },
  container,
}: SubscriberArgs<SymmyCustomerGroupCustomersAssignRequestedEvent>) {
  await runImportJob<
    AssignCustomersToGroupBatchInput,
    AssignCustomersToGroupBatchOutput
  >({
    container,
    decodeInput: (value): value is AssignCustomersToGroupBatchInput => {
      AssignCustomersToGroupImportJobSchema.parse(value)
      return true
    },
    getCompletionStats: (output) => ({
      failed: output.failed,
      processed: output.assigned,
    }),
    jobId: data.job_id,
    jobLabel: "Customer group customers assign",
    lockKey: `symmy-customer-group-customers-assign:${data.job_id}`,
    run: async (input) => {
      const { result } = await assignCustomersToGroupBatchWorkflow(
        container,
      ).run({
        input,
      })
      return result
    },
  })
}

export const config: SubscriberConfig = {
  event: SYMMY_CUSTOMER_GROUP_CUSTOMERS_ASSIGN_REQUESTED_EVENT,
}
