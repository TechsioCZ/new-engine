import { z } from "@medusajs/framework/zod"

const jsonObjectSchema = z.record(z.string(), z.json())

export type JsonObject = z.infer<typeof jsonObjectSchema>

export interface JsonDecoder<T> {
  parse: (value: unknown) => T
}

export interface JsonResponse<T> {
  status: number
  data: T
}

interface ApiRequestOptions {
  body?: object
  method?: string
}

interface RequestJsonOptions extends ApiRequestOptions {
  headers?: Record<string, string>
  token?: string
}

export interface ApiClient {
  get: {
    (path: string): Promise<JsonObject>
    <T>(path: string, decoder: JsonDecoder<T>): Promise<T>
  }
  post: {
    (path: string, body?: object): Promise<JsonObject>
    <T>(
      path: string,
      body: object | undefined,
      decoder: JsonDecoder<T>,
    ): Promise<T>
  }
  request: {
    (
      path: string,
      options?: ApiRequestOptions,
    ): Promise<JsonResponse<JsonObject>>
    <T>(
      path: string,
      options: ApiRequestOptions & { decoder: JsonDecoder<T> },
    ): Promise<JsonResponse<T>>
  }
}

const maxResponseBodyBytes = 1024 * 1024

const jsonObjectDecoder: JsonDecoder<JsonObject> = {
  parse: (value) => jsonObjectSchema.parse(value),
}

const responseContext = (
  path: string,
  method: string,
  status: number,
): string => `${method} ${path} (HTTP ${status})`

const readResponseBody = async (
  response: Response,
  path: string,
  method: string,
): Promise<string> => {
  const declaredLength = Number(response.headers.get("content-length"))

  if (
    Number.isFinite(declaredLength) &&
    declaredLength > maxResponseBodyBytes
  ) {
    throw new Error(
      `Response body exceeded ${maxResponseBodyBytes} bytes for ${responseContext(path, method, response.status)}`,
    )
  }

  const body = await response.text()
  if (new TextEncoder().encode(body).byteLength > maxResponseBodyBytes) {
    throw new Error(
      `Response body exceeded ${maxResponseBodyBytes} bytes for ${responseContext(path, method, response.status)}`,
    )
  }

  return body
}

const decodeResponse = <T>(
  value: unknown,
  decoder: JsonDecoder<T>,
  path: string,
  method: string,
  status: number,
): T => {
  try {
    return decoder.parse(value)
  } catch (error: unknown) {
    throw new Error(
      `Response payload validation failed for ${responseContext(path, method, status)}`,
      { cause: error },
    )
  }
}

export const resolveRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim()

  if (value === undefined || value === "") {
    throw new Error(
      `Missing required environment variable ${name}. Run the isolated e2e harness or provide it explicitly.`,
    )
  }

  return value
}

export function requestJson<T>(
  baseUrl: string,
  path: string,
  options: RequestJsonOptions & { decoder: JsonDecoder<T> },
): Promise<JsonResponse<T>>
export function requestJson(
  baseUrl: string,
  path: string,
  options?: RequestJsonOptions,
): Promise<JsonResponse<JsonObject>>
export async function requestJson<T>(
  baseUrl: string,
  path: string,
  options?: RequestJsonOptions & { decoder?: JsonDecoder<T> },
): Promise<JsonResponse<T | JsonObject>> {
  const method = options?.method ?? "GET"
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      ...(options?.body === undefined
        ? {}
        : { "content-type": "application/json" }),
      ...(options?.token === undefined || options.token === ""
        ? {}
        : { authorization: `Bearer ${options.token}` }),
      ...options?.headers,
    },
    method,
    ...(options?.body === undefined
      ? {}
      : { body: JSON.stringify(options.body) }),
  })
  const rawBody = await readResponseBody(response, path, method)
  let parsedBody: unknown = {}

  if (rawBody !== "") {
    try {
      parsedBody = JSON.parse(rawBody)
    } catch (error: unknown) {
      throw new Error(
        `Response contained malformed JSON for ${responseContext(path, method, response.status)}`,
        { cause: error },
      )
    }
  }

  if (options?.decoder) {
    return {
      data: decodeResponse(
        parsedBody,
        options.decoder,
        path,
        method,
        response.status,
      ),
      status: response.status,
    }
  }

  return {
    data: decodeResponse(
      parsedBody,
      jsonObjectDecoder,
      path,
      method,
      response.status,
    ),
    status: response.status,
  }
}

