import { setTimeout as delay } from "node:timers/promises"

import { MedusaError } from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

import { MeilisearchError } from "./http-error"

interface MeilisearchTask {
  errorMessage: string | null
  status: string | null
  uid: number | null
}

interface MeilisearchHealthResponse {
  status: string | undefined
}

interface MeilisearchResponse {
  body: unknown
  status: number
}

interface MeilisearchRequestOptions {
  acceptedStatuses?: number[]
  attempts?: number
  body?: unknown
  method: string
  path: string
}

const DEFAULT_TASK_TIMEOUT_MILLISECONDS = 60_000
const TASK_POLL_INTERVAL_MILLISECONDS = 75
const REQUEST_TIMEOUT_MILLISECONDS = 10_000
const REQUEST_ATTEMPTS = 3
const TRAILING_SLASH_REGEX = /\/$/u
const VALID_TASK_STATUSES = new Set([
  "enqueued",
  "processing",
  "succeeded",
  "failed",
  "canceled",
])

const readOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined

const readOptionalNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined

const readNullableString = (value: unknown): string | null =>
  readOptionalString(value) ?? null

const readNullableNumber = (value: unknown): number | null =>
  readOptionalNumber(value) ?? null

const readTask = (value: unknown): MeilisearchTask => {
  if (!isRecord(value)) {
    return { errorMessage: null, status: null, uid: null }
  }

  const error = isRecord(value["error"]) ? value["error"] : undefined

  return {
    errorMessage: readNullableString(error?.["message"]),
    status: readNullableString(value["status"]),
    uid: readNullableNumber(value["taskUid"] ?? value["uid"]),
  }
}

const hasValidTaskUid = (task: MeilisearchTask): boolean =>
  task.uid !== null && Number.isInteger(task.uid) && task.uid >= 0

const hasValidTaskStatus = (task: MeilisearchTask): boolean =>
  task.status !== null && VALID_TASK_STATUSES.has(task.status)

const requireTask = (value: unknown, operation: string): MeilisearchTask => {
  const task = readTask(value)

  if (!hasValidTaskUid(task) || !hasValidTaskStatus(task)) {
    throw new MeilisearchError({
      code: "MEILISEARCH_TASK_RESPONSE_INVALID",
      kind: "task",
      message: `Meilisearch ${operation} returned an invalid task response`,
    })
  }

  return task
}

const assertTaskSucceededOrPending = (task: MeilisearchTask): boolean => {
  if (task.status === "succeeded") {
    return true
  }

  if (task.status === "failed" || task.status === "canceled") {
    throw new MeilisearchError({
      code: "MEILISEARCH_TASK_FAILED",
      kind: "task",
      message: `Meilisearch task ${task.uid} ${task.status}: ${task.errorMessage ?? "unknown error"}`,
      status: task.status,
      ...(task.uid === null ? {} : { taskUid: task.uid }),
    })
  }

  return false
}

const readDocumentId = (value: unknown): string | number | undefined => {
  if (!isRecord(value)) {
    return undefined
  }

  return typeof value["id"] === "string" || typeof value["id"] === "number"
    ? value["id"]
    : undefined
}

const resolveMeilisearchErrorMessage = (
  value: unknown,
  fallback: string,
): string =>
  isRecord(value) && typeof value["message"] === "string"
    ? value["message"]
    : fallback

const readResponseCode = (value: unknown): string | undefined =>
  isRecord(value) && typeof value["code"] === "string"
    ? value["code"]
    : undefined

export class MeilisearchAdminClient {
  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(options?: { apiKey?: string; host?: string }) {
    const host = options?.host ?? process.env["MEILISEARCH_HOST"]
    const apiKey = options?.apiKey ?? process.env["MEILISEARCH_API_KEY"]

    if (host === undefined || host.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "MEILISEARCH_HOST is required for profile indexing",
      )
    }

