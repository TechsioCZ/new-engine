import { AdminApiError } from "./error-utils"

const TRAILING_SLASHES_REGEX = /\/+$/u

export type AdminDataFetch = typeof fetch
type ErrorLikePayload = { payload?: unknown }
type MedusaSdkHeaderValue = string | null | { tags: string[] }

export type AdminDataClientConfig = {
  baseUrl: string
  fetch?: AdminDataFetch
  getToken?: () =>
    | Promise<string | null | undefined>
    | string
    | null
    | undefined
}

export type MedusaSdkFetchOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: BodyInit | Record<string, unknown> | unknown[]
  headers?: Record<string, MedusaSdkHeaderValue>
  query?: Record<string, unknown>
}

export type MedusaSdkHttpClient = {
  fetch: <TResponse>(
    path: string,
    options?: MedusaSdkFetchOptions
  ) => Promise<TResponse>
  getToken?: () =>
    | Promise<string | null | undefined>
    | string
    | null
    | undefined
}

export type MedusaSdkAdminDataClientConfig = {
  client?: MedusaSdkHttpClient
  sdk?: {
    client: MedusaSdkHttpClient
  }
}

export type AdminDataRequestMethod = "DELETE" | "GET" | "PATCH" | "POST" | "PUT"

export type AdminDataRequestOptions = {
  body?: unknown
  headers?: HeadersInit
  method?: AdminDataRequestMethod
  params?: Record<string, string | number | boolean | null | undefined>
  signal?: AbortSignal
}

