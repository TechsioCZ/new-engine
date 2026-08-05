import { MedusaService } from "@medusajs/framework/utils"

import SymmyImportJob from "./models/symmy-import-job"

export type SymmyImportJobStatus = "queued" | "running" | "completed" | "failed"

export interface SymmyImportJobDTO {
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

interface CreateImportJobInput {
  type: string
  payload: Record<string, unknown>
  total: number
  idempotencyKey?: string | null
}

interface CompleteImportJobInput {
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
        idempotency_key: idempotencyKey,
        type,
      },
      { take: 1 }
    )

    return (existing[0] as SymmyImportJobDTO | undefined) ?? null
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
        attempts: 0,
        error: null,
        failed: 0,
        finished_at: null,
        idempotency_key: idempotencyKey ?? null,
        payload,
        processed: 0,
        result: null,
        started_at: null,
        status: "queued",
        total,
        type,
      })

      return created as SymmyImportJobDTO
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
    return job as SymmyImportJobDTO
  }

  async markRunning(id: string): Promise<SymmyImportJobDTO> {
    const job = await this.retrieveJob(id)
    const updated = await this.updateSymmyImportJobs({
      attempts: (job.attempts ?? 0) + 1,
      error: null,
      finished_at: null,
      id,
      started_at: new Date(),
      status: "running",
    })

    return updated as SymmyImportJobDTO
  }

  async markCompleted(
    id: string,
    { result, processed, failed }: CompleteImportJobInput
  ): Promise<SymmyImportJobDTO> {
    const updated = await this.updateSymmyImportJobs({
      error: null,
      failed,
      finished_at: new Date(),
      id,
      processed,
      result,
      status: "completed",
    })

    return updated as SymmyImportJobDTO
  }

  async markFailed(
    id: string,
    error: string,
    result?: Record<string, unknown>
  ): Promise<SymmyImportJobDTO> {
    const updated = await this.updateSymmyImportJobs({
      error,
      finished_at: new Date(),
      id,
      result: result ?? null,
      status: "failed",
    })

    return updated as SymmyImportJobDTO
  }
}
