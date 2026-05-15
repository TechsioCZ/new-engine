import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { IEventBusModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import {
  SYMMY_PRODUCTS_UPSERT_JOB_TYPE,
  SYMMY_PRODUCTS_UPSERT_REQUESTED_EVENT,
} from "../../../../../../workflows/upsert-products-batch/async"
import {
  SYMMY_IMPORT_JOB_MODULE,
  type SymmyImportJobModuleService,
} from "../../../../../../modules/import-job"
import type { UpsertProductsBatchSchemaType } from "./validators"

const getIdempotencyKey = (req: MedusaRequest) => {
  const header = req.headers["idempotency-key"]
  if (Array.isArray(header)) {
    return header[0] ?? null
  }
  return header ?? null
}

export const POST = async (
  req: MedusaRequest<UpsertProductsBatchSchemaType>,
  res: MedusaResponse
) => {
  const importJobService =
    req.scope.resolve<SymmyImportJobModuleService>(SYMMY_IMPORT_JOB_MODULE)
  const eventBus = req.scope.resolve<IEventBusModuleService>(Modules.EVENT_BUS)

  const job = await importJobService.createQueuedJob({
    type: SYMMY_PRODUCTS_UPSERT_JOB_TYPE,
    payload: { products: req.validatedBody.products },
    total: req.validatedBody.products.length,
    idempotencyKey: getIdempotencyKey(req),
  })

  if (job.status === "queued") {
    await eventBus.emit({
      name: SYMMY_PRODUCTS_UPSERT_REQUESTED_EVENT,
      data: { job_id: job.id },
    })
  }

  res.status(202).json({
    job_id: job.id,
    status: job.status,
    status_url: `/api/symmy/v1/jobs/${job.id}`,
  })
}