export const assertOk = <T>(response: JsonResponse<T>): T => {
  if (response.status !== 200) {
    throw new Error(
      `Expected HTTP 200, received ${response.status}: ${JSON.stringify(
        response.data,
      )}`,
    )
  }

  return response.data
}

export const createClient = (
  baseUrl: string,
  headers: Record<string, string>,
): ApiClient => {
  function get(path: string): Promise<JsonObject>
  function get<T>(path: string, decoder: JsonDecoder<T>): Promise<T>
  async function get<T>(
    path: string,
    decoder?: JsonDecoder<T>,
  ): Promise<T | JsonObject> {
    const data = assertOk(await requestJson(baseUrl, path, { headers }))

    return decoder
      ? decodeResponse(data, decoder, path, "GET", 200)
      : jsonObjectDecoder.parse(data)
  }

  function post(path: string, body?: object): Promise<JsonObject>
  function post<T>(
    path: string,
    body: object | undefined,
    decoder: JsonDecoder<T>,
  ): Promise<T>
  async function post<T>(
    path: string,
    body: object = {},
    decoder?: JsonDecoder<T>,
  ): Promise<T | JsonObject> {
    const data = assertOk(
      await requestJson(baseUrl, path, {
        body,
        headers,
        method: "POST",
      }),
    )

    return decoder
      ? decodeResponse(data, decoder, path, "POST", 200)
      : jsonObjectDecoder.parse(data)
  }

  function request(
    path: string,
    options?: ApiRequestOptions,
  ): Promise<JsonResponse<JsonObject>>
  function request<T>(
    path: string,
    options: ApiRequestOptions & { decoder: JsonDecoder<T> },
  ): Promise<JsonResponse<T>>
  async function request<T>(
    path: string,
    options?: ApiRequestOptions & { decoder?: JsonDecoder<T> },
  ): Promise<JsonResponse<T | JsonObject>> {
    if (options?.decoder) {
      return await requestJson(baseUrl, path, {
        ...(options.body === undefined ? {} : { body: options.body }),
        decoder: options.decoder,
        headers,
        ...(options.method === undefined || options.method === ""
          ? {}
          : { method: options.method }),
      })
    }

    return await requestJson(baseUrl, path, {
      ...(options?.body === undefined ? {} : { body: options.body }),
      headers,
      ...(options?.method === undefined || options.method === ""
        ? {}
        : { method: options.method }),
    })
  }

  return { get, post, request }
}

const adminAuthenticationSchema = z.object({ token: z.string() })

export const authenticateAdmin = async (
  baseUrl: string,
): Promise<ApiClient> => {
  const response = await requestJson(baseUrl, "/auth/user/emailpass", {
    body: {
      email: resolveRequiredEnv("MEDUSA_E2E_ADMIN_EMAIL"),
      password: resolveRequiredEnv("MEDUSA_E2E_ADMIN_PASSWORD"),
    },
    method: "POST",
  })

  if (response.status !== 200) {
    throw new Error("Admin authentication failed")
  }

  const authentication = adminAuthenticationSchema.safeParse(response.data)
  if (authentication.success) {
    return createClient(baseUrl, {
      authorization: `Bearer ${authentication.data.token}`,
    })
  }

  throw new Error("Admin authentication failed", {
    cause: authentication.error,
  })
}
