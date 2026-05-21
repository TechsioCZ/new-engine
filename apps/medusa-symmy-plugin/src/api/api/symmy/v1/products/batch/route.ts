import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { enqueueImportJob } from "../../../../../../lib/queued-job-handler"
import {
  SYMMY_PRODUCTS_UPSERT_JOB_TYPE,
  SYMMY_PRODUCTS_UPSERT_REQUESTED_EVENT,
} from "../../../../../../workflows/upsert-products-batch/async"
import type { UpsertProductsBatchSchemaType } from "./validators"

export const POST = async (
  req: MedusaRequest<UpsertProductsBatchSchemaType>,
  res: MedusaResponse
) => {
  await enqueueImportJob(req, res, {
    type: SYMMY_PRODUCTS_UPSERT_JOB_TYPE,
    payload: { products: req.validatedBody.products },
    total: req.validatedBody.products.length,
    requestedEvent: SYMMY_PRODUCTS_UPSERT_REQUESTED_EVENT,
  })
}
