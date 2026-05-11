import { describe, expect, it } from "vitest"

type JsonObject = Record<string, unknown>

type JsonResponse = {
  status: number
  data: JsonObject
}

function resolveRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Run the isolated e2e harness or provide it explicitly.`
    )
  }

  return value
}

async function requestJson(
  baseUrl: string,
  path: string,
  options?: {
    method?: string
    body?: JsonObject
    token?: string
  }
): Promise<JsonResponse> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      ...(options?.body ? { "content-type": "application/json" } : {}),
      ...(options?.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })

  const rawBody = await response.text()
  const data = rawBody ? (JSON.parse(rawBody) as JsonObject) : {}

  return {
    status: response.status,
    data,
  }
}

describe("Admin publishable key endpoint", () => {
  const backendUrl = resolveRequiredEnv("MEDUSA_E2E_BACKEND_URL")
  const adminEmail = resolveRequiredEnv("MEDUSA_E2E_ADMIN_EMAIL")
  const adminPassword = resolveRequiredEnv("MEDUSA_E2E_ADMIN_PASSWORD")

  it("provisions a publishable key and retrieves the same token", async () => {
    const authResponse = await requestJson(backendUrl, "/auth/user/emailpass", {
      method: "POST",
      body: {
        email: adminEmail,
        password: adminPassword,
      },
    })

    expect(authResponse.status).toBe(200)
    expect(typeof authResponse.data.token).toBe("string")

    const title = `CI Publishable Key ${Date.now()}`
    const token = authResponse.data.token as string

    const createResponse = await requestJson(
      backendUrl,
      "/admin/provisioning/publishable-key",
      {
        method: "POST",
        token,
        body: { title },
      }
    )

    expect(createResponse.status).toBe(200)
    expect(createResponse.data).toEqual({
      api_key: expect.objectContaining({
        title,
        type: "publishable",
        token: expect.any(String),
      }),
      created: true,
    })

    const secondCreateResponse = await requestJson(
      backendUrl,
      "/admin/provisioning/publishable-key",
      {
        method: "POST",
        token,
        body: { title },
      }
    )

    expect(secondCreateResponse.status).toBe(200)
    expect(secondCreateResponse.data).toEqual({
      api_key: expect.objectContaining({
        id: createResponse.data.api_key?.id,
        token: createResponse.data.api_key?.token,
        title,
        type: "publishable",
      }),
      created: false,
    })

    const getResponse = await requestJson(
      backendUrl,
      `/admin/provisioning/publishable-key?title=${encodeURIComponent(title)}`,
      { token }
    )

    expect(getResponse.status).toBe(200)
    expect(getResponse.data).toEqual({
      api_key: expect.objectContaining({
        id: createResponse.data.api_key?.id,
        token: createResponse.data.api_key?.token,
        title,
        type: "publishable",
      }),
      created: false,
    })
  })
})
