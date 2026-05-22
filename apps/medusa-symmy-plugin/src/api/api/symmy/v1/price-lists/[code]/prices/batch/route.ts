import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { enqueueImportJob } from "../../../../../../../../lib/queued-job-handler"
import {
  SYMMY_PRICE_LIST_PRICES_UPDATE_JOB_TYPE,
  SYMMY_PRICE_LIST_PRICES_UPDATE_REQUESTED_EVENT,
} from "../../../../../../../../workflows/price-lists-batch/async"
import type { UpdatePriceListPricesBatchSchemaType } from "./validators"

export const POST = async (
  req: MedusaRequest<UpdatePriceListPricesBatchSchemaType>,
  res: MedusaResponse
) => {
  await enqueueImportJob(req, res, {
    type: SYMMY_PRICE_LIST_PRICES_UPDATE_JOB_TYPE,
    payload: {
      code: req.params.code,
      prices: req.validatedBody.prices,
    },
    total: req.validatedBody.prices.length,
    requestedEvent: SYMMY_PRICE_LIST_PRICES_UPDATE_REQUESTED_EVENT,
  })
}
