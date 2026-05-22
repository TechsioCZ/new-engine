import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { enqueueImportJob } from "../../../../../../../../lib/queued-job-handler"
import {
  SYMMY_CUSTOMER_GROUP_CUSTOMERS_ASSIGN_JOB_TYPE,
  SYMMY_CUSTOMER_GROUP_CUSTOMERS_ASSIGN_REQUESTED_EVENT,
} from "../../../../../../../../workflows/customer-group-customers-batch/async"
import type { AssignCustomersToGroupBatchSchemaType } from "./validators"

export const POST = async (
  req: MedusaRequest<AssignCustomersToGroupBatchSchemaType>,
  res: MedusaResponse
) => {
  await enqueueImportJob(req, res, {
    type: SYMMY_CUSTOMER_GROUP_CUSTOMERS_ASSIGN_JOB_TYPE,
    payload: {
      code: req.params.code,
      customer_identifiers: req.validatedBody.customer_identifiers,
    },
    total: req.validatedBody.customer_identifiers.length,
    requestedEvent: SYMMY_CUSTOMER_GROUP_CUSTOMERS_ASSIGN_REQUESTED_EVENT,
  })
}
