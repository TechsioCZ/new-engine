import { MedusaError, MedusaService } from "@medusajs/framework/utils"

import { JsonMetadataSchema } from "../../lib/json-metadata"
import type { JsonMetadata } from "../../lib/json-metadata"
import SymmyImportJob from "./models/symmy-import-job"

export type SymmyImportJobStatus = "queued" | "running" | "completed" | "failed"

export interface SymmyImportJobDTO {
  id: string
  type: string
  status: SymmyImportJobStatus
  payload: JsonMetadata
  result: JsonMetadata | null
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
  payload: JsonMetadata
  total: number
  idempotencyKey?: string | null
}

interface CompleteImportJobInput {
  result: JsonMetadata
  processed: number
  failed: number
}

const parseJobStatus = (value: string): SymmyImportJobStatus => {
  if (
    value === "queued" ||
    value === "running" ||
    value === "completed" ||
    value === "failed"
  ) {
    return value
  }
  throw new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    `Invalid import job status: ${value}`,
  )
}

const parseJobJsonRecord = (
  value: unknown,
  field: "payload" | "result",
): JsonMetadata => {
  const parsed = JsonMetadataSchema.safeParse(value)
  if (parsed.success) {
    return parsed.data
  }
  throw new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    `Invalid import job ${field}`,
  )
}

const normalizeJob = <
  T extends { payload: unknown; result: unknown; status: string },
>(
  job: T,
) => ({
  ...job,
  payload: parseJobJsonRecord(job.payload, "payload"),
  result: job.result === null ? null : parseJobJsonRecord(job.result, "result"),
  status: parseJobStatus(job.status),
})

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

export class SymmyImportJobModuleService extends MedusaService({
  SymmyImportJob,
}) {
  private async findByIdempotencyKey(
    type: string,
    idempotencyKey: string | null | undefined,
  ): Promise<SymmyImportJobDTO | null> {
    if (
      idempotencyKey === null ||
      idempotencyKey === undefined ||
      idempotencyKey.length === 0
    ) {
      return null
    }

    const existing = await this.listSymmyImportJobs(
      {
        idempotency_key: idempotencyKey,
        type,
      },
      { take: 1 },
    )

    const [job] = existing
    return job === undefined ? null : normalizeJob(job)
  }

  async createQueuedJob({
    type,
    payload,
    total,
    idempotencyKey,
  }: CreateImportJobInput): Promise<SymmyImportJobDTO> {
    const existing = await this.findByIdempotencyKey(type, idempotencyKey)
    if (existing !== null) {
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

      return normalizeJob(created)
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
    return normalizeJob(job)
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

    return normalizeJob(updated)
  }

  async markCompleted(
    id: string,
    { result, processed, failed }: CompleteImportJobInput,
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

    return normalizeJob(updated)
  }

  async markFailed(
    id: string,
    error: string,
    result?: JsonMetadata,
  ): Promise<SymmyImportJobDTO> {
    const updated = await this.updateSymmyImportJobs({
      error,
      finished_at: new Date(),
      id,
      result: result ?? null,
      status: "failed",
    })

    return normalizeJob(updated)
  }
}