    if (apiKey === undefined || apiKey.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "MEILISEARCH_API_KEY is required for profile indexing",
      )
    }

    this.baseUrl = host.replace(TRAILING_SLASH_REGEX, "")
    this.apiKey = apiKey
  }

  private async requestOnce(
    options: MeilisearchRequestOptions,
  ): Promise<MeilisearchResponse> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, REQUEST_TIMEOUT_MILLISECONDS)

    try {
      const response = await fetch(`${this.baseUrl}${options.path}`, {
        ...(options.body === undefined
          ? {}
          : { body: JSON.stringify(options.body) }),
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...(options.body === undefined
            ? {}
            : { "Content-Type": "application/json" }),
        },
        method: options.method,
        signal: controller.signal,
      })
      const raw = await response.text()
      let parsed: unknown = null

      if (raw.length > 0) {
        try {
          parsed = JSON.parse(raw)
        } catch {
          parsed = null
        }
      }

      if (
        response.ok ||
        (options.acceptedStatuses ?? []).includes(response.status)
      ) {
        return { body: parsed, status: response.status }
      }

      const parsedMessage = resolveMeilisearchErrorMessage(parsed, raw)
      const responseCode = readResponseCode(parsed)

      throw new MeilisearchError({
        kind: "http",
        message: `Meilisearch ${options.method} ${options.path} failed (${response.status}): ${parsedMessage}`,
        ...(responseCode === undefined ? {} : { responseCode }),
        retryable: response.status === 429 || response.status >= 500,
        status: response.status,
      })
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private async request(
    options: MeilisearchRequestOptions,
    attempt = 0,
    lastError?: unknown,
  ): Promise<MeilisearchResponse> {
    const attempts = options.attempts ?? REQUEST_ATTEMPTS

    if (attempt >= attempts) {
      if (lastError instanceof Error) {
        throw lastError
      }

      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Meilisearch ${options.method} ${options.path} failed without a response`,
      )
    }

    try {
      return await this.requestOnce(options)
    } catch (error) {
      if (
        !(error instanceof MeilisearchError) ||
        error.kind !== "http" ||
        !error.retryable
      ) {
        throw error
      }

      if (attempt + 1 < attempts) {
        await delay(100 * 2 ** attempt)
      }

      return await this.request(options, attempt + 1, error)
    }
  }

  private async enqueue(options: MeilisearchRequestOptions): Promise<void> {
    const response = await this.request(options)

    if (response.status < 200 || response.status >= 300) {
      return
    }

    const task = requireTask(response.body, `${options.method} ${options.path}`)

    if (!assertTaskSucceededOrPending(task) && task.uid !== null) {
      await this.waitForTask(task.uid)
    }
  }

  async waitForTask(
    taskUid: number,
    timeoutMilliseconds = DEFAULT_TASK_TIMEOUT_MILLISECONDS,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMilliseconds

    const poll = async (): Promise<void> => {
      if (Date.now() >= deadline) {
        throw new MeilisearchError({
          code: "MEILISEARCH_TASK_TIMEOUT",
          kind: "task",
          message: `Meilisearch task ${taskUid} timed out after ${timeoutMilliseconds}ms`,
          taskUid,
        })
      }

      const response = await this.request({
        acceptedStatuses: [404],
        method: "GET",
        path: `/tasks/${taskUid}`,
      })

      if (response.status !== 404) {
        const task = requireTask(response.body, `GET /tasks/${taskUid}`)

        if (task.uid !== taskUid) {
          throw new MeilisearchError({
            code: "MEILISEARCH_TASK_RESPONSE_INVALID",
            kind: "task",
            message: `Meilisearch returned task ${task.uid} while polling task ${taskUid}`,
            taskUid,
          })
        }

        if (assertTaskSucceededOrPending(task)) {
          return
        }
      }

      await delay(TASK_POLL_INTERVAL_MILLISECONDS)
      await poll()
    }

    await poll()
  }

  async ensureIndex(index: string): Promise<void> {
    try {
      await this.enqueue({
        body: { primaryKey: "id", uid: index },
        method: "POST",
        path: "/indexes",
      })
    } catch (error) {
      if (
        error instanceof MeilisearchError &&
        error.kind === "http" &&
        (error.responseCode === "index_already_exists" || error.status === 409)
      ) {
        return
      }

      throw error
    }
  }

  async health(): Promise<MeilisearchHealthResponse> {
    const { body } = await this.request({
      attempts: 1,
      method: "GET",
      path: "/health",
    })

    return {
      status: isRecord(body) ? readOptionalString(body["status"]) : undefined,
    }
  }

  async updateSettings(
    index: string,
    settings: Record<string, unknown>,
  ): Promise<void> {
    await this.enqueue({
      body: settings,
      method: "PATCH",
      path: `/indexes/${encodeURIComponent(index)}/settings`,
    })
  }

  async addDocuments(
    index: string,
    documents: Record<string, unknown>[],
  ): Promise<void> {
    if (documents.length === 0) {
      return
    }

    await this.enqueue({
      body: documents,
      method: "POST",
      path: `/indexes/${encodeURIComponent(index)}/documents?primaryKey=id`,
    })
  }

  async deleteDocuments(index: string, ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return
    }

    await this.enqueue({
      body: ids,
      method: "POST",
      path: `/indexes/${encodeURIComponent(index)}/documents/delete-batch`,
    })
  }

  async getDocumentIds(index: string): Promise<string[]> {
    const batchSize = 10 ** 3
    const maximumDocuments = 10 ** 6
    const maximumPages = maximumDocuments / batchSize
    const documentIds: string[] = []
    const seenIds = new Set<string>()

    const readPage = async (offset: number, page: number): Promise<void> => {
      if (page >= maximumPages) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `Meilisearch index ${index} exceeds the ${maximumDocuments} document enumeration limit`,
        )
      }
      const { body } = await this.request({
        method: "GET",
        path: `/indexes/${encodeURIComponent(index)}/documents?fields=id&limit=${batchSize}&offset=${offset}`,
      })
      if (!isRecord(body) || !Array.isArray(body["results"])) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `Meilisearch index ${index} returned an invalid document page`,
        )
      }
      const { results } = body
      if (results.length > batchSize) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `Meilisearch index ${index} returned an oversized document page`,
        )
      }

      for (const document of results) {
        const rawId = readDocumentId(document)
        if (rawId === undefined) {
          throw new MedusaError(
            MedusaError.Types.UNEXPECTED_STATE,
            `Meilisearch index ${index} returned a document without an id`,
          )
        }
        const id = String(rawId)
        if (seenIds.has(id)) {
          throw new MedusaError(
            MedusaError.Types.UNEXPECTED_STATE,
            `Meilisearch index ${index} returned duplicate document id ${id}`,
          )
        }
        seenIds.add(id)
        documentIds.push(id)
      }

      if (results.length === batchSize) {
        await readPage(offset + results.length, page + 1)
      }
    }

    await readPage(0, 0)
    return documentIds
  }

  async waitForDocument(
    index: string,
    documentId: string,
    timeoutMilliseconds = DEFAULT_TASK_TIMEOUT_MILLISECONDS,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMilliseconds

    const poll = async (): Promise<void> => {
      if (Date.now() >= deadline) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `Meilisearch document ${documentId} did not become visible in ${index} after ${timeoutMilliseconds}ms`,
        )
      }

      const { body } = await this.request({
        acceptedStatuses: [404],
        attempts: 1,
        method: "GET",
        path: `/indexes/${encodeURIComponent(index)}/documents/${encodeURIComponent(documentId)}`,
      })

      if (String(readDocumentId(body)) === documentId) {
        return
      }

      await delay(TASK_POLL_INTERVAL_MILLISECONDS)
      await poll()
    }

    await poll()
  }

  async swapIndexPairs(
    pairs: { first: string; second: string }[],
    completionProbe?: { documentId: string; index: string },
  ): Promise<void> {
    if (pairs.length === 0) {
      return
    }

    const response = await this.request({
      attempts: 1,
      body: pairs.map(({ first, second }) => ({ indexes: [first, second] })),
      method: "POST",
      path: "/swap-indexes",
    })
    const task = requireTask(response.body, "POST /swap-indexes")

    if (!assertTaskSucceededOrPending(task) && task.uid !== null) {
      await this.waitForTask(task.uid)
    }

    if (completionProbe !== undefined) {
      await this.waitForDocument(
        completionProbe.index,
        completionProbe.documentId,
      )
    }
  }

  async deleteIndex(index: string): Promise<void> {
    await this.enqueue({
      acceptedStatuses: [404],
      method: "DELETE",
      path: `/indexes/${encodeURIComponent(index)}`,
    })
  }
}
