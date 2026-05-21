import { describe, expect, it, vi } from "vitest"
import { requestJson, resolveRequiredEnv } from "./helpers/client"

type AuthResponse = {
  token: string
}

type PublishableKeyResponse = {
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
        method: "POST",
        body: {
          email: adminEmail,
          password: adminPassword,
        },
      }
    )

    expect(authResponse.status).toBe(200)
    expect(typeof authResponse.data.token).toBe("string")

    const title = `CI Publishable Key ${Date.now()}`
    const token = authResponse.data.token

    const createResponse = await requestJson<PublishableKeyResponse>(
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

    const secondCreateResponse = await requestJson<PublishableKeyResponse>(
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

    const getResponse = await requestJson<PublishableKeyResponse>(
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

vi.setConfig({ testTimeout: 60 * 1000 })
