import { describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { requestJson, resolveRequiredEnv } from "./helpers/client"

const authResponseSchema = z.object({ token: z.string() })
const publishableKeyResponseSchema = z.object({
  api_key: z.object({
    id: z.string(),
    title: z.string(),
    token: z.string(),
    type: z.string(),
  }),
  created: z.boolean(),
})

describe("Admin publishable key endpoint", () => {
  const backendUrl = resolveRequiredEnv("MEDUSA_E2E_BACKEND_URL")
  const adminEmail = resolveRequiredEnv("MEDUSA_E2E_ADMIN_EMAIL")
  const adminPassword = resolveRequiredEnv("MEDUSA_E2E_ADMIN_PASSWORD")

  it("provisions a publishable key and retrieves the same token", async () => {
    const authResponse = await requestJson(backendUrl, "/auth/user/emailpass", {
      body: {
        email: adminEmail,
        password: adminPassword,
      },
      decoder: authResponseSchema,
      method: "POST",
    })

    const authData = authResponse.data
    const title = `CI Publishable Key ${Date.now()}`
    const { token } = authData

    const createResponse = await requestJson(
      backendUrl,
      "/admin/provisioning/publishable-key",
      {
        body: { title },
        decoder: publishableKeyResponseSchema,
        method: "POST",
        token,
      },
    )

    const createData = createResponse.data

    const secondCreateResponse = await requestJson(
      backendUrl,
      "/admin/provisioning/publishable-key",
      {
        body: { title },
        decoder: publishableKeyResponseSchema,
        method: "POST",
        token,
      },
    )

    const secondCreateData = secondCreateResponse.data

    const getResponse = await requestJson(
      backendUrl,
      `/admin/provisioning/publishable-key?title=${encodeURIComponent(title)}`,
      { decoder: publishableKeyResponseSchema, token },
    )

    const getData = getResponse.data

    expect({
      created: createData.created,
      createdKey: createData.api_key,
      retrieved: getData,
      secondCreation: secondCreateData,
      statuses: [
        authResponse.status,
        createResponse.status,
        secondCreateResponse.status,
        getResponse.status,
      ],
    }).toStrictEqual({
      created: true,
      createdKey: {
        id: createData.api_key.id,
        title,
        token: createData.api_key.token,
        type: "publishable",
      },
      retrieved: {
        api_key: createData.api_key,
        created: false,
      },
      secondCreation: {
        api_key: createData.api_key,
        created: false,
      },
      statuses: [200, 200, 200, 200],
    })
  })
})

vi.setConfig({ testTimeout: 60 * 1000 })
