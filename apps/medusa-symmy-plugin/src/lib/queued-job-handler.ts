import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { IEventBusModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import {
  SYMMY_IMPORT_JOB_MODULE,
  type SymmyImportJobModuleService,
} from "../modules/import-job"

type EnqueueImportJobInput = {
  type: string
  payload: Record<string, unknown>
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

export const enqueueImportJob = async (
  req: MedusaRequest,
  res: MedusaResponse,
  { payload, requestedEvent, total, type }: EnqueueImportJobInput
) => {
  const importJobService = req.scope.resolve<SymmyImportJobModuleService>(
    SYMMY_IMPORT_JOB_MODULE
  )
  const eventBus = req.scope.resolve<IEventBusModuleService>(Modules.EVENT_BUS)

  const job = await importJobService.createQueuedJob({
    type,
    payload,
    total,
    idempotencyKey: getIdempotencyKey(req),
  })

  if (job.status === "queued") {
    await eventBus.emit({
      name: requestedEvent,
      data: { job_id: job.id },
    })
  }

  res.status(202).json({
    job_id: job.id,
    status: job.status,
    status_url: `/api/symmy/v1/jobs/${job.id}`,
  })
}
