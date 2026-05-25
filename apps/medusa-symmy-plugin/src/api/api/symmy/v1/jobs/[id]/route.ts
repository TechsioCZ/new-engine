import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  SYMMY_IMPORT_JOB_MODULE,
  type SymmyImportJobDTO,
  type SymmyImportJobModuleService,
} from "../../../../../../modules/import-job"

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

/**
 * @api [get] /api/symmy/v1/jobs/{id}
 * operationId: GetSymmyImportJob
 * summary: Get a Symmy import job
 * tags:
 *   - Symmy
 * description: Requires Medusa user authentication through bearer token, session, or API key.
 * parameters:
 *   - in: path
 *     name: id
 *     required: true
 *     schema:
 *       type: string
 * responses:
 *   "200":
 *     description: The import job.
 *     content:
 *       application/json:
 *         schema:
 *           $ref: "#/components/schemas/SymmyImportJobResponse"
 *   "401":
 *     description: Missing or invalid authentication token.
 *     content:
 *       application/json:
 *         schema:
 *           $ref: "#/components/schemas/SymmyUnauthorizedErrorResponse"
 *   "404":
 *     description: Import job was not found.
 *     content:
 *       application/json:
 *         schema:
 *           $ref: "#/components/schemas/SymmyNotFoundErrorResponse"
 *   "500":
 *     description: Unexpected Symmy API error.
 *     content:
 *       application/json:
 *         schema:
 *           $ref: "#/components/schemas/SymmyInternalErrorResponse"
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const importJobService = req.scope.resolve<SymmyImportJobModuleService>(
    SYMMY_IMPORT_JOB_MODULE
  )

  const job = await importJobService.retrieveJob(req.params.id)
  res.status(200).json({ job: serializeJob(job) })
}
