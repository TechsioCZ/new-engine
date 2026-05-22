import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { enqueueImportJob } from "../../../../../../lib/queued-job-handler"
import {
  SYMMY_CUSTOMERS_UPSERT_JOB_TYPE,
  SYMMY_CUSTOMERS_UPSERT_REQUESTED_EVENT,
} from "../../../../../../workflows/upsert-customers-batch/async"
import type { UpsertCustomersBatchSchemaType } from "./validators"

export const POST = async (
  req: MedusaRequest<UpsertCustomersBatchSchemaType>,
  res: MedusaResponse
) => {
  await enqueueImportJob(req, res, {
    type: SYMMY_CUSTOMERS_UPSERT_JOB_TYPE,
    payload: { customers: req.validatedBody.customers },
    total: req.validatedBody.customers.length,
    requestedEvent: SYMMY_CUSTOMERS_UPSERT_REQUESTED_EVENT,
  })
}
