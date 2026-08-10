import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { IEventBusModuleService } from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"

import { SYMMY_IMPORT_JOB_MODULE } from "../modules/import-job"
import type { SymmyImportJobModuleService } from "../modules/import-job"
import { JsonMetadataSchema } from "./json-metadata"

interface EnqueueImportJobInput<TPayload extends object> {
  type: string
  payload: TPayload
  total: number
  requestedEvent: string
}

export const getIdempotencyKey = (req: MedusaRequest) => {
  const header = req.headers["idempotency-key"]
  if (Array.isArray(header)) {
    return header[0] ?? null
  }
  return header ?? null
}

export const enqueueImportJob = async <TPayload extends object>(
  req: MedusaRequest,
  res: MedusaResponse,
  { payload, requestedEvent, total, type }: EnqueueImportJobInput<TPayload>,
) => {
  const importJobService = req.scope.resolve<SymmyImportJobModuleService>(
    SYMMY_IMPORT_JOB_MODULE,
  )
  const eventBus = req.scope.resolve<IEventBusModuleService>(Modules.EVENT_BUS)

  const persistedPayload = JsonMetadataSchema.safeParse(payload)
  if (!persistedPayload.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Import job payload must be a JSON object",
    )
  }

  const job = await importJobService.createQueuedJob({
    idempotencyKey: getIdempotencyKey(req),
    payload: persistedPayload.data,
    total,
    type,
  })

  if (job.status === "queued") {
    await eventBus.emit({
      data: { job_id: job.id },
      name: requestedEvent,
    })
  }

  res.status(202).json({
    job_id: job.id,
    status: job.status,
    status_url: `/api/symmy/v1/jobs/${job.id}`,
  })
}
