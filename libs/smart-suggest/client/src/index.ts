import type {
  SmartSuggestAcceptEvent,
  SmartSuggestError,
  SmartSuggestRequest,
  SmartSuggestResponse,
} from "@techsio/smart-suggest-core"
import type {
  PhoneValidationRequest,
  PhoneValidationResult,
  PostalValidationRequest,
  PostalValidationResult,
} from "@techsio/smart-suggest-validation"

export type SmartSuggestFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>

export type SmartSuggestClientOptions = {
  apiBaseUrl?: string
  fetch?: SmartSuggestFetch
  timeoutMs?: number
}

export type SmartSuggestRequestOptions = {
  signal?: AbortSignal
  timeoutMs?: number
}

export type SmartSuggestAcceptResponse = {
  accepted: true
}

export type SmartSuggestClientErrorPayload = {
  errors?: readonly SmartSuggestError[]
  message?: string
}

export class SmartSuggestClientError extends Error {
  readonly errors: readonly SmartSuggestError[]
  readonly status: number

  constructor(status: number, payload: SmartSuggestClientErrorPayload) {
    super(payload.message ?? `Smart Suggest request failed with ${status}.`)
    this.name = "SmartSuggestClientError"
    this.status = status
    this.errors = payload.errors ?? []
  }
}

const defaultFetch: SmartSuggestFetch = (input, init) => fetch(input, init)

const normalizeBaseUrl = (apiBaseUrl: string | undefined) => {
  const baseUrl = apiBaseUrl ?? "/api"
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
}

const buildUrl = (
  apiBaseUrl: string,
  path: string,
  searchParams?: URLSearchParams
) => {
  const query = searchParams?.toString()
  return `${apiBaseUrl}${path}${query === undefined || query === "" ? "" : `?${query}`}`
}

const addOptionalParam = (
  params: URLSearchParams,
  name: string,
  value: number | string | undefined
) => {
  if (value !== undefined) {
    params.set(name, String(value))
  }
}

const toSuggestSearchParams = (request: SmartSuggestRequest) => {
  const params = new URLSearchParams()
  params.set("kind", request.kind)
  params.set("q", request.query)
  addOptionalParam(params, "countryCode", request.countryCode)
  addOptionalParam(params, "language", request.language)
  addOptionalParam(params, "limit", request.limit)
  addOptionalParam(params, "tenantId", request.tenant?.tenantId)
  addOptionalParam(params, "salesChannelId", request.tenant?.salesChannelId)
  addOptionalParam(params, "cartId", request.tenant?.cartId)
  addOptionalParam(params, "sessionId", request.tenant?.sessionId)
  return params
}

const createRequestSignal = (
  requestOptions: SmartSuggestRequestOptions,
  timeoutMs: number
) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort(new DOMException("Request timed out.", "TimeoutError"))
  }, requestOptions.timeoutMs ?? timeoutMs)

  const abortFromExternalSignal = () => {
    controller.abort(requestOptions.signal?.reason)
  }

  if (requestOptions.signal?.aborted === true) {
    abortFromExternalSignal()
  } else {
    requestOptions.signal?.addEventListener("abort", abortFromExternalSignal, {
      once: true,
    })
  }

  return {
    cleanup: () => {
      clearTimeout(timeout)
      requestOptions.signal?.removeEventListener(
        "abort",
        abortFromExternalSignal
      )
    },
    signal: controller.signal,
  }
}

const parseErrorPayload = async (
  response: Response
): Promise<SmartSuggestClientErrorPayload> => {
  try {
    const body = (await response.json()) as SmartSuggestClientErrorPayload
    return body
  } catch {
    return { message: response.statusText }
  }
}

export type SmartSuggestClient = {
  accept: (
    event: SmartSuggestAcceptEvent,
    requestOptions?: SmartSuggestRequestOptions
  ) => Promise<SmartSuggestAcceptResponse>
  suggest: (
    request: SmartSuggestRequest,
    requestOptions?: SmartSuggestRequestOptions
  ) => Promise<SmartSuggestResponse>
  validatePhone: (
    request: PhoneValidationRequest,
    requestOptions?: SmartSuggestRequestOptions
  ) => Promise<PhoneValidationResult>
  validatePostal: (
    request: PostalValidationRequest,
    requestOptions?: SmartSuggestRequestOptions
  ) => Promise<PostalValidationResult>
}

export const createSmartSuggestClient = (
  options: SmartSuggestClientOptions = {}
): SmartSuggestClient => {
  const apiBaseUrl = normalizeBaseUrl(options.apiBaseUrl)
  const fetchImpl = options.fetch ?? defaultFetch
  const timeoutMs = options.timeoutMs ?? 5000

  const requestJson = async <TResponse>(
    path: string,
    init: RequestInit,
    requestOptions: SmartSuggestRequestOptions = {}
  ) => {
    const requestSignal = createRequestSignal(requestOptions, timeoutMs)

    try {
      const response = await fetchImpl(buildUrl(apiBaseUrl, path), {
        ...init,
        headers: {
          "content-type": "application/json",
          ...init.headers,
        },
        signal: requestSignal.signal,
      })

      if (!response.ok) {
        throw new SmartSuggestClientError(
          response.status,
          await parseErrorPayload(response)
        )
      }

      return (await response.json()) as TResponse
    } finally {
      requestSignal.cleanup()
    }
  }

  return {
    accept: (event, requestOptions) =>
      requestJson<SmartSuggestAcceptResponse>(
        "/v1/accept",
        { body: JSON.stringify(event), method: "POST" },
        requestOptions
      ),
    suggest: async (request, requestOptions = {}) => {
      const requestSignal = createRequestSignal(requestOptions, timeoutMs)

      try {
        const response = await fetchImpl(
          buildUrl(apiBaseUrl, "/v1/suggest", toSuggestSearchParams(request)),
          {
            headers: { accept: "application/json" },
            method: "GET",
            signal: requestSignal.signal,
          }
        )

        if (!response.ok) {
          throw new SmartSuggestClientError(
            response.status,
            await parseErrorPayload(response)
          )
        }

        return (await response.json()) as SmartSuggestResponse
      } finally {
        requestSignal.cleanup()
      }
    },
    validatePhone: (request, requestOptions) =>
      requestJson<PhoneValidationResult>(
        "/v1/validate/phone",
        { body: JSON.stringify(request), method: "POST" },
        requestOptions
      ),
    validatePostal: (request, requestOptions) =>
      requestJson<PostalValidationResult>(
        "/v1/validate/postal",
        { body: JSON.stringify(request), method: "POST" },
        requestOptions
      ),
  }
}
