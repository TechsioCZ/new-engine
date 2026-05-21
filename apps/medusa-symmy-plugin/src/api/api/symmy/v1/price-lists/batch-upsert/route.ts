import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { IEventBusModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import {
  SYMMY_IMPORT_JOB_MODULE,
  type SymmyImportJobModuleService,
} from "../../../../../../modules/import-job"
import {
  SYMMY_PRICE_LISTS_UPSERT_JOB_TYPE,
  SYMMY_PRICE_LISTS_UPSERT_REQUESTED_EVENT,
} from "../../../../../../workflows/price-lists-batch/async"
import type { UpsertPriceListsBatchSchemaType } from "./validators"

const getIdempotencyKey = (req: MedusaRequest) => {
  const header = req.headers["idempotency-key"]
  if (Array.isArray(header)) {
    return header[0] ?? null
  }
  return header ?? null
}

export const POST = async (
  req: MedusaRequest<UpsertPriceListsBatchSchemaType>,
  res: MedusaResponse
) => {
  const importJobService = req.scope.resolve<SymmyImportJobModuleService>(
    SYMMY_IMPORT_JOB_MODULE
  )
  const eventBus = req.scope.resolve<IEventBusModuleService>(Modules.EVENT_BUS)

  const job = await importJobService.createQueuedJob({
    type: SYMMY_PRICE_LISTS_UPSERT_JOB_TYPE,
    payload: { price_lists: req.validatedBody.price_lists },
    total: req.validatedBody.price_lists.length,
    idempotencyKey: getIdempotencyKey(req),
  })

  if (job.status === "queued") {
    await eventBus.emit({
      name: SYMMY_PRICE_LISTS_UPSERT_REQUESTED_EVENT,
      data: { job_id: job.id },
    })
  }

  res.status(202).json({
    job_id: job.id,
    status: job.status,
    status_url: `/api/symmy/v1/jobs/${job.id}`,
  })
}