export type AdminDataClient = {
  fetchBlob: (path: string, options?: AdminDataRequestOptions) => Promise<Blob>
  fetchJson: <TResponse>(
    path: string,
    options?: AdminDataRequestOptions
  ) => Promise<TResponse>
  fetchText: (
    path: string,
    options?: AdminDataRequestOptions
  ) => Promise<string>
  fetchVoid: (path: string, options?: AdminDataRequestOptions) => Promise<void>
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(TRAILING_SLASHES_REGEX, "")
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`
}

export function buildAdminUrl(
  baseUrl: string,
  path: string,
  params?: AdminDataRequestOptions["params"]
) {
  const url = new URL(`${normalizeBaseUrl(baseUrl)}${normalizePath(path)}`)

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === null || typeof value === "undefined") {
      continue
    }

    url.searchParams.set(key, String(value))
  }

  return url.toString()
}

function isNativeBody(body: unknown): body is BodyInit {
  return (
    typeof body === "string" ||
    body instanceof ArrayBuffer ||
    (typeof Blob !== "undefined" && body instanceof Blob) ||
    (typeof FormData !== "undefined" && body instanceof FormData) ||
    (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams)
  )
}

function createRequestBody(body: unknown): BodyInit | undefined {
  if (typeof body === "undefined") {
    return
  }

  return isNativeBody(body) ? body : JSON.stringify(body)
}

function shouldSendJsonContentType(body: unknown) {
  return typeof body !== "undefined" && !isNativeBody(body)
}

async function readJsonPayload(response: Response) {
  const text = await response.text().catch(() => "")

  if (!text) {
    return
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function getPayloadMessage(payload: unknown) {
  return typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof payload.message === "string"
    ? payload.message
    : null
}

async function createAdminApiError(response: Response) {
  const payload = await readJsonPayload(response)
  const message =
    getPayloadMessage(payload) ??
    `Admin API request failed with ${response.status}`

  return new AdminApiError(message, response.status, payload)
}

async function readJsonResponse<TResponse>(response: Response) {
  if (response.status === 204) {
    return undefined as TResponse
  }

  const payload = await readJsonPayload(response)

  return payload as TResponse
}

function hasNumberStatus(error: unknown): error is { status: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  )
}

function hasStringMessage(error: unknown): error is { message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  )
}

function getErrorPayload(error: unknown) {
  return typeof error === "object" && error !== null && "payload" in error
    ? (error as ErrorLikePayload).payload
    : undefined
}

function toMedusaHeaders(headers?: HeadersInit) {
  const normalizedHeaders = new Headers(headers)
  const result: Record<string, MedusaSdkHeaderValue> = {}

  for (const [key, value] of normalizedHeaders.entries()) {
    result[key] = value
  }

  return result
}

function toMedusaQuery(params?: AdminDataRequestOptions["params"]) {
  const query: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === null || typeof value === "undefined") {
      continue
    }

    query[key] = value
  }

  return query
}

async function normalizeSdkError<TResponse>(request: () => Promise<TResponse>) {
  try {
    return await request()
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }

    if (hasNumberStatus(error)) {
      throw new AdminApiError(
        hasStringMessage(error)
          ? error.message
          : `Admin API request failed with ${error.status}`,
        error.status,
        getErrorPayload(error)
      )
    }

    throw error
  }
}

export function createFetchAdminDataClient({
  baseUrl,
  fetch: fetchImpl = globalThis.fetch,
  getToken,
}: AdminDataClientConfig): AdminDataClient {
  if (!fetchImpl) {
    throw new Error("Admin data client requires a fetch implementation")
  }

  async function createHeaders(
    options: AdminDataRequestOptions,
    accept: string
  ) {
    const headers = new Headers(options?.headers)
    headers.set("Accept", headers.get("Accept") ?? accept)

    if (shouldSendJsonContentType(options.body)) {
      headers.set(
        "Content-Type",
        headers.get("Content-Type") ?? "application/json"
      )
    }

    const token = await getToken?.()

    if (token) {
      headers.set("Authorization", `Bearer ${token}`)
    }

    return headers
  }

  async function fetchResponse(
    path: string,
    options: AdminDataRequestOptions = {},
    accept = "application/json"
  ) {
    const response = await fetchImpl(
      buildAdminUrl(baseUrl, path, options.params),
      {
        body: createRequestBody(options.body),
        credentials: "include",
        headers: await createHeaders(options, accept),
        method: options.method ?? "GET",
        signal: options.signal,
      }
    )

    if (!response.ok) {
      throw await createAdminApiError(response)
    }

    return response
  }

  return {
    async fetchBlob(path, options = {}) {
      return (await fetchResponse(path, options, "*/*")).blob()
    },
    async fetchJson<TResponse>(path: string, options = {}) {
      return readJsonResponse<TResponse>(
        await fetchResponse(path, options, "application/json")
      )
    },
    async fetchText(path, options = {}) {
      return (await fetchResponse(path, options, "text/plain")).text()
    },
    async fetchVoid(path, options = {}) {
      await fetchResponse(path, options, "*/*")
    },
  }
}

export const createAdminDataClient = createFetchAdminDataClient

/**
 * Adapter for callers that explicitly want to use `sdk.client.fetch`.
 *
 * Prefer `createMedusaAdminDataPreset({ baseUrl, sdk })` or
 * `createFetchAdminDataClient` for custom Admin API flows that rely on
 * structured non-2xx response payloads. Medusa SDK fetch preserves auth headers
 * but drops those payloads when it throws.
 */
export function createMedusaSdkAdminDataClient({
  client,
  sdk,
}: MedusaSdkAdminDataClientConfig): AdminDataClient {
  const resolvedClient = client ?? sdk?.client

  if (!resolvedClient) {
    throw new Error("Medusa SDK admin data client requires sdk.client")
  }

  const sdkClient = resolvedClient

  function createSdkOptions(
    options: AdminDataRequestOptions = {},
    rawResponse = false
  ): MedusaSdkFetchOptions {
    const headers = toMedusaHeaders(options.headers)

    if (rawResponse) {
      headers.accept = null
    }

    return {
      body: options.body as MedusaSdkFetchOptions["body"],
      headers,
      method: options.method ?? "GET",
      query: toMedusaQuery(options.params),
      signal: options.signal,
    }
  }

  function fetchRawResponse(
    path: string,
    options: AdminDataRequestOptions = {}
  ) {
    return normalizeSdkError(() =>
      sdkClient.fetch<Response>(path, createSdkOptions(options, true))
    )
  }

  return {
    async fetchBlob(path, options = {}) {
      return (await fetchRawResponse(path, options)).blob()
    },
    fetchJson<TResponse>(path: string, options = {}) {
      return fetchRawResponse(path, options).then(readJsonResponse<TResponse>)
    },
    async fetchText(path, options = {}) {
      return (await fetchRawResponse(path, options)).text()
    },
    async fetchVoid(path, options = {}) {
      await fetchRawResponse(path, options)
    },
  }
}
