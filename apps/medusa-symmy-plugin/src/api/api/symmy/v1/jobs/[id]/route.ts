import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { SYMMY_IMPORT_JOB_MODULE } from "../../../../../../modules/import-job/index"
import type {
  SymmyImportJobDTO,
  SymmyImportJobModuleService,
} from "../../../../../../modules/import-job/index"

const serializeJob = (job: SymmyImportJobDTO) => ({
  attempts: job.attempts,
  created_at: job.created_at,
  error: job.error,
  failed: job.failed,
  finished_at: job.finished_at,
  id: job.id,
  processed: job.processed,
  result: job.result,
  started_at: job.started_at,
  status: job.status,
  total: job.total,
  type: job.type,
  updated_at: job.updated_at,
})

/**
 * @api [get] /api/symmy/v1/jobs/{id}
 * operationId: GetSymmyImportJob
 * summary: Get a Symmy import job
 * tags:
 *   - Symmy
 * description: Requires Medusa user authentication through bearer token, session, or API key.
 * x-authenticated: true
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 *   - jwt_token: []
 * parameters:
 *   - in: path
 *     name: id
 *     description: The Symmy import job's ID.
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

  const jobId = req.params.id
  if (!jobId) {
    res.status(400).json({ error: { message: "Job ID is required" } })
    return
  }

  const job = await importJobService.retrieveJob(jobId)
  res.status(200).json({ job: serializeJob(job) })
}
