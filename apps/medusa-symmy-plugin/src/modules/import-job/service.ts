import { MedusaService } from "@medusajs/framework/utils"
import SymmyImportJob from "./models/symmy-import-job"

export type SymmyImportJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"

export type SymmyImportJobDTO = {
  id: string
  type: string
  status: SymmyImportJobStatus
  payload: Record<string, unknown>
  result: Record<string, unknown> | null
  error: string | null
  total: number
  processed: number
  failed: number
  attempts: number
  idempotency_key: string | null
  started_at: Date | string | null
  finished_at: Date | string | null
  created_at?: Date | string
  updated_at?: Date | string
}

type CreateImportJobInput = {
  type: string
  payload: Record<string, unknown>
  total: number
  idempotencyKey?: string | null
}

type CompleteImportJobInput = {
  result: Record<string, unknown>
  processed: number
  failed: number
}

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

export class SymmyImportJobModuleService extends MedusaService({
  SymmyImportJob,
}) {
  private async findByIdempotencyKey(
    type: string,
    idempotencyKey: string | null | undefined
  ): Promise<SymmyImportJobDTO | null> {
    if (!idempotencyKey) {
      return null
    }

    const existing = await this.listSymmyImportJobs(
      {
        type,
        idempotency_key: idempotencyKey,
      },
      { take: 1 }
    )

    return (existing[0] as unknown as SymmyImportJobDTO | undefined) ?? null
  }

  async createQueuedJob({
    type,
    payload,
    total,
    idempotencyKey,
  }: CreateImportJobInput): Promise<SymmyImportJobDTO> {
    const existing = await this.findByIdempotencyKey(type, idempotencyKey)
    if (existing) {
      return existing
    }

    try {
      const created = await this.createSymmyImportJobs({
        type,
        status: "queued",
        payload,
        result: null,
        error: null,
        total,
        processed: 0,
        failed: 0,
        attempts: 0,
        idempotency_key: idempotencyKey ?? null,
        started_at: null,
        finished_at: null,
      })

      return created as unknown as SymmyImportJobDTO
    } catch (error) {
      const racedJob = await this.findByIdempotencyKey(type, idempotencyKey)
      if (racedJob && toErrorMessage(error).includes("unique")) {
        return racedJob
      }
      throw error
    }
  }

  async retrieveJob(id: string): Promise<SymmyImportJobDTO> {
    const job = await this.retrieveSymmyImportJob(id)
    return job as unknown as SymmyImportJobDTO
  }

  async markRunning(id: string): Promise<SymmyImportJobDTO> {
    const job = await this.retrieveJob(id)
    const updated = await this.updateSymmyImportJobs({
      id,
      status: "running",
      attempts: (job.attempts ?? 0) + 1,
      started_at: new Date(),
      finished_at: null,
      error: null,
    })

    return updated as unknown as SymmyImportJobDTO
  }

  async markCompleted(
    id: string,
    { result, processed, failed }: CompleteImportJobInput
  ): Promise<SymmyImportJobDTO> {
    const updated = await this.updateSymmyImportJobs({
      id,
      status: "completed",
      result,
      error: null,
      processed,
      failed,
      finished_at: new Date(),
    })

    return updated as unknown as SymmyImportJobDTO
  }

  async markFailed(
    id: string,
    error: string,
    result?: Record<string, unknown>
  ): Promise<SymmyImportJobDTO> {
    const updated = await this.updateSymmyImportJobs({
      id,
      status: "failed",
      result: result ?? null,
      error,
      finished_at: new Date(),
    })

    return updated as unknown as SymmyImportJobDTO
  }
}
