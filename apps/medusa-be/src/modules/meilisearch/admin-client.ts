import { MedusaError } from "@medusajs/framework/utils"

type MeilisearchTask = {
  error?: {
    message?: string
  }

  status?: string
  taskUid?: number
  uid?: number
}

type MeilisearchDocumentsResponse = {
  results?: Array<{
    id?: string | number
  }>
}

type MeilisearchDocumentResponse = {
  id?: string | number
}

type MeilisearchHealthResponse = {
  status?: string
}

type MeilisearchRequestOptions = {
  acceptedStatuses?: number[]
  attempts?: number
  body?: unknown
  method: string
  path: string
}

class MeilisearchHttpError extends Error {
  readonly retryable: boolean

  constructor(message: string, retryable: boolean) {
    super(message)

    this.retryable = retryable
  }
}

const DEFAULT_TASK_TIMEOUT_MILLISECONDS = 60_000
const TASK_POLL_INTERVAL_MILLISECONDS = 75
const REQUEST_TIMEOUT_MILLISECONDS = 10_000
const REQUEST_ATTEMPTS = 3
const TRAILING_SLASH_REGEX = /\/$/

export class MeilisearchAdminClient {
  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(options?: { apiKey?: string; host?: string }) {
    const host = options?.host ?? process.env.MEILISEARCH_HOST
    const apiKey = options?.apiKey ?? process.env.MEILISEARCH_API_KEY

    if (!host) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "MEILISEARCH_HOST is required for profile indexing"
      )
    }

    if (!apiKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "MEILISEARCH_API_KEY is required for profile indexing"
      )
    }

    this.baseUrl = host.replace(TRAILING_SLASH_REGEX, "")
    this.apiKey = apiKey
  }

  private async requestOnce<ResponseBody>(
    options: MeilisearchRequestOptions
  ): Promise<ResponseBody> {
    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MILLISECONDS
    )

    try {
      const response = await fetch(this.baseUrl + options.path, {
        method: options.method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...(options.body === undefined
            ? {}
            : { "Content-Type": "application/json" }),
        },
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      })
      const raw = await response.text()

      let parsed: unknown

      try {
        parsed = raw ? JSON.parse(raw) : undefined
      } catch {
        parsed = undefined
      }

      if (
        response.ok ||
        (options.acceptedStatuses ?? []).includes(response.status)
      ) {
        return parsed as ResponseBody
      }

      const parsedMessage =
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        typeof (parsed as { message?: unknown }).message === "string"
          ? (parsed as { message: string }).message
          : raw

      throw new MeilisearchHttpError(
        `Meilisearch ${options.method} ${options.path} failed (${response.status}): ${parsedMessage}`,
        response.status === 429 || response.status >= 500
      )
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private async request<ResponseBody>(
    options: MeilisearchRequestOptions
  ): Promise<ResponseBody> {
    const attempts = options.attempts ?? REQUEST_ATTEMPTS

    let lastError: unknown

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await this.requestOnce<ResponseBody>(options)
      } catch (error) {
        lastError = error

        if (error instanceof MeilisearchHttpError && !error.retryable) {
          throw error
        }
      }

      if (attempt + 1 < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt))
      }
    }

    throw (
      lastError ??
      new Error(
        `Meilisearch ${options.method} ${options.path} failed without a response`
      )
    )
  }

  private async enqueue(options: MeilisearchRequestOptions): Promise<void> {
    const task = await this.request<MeilisearchTask>(options)
    const taskUid = task.taskUid ?? task.uid

    if (typeof taskUid === "number") {
      await this.waitForTask(taskUid)
    }
  }

  async waitForTask(
    taskUid: number,
    timeoutMilliseconds = DEFAULT_TASK_TIMEOUT_MILLISECONDS
  ): Promise<void> {
    const deadline = Date.now() + timeoutMilliseconds

    while (Date.now() < deadline) {
      const task = await this.request<MeilisearchTask>({
        method: "GET",
        path: `/tasks/${taskUid}`,
        acceptedStatuses: [404],
      })

      if (task.status === "succeeded") {
        return
      }

      if (task.status === "failed" || task.status === "canceled") {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `Meilisearch task ${taskUid} ${task.status}: ${task.error?.message ?? "unknown error"}`
        )
      }

      await new Promise((resolve) =>
        setTimeout(resolve, TASK_POLL_INTERVAL_MILLISECONDS)
      )
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Meilisearch task ${taskUid} timed out after ${timeoutMilliseconds}ms`
    )
  }

  async ensureIndex(index: string): Promise<void> {
    try {
      await this.enqueue({
        method: "POST",
        path: "/indexes",
        body: { uid: index, primaryKey: "id" },
      })
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("index_already_exists") ||
          error.message.toLowerCase().includes("already exists"))
      ) {
        return
      }

      throw error
    }
  }

  async health(): Promise<MeilisearchHealthResponse> {
    return this.request<MeilisearchHealthResponse>({
      method: "GET",
      path: "/health",
      attempts: 1,
    })
  }

  async updateSettings(
    index: string,
    settings: Record<string, unknown>
  ): Promise<void> {
    await this.enqueue({
      method: "PATCH",
      path: `/indexes/${encodeURIComponent(index)}/settings`,
      body: settings,
    })
  }

  async addDocuments(
    index: string,
    documents: Record<string, unknown>[]
  ): Promise<void> {
    if (documents.length === 0) {
      return
    }

    await this.enqueue({
      method: "POST",
      path: `/indexes/${encodeURIComponent(index)}/documents?primaryKey=id`,
      body: documents,
    })
  }

  async deleteDocuments(index: string, ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return
    }

    await this.enqueue({
      method: "POST",
      path: `/indexes/${encodeURIComponent(index)}/documents/delete-batch`,
      body: ids,
    })
  }

  async getDocumentIds(index: string, batchSize = 1000): Promise<string[]> {
    const ids: string[] = []

    let offset = 0

    while (true) {
      const result = await this.request<MeilisearchDocumentsResponse>({
        method: "GET",
        path: `/indexes/${encodeURIComponent(index)}/documents?fields=id&limit=${batchSize}&offset=${offset}`,
      })
      const batch = result.results ?? []

      for (const document of batch) {
        if (typeof document.id === "string") {
          ids.push(document.id)
        } else if (typeof document.id === "number") {
          ids.push(String(document.id))
        }
      }

      if (batch.length < batchSize) {
        break
      }

      offset += batch.length
    }

    return ids
  }

  async waitForDocument(
    index: string,
    documentId: string,
    timeoutMilliseconds = DEFAULT_TASK_TIMEOUT_MILLISECONDS
  ): Promise<void> {
    const deadline = Date.now() + timeoutMilliseconds

    while (Date.now() < deadline) {
      const document = await this.request<MeilisearchDocumentResponse>({
        method: "GET",
        path: `/indexes/${encodeURIComponent(index)}/documents/${encodeURIComponent(documentId)}`,
        acceptedStatuses: [404],
        attempts: 1,
      })

      if (String(document.id) === documentId) {
        return
      }

      await new Promise((resolve) =>
        setTimeout(resolve, TASK_POLL_INTERVAL_MILLISECONDS)
      )
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Meilisearch document ${documentId} did not become visible in ${index} after ${timeoutMilliseconds}ms`
    )
  }

  async swapIndexPairs(
    pairs: Array<{ first: string; second: string }>,

    completionProbe?: {
      documentId: string
      index: string
    }
  ): Promise<void> {
    if (pairs.length === 0) {
      return
    }

    const task = await this.request<MeilisearchTask>({
      method: "POST",
      path: "/swap-indexes",
      body: pairs.map(({ first, second }) => ({ indexes: [first, second] })),
      attempts: 1,
    })

    if (completionProbe) {
      await this.waitForDocument(
        completionProbe.index,
        completionProbe.documentId
      )

      return
    }

    const taskUid = task.taskUid ?? task.uid

    if (typeof taskUid === "number") {
      await this.waitForTask(taskUid)
    }
  }

  async deleteIndex(index: string): Promise<void> {
    await this.enqueue({
      method: "DELETE",
      path: `/indexes/${encodeURIComponent(index)}`,
      acceptedStatuses: [404],
    })
  }
}
