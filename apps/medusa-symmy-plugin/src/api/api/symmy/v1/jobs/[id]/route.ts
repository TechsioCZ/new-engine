import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  SYMMY_IMPORT_JOB_MODULE,
  type SymmyImportJobDTO,
  type SymmyImportJobModuleService,
} from "../../../../../../modules/import-job"
import { SYMMY_PRODUCTS_UPSERT_JOB_TYPE } from "../../../../../../workflows/upsert-products-batch/async"

const serializeJob = (job: SymmyImportJobDTO) => ({
  id: job.id,
  type: job.type,
  status: job.status,
  total: job.total,
  processed: job.processed,
  failed: job.failed,
  attempts: job.attempts,
  result: job.result,
  error: job.error,
  created_at: job.created_at,
  updated_at: job.updated_at,
  started_at: job.started_at,
  finished_at: job.finished_at,
})

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const importJobService =
    req.scope.resolve<SymmyImportJobModuleService>(SYMMY_IMPORT_JOB_MODULE)

  const job = await importJobService.retrieveJob(req.params.id)
  if (job.type !== SYMMY_PRODUCTS_UPSERT_JOB_TYPE) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Import job not found")
  }

  res.status(200).json({ job: serializeJob(job) })
}
