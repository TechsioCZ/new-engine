export type MeilisearchTaskErrorCode =
  | "MEILISEARCH_TASK_FAILED"
  | "MEILISEARCH_TASK_RESPONSE_INVALID"
  | "MEILISEARCH_TASK_TIMEOUT"

type MeilisearchErrorOptions =
  | {
      kind: "http"
      message: string
      responseCode?: string
      retryable: boolean
      status: number
    }
  | {
      code: MeilisearchTaskErrorCode
      kind: "task"
      message: string
      status?: string
      taskUid?: number
    }

export class MeilisearchError extends Error {
  readonly code: MeilisearchTaskErrorCode | undefined
  readonly kind: MeilisearchErrorOptions["kind"]
  readonly responseCode: string | undefined
  readonly retryable: boolean
  readonly status: number | undefined
  readonly taskStatus: string | undefined
  readonly taskUid: number | undefined

  constructor(options: MeilisearchErrorOptions) {
    super(options.message)
    this.kind = options.kind
    this.name = "MeilisearchError"
    this.code = options.kind === "task" ? options.code : undefined
    this.responseCode =
      options.kind === "http" ? options.responseCode : undefined
    this.retryable = options.kind === "http" && options.retryable
    this.status = options.kind === "http" ? options.status : undefined
    this.taskStatus = options.kind === "task" ? options.status : undefined
    this.taskUid = options.kind === "task" ? options.taskUid : undefined
  }
}
