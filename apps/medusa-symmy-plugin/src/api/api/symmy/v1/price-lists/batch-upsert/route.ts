import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { enqueueImportJob } from "../../../../../../lib/queued-job-handler"
import {
  SYMMY_PRICE_LISTS_UPSERT_JOB_TYPE,
  SYMMY_PRICE_LISTS_UPSERT_REQUESTED_EVENT,
} from "../../../../../../workflows/price-lists-batch/async"
import type { UpsertPriceListsBatchSchemaType } from "./validators"

export const POST = async (
  req: MedusaRequest<UpsertPriceListsBatchSchemaType>,
  res: MedusaResponse
) => {
  await enqueueImportJob(req, res, {
    type: SYMMY_PRICE_LISTS_UPSERT_JOB_TYPE,
    payload: { price_lists: req.validatedBody.price_lists },
    total: req.validatedBody.price_lists.length,
    requestedEvent: SYMMY_PRICE_LISTS_UPSERT_REQUESTED_EVENT,
  })
}
