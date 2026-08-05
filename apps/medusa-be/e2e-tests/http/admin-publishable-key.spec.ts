import { describe, expect, it, vi } from "vitest"

import { requestJson, resolveRequiredEnv } from "./helpers/client"

interface AuthResponse {
  token: string
}

interface PublishableKeyResponse {
  api_key: {
    id: string
    title: string
    token: string
    type: string
  }
  created: boolean
}

describe("Admin publishable key endpoint", () => {
  const backendUrl = resolveRequiredEnv("MEDUSA_E2E_BACKEND_URL")
  const adminEmail = resolveRequiredEnv("MEDUSA_E2E_ADMIN_EMAIL")
  const adminPassword = resolveRequiredEnv("MEDUSA_E2E_ADMIN_PASSWORD")

  it("provisions a publishable key and retrieves the same token", async () => {
    const authResponse = await requestJson<AuthResponse>(
      backendUrl,
      "/auth/user/emailpass",
      {
        body: {
          email: adminEmail,
          password: adminPassword,
        },
        method: "POST",
      }
    )

    expect(authResponse.status).toBe(200)
    expect(authResponse.data.token).toBeTypeOf("string")

    const title = `CI Publishable Key ${Date.now()}`
    const { token } = authResponse.data

    const createResponse = await requestJson<PublishableKeyResponse>(
      backendUrl,
      "/admin/provisioning/publishable-key",
      {
        body: { title },
        method: "POST",
        token,
      }
    )

    expect(createResponse.status).toBe(200)
    expect(createResponse.data).toStrictEqual({
      api_key: expect.objectContaining({
        title,
        token: expect.any(String),
        type: "publishable",
      }),
      created: true,
    })

    const secondCreateResponse = await requestJson<PublishableKeyResponse>(
      backendUrl,
      "/admin/provisioning/publishable-key",
      {
        body: { title },
        method: "POST",
        token,
      }
    )

    expect(secondCreateResponse.status).toBe(200)
    expect(secondCreateResponse.data).toStrictEqual({
      api_key: expect.objectContaining({
        id: createResponse.data.api_key?.id,
        title,
        token: createResponse.data.api_key?.token,
        type: "publishable",
      }),
      created: false,
    })

    const getResponse = await requestJson<PublishableKeyResponse>(
      backendUrl,
      `/admin/provisioning/publishable-key?title=${encodeURIComponent(title)}`,
      { token }
    )

    expect(getResponse.status).toBe(200)
    expect(getResponse.data).toStrictEqual({
      api_key: expect.objectContaining({
        id: createResponse.data.api_key?.id,
        title,
        token: createResponse.data.api_key?.token,
        type: "publishable",
      }),
      created: false,
    })
  })
})

vi.setConfig({ testTimeout: 60 * 1000 })
