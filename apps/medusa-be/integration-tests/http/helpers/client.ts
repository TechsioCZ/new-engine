export type JsonObject = Record<string, unknown>

export type JsonResponse<T extends JsonObject = JsonObject> = {
  status: number
  data: T
}

export type ApiClient = {
  get: <T extends JsonObject = JsonObject>(path: string) => Promise<T>
  post: <T extends JsonObject = JsonObject>(
    path: string,
    body?: JsonObject
  ) => Promise<T>
  request: <T extends JsonObject = JsonObject>(
    path: string,
    options?: { body?: JsonObject; method?: string }
  ) => Promise<JsonResponse<T>>
}

export function resolveRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Run the isolated e2e harness or provide it explicitly.`
    )
  }

  return value
}

export async function requestJson<T extends JsonObject = JsonObject>(
  baseUrl: string,
  path: string,
  options?: {
    body?: JsonObject
    headers?: Record<string, string>
    method?: string
    token?: string
  }
): Promise<JsonResponse<T>> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      ...(options?.body ? { "content-type": "application/json" } : {}),
      ...(options?.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...options?.headers,
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })
  const rawBody = await response.text()
  const data = rawBody ? (JSON.parse(rawBody) as T) : ({} as T)

  return {
    data,
    status: response.status,
  }
}

export function assertOk<T extends JsonObject>(response: JsonResponse<T>): T {
  if (response.status !== 200) {
    throw new Error(
      `Expected HTTP 200, received ${response.status}: ${JSON.stringify(
        response.data
      )}`
    )
  }

  return response.data
}

export function createClient(
  baseUrl: string,
  headers: Record<string, string>
): ApiClient {
  return {
    get: async <T extends JsonObject = JsonObject>(path: string) =>
      assertOk(await requestJson<T>(baseUrl, path, { headers })),
    post: async <T extends JsonObject = JsonObject>(
      path: string,
      body: JsonObject = {}
    ) =>
      assertOk(
        await requestJson<T>(baseUrl, path, {
          body,
          headers,
          method: "POST",
        })
      ),
    request: async <T extends JsonObject = JsonObject>(
      path: string,
      options?: { body?: JsonObject; method?: string }
    ) =>
      await requestJson<T>(baseUrl, path, {
        body: options?.body,
        headers,
        method: options?.method,
      }),
  }
}

export async function authenticateAdmin(baseUrl: string) {
  const response = await requestJson<{ token: string }>(
    baseUrl,
    "/auth/user/emailpass",
    {
      body: {
        email: resolveRequiredEnv("MEDUSA_E2E_ADMIN_EMAIL"),
        password: resolveRequiredEnv("MEDUSA_E2E_ADMIN_PASSWORD"),
      },
      method: "POST",
    }
  )

  if (response.status !== 200 || typeof response.data.token !== "string") {
    throw new Error("Admin authentication failed")
  }

  return createClient(baseUrl, {
    authorization: `Bearer ${response.data.token}`,
  })
}
