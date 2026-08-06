import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

import {
  assertOk,
  authenticateAdmin,
  createClient,
  requestJson,
} from "./client"

const baseUrl = "http://medusa.test"
const valueResponseSchema = z.object({ value: z.string() })

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>

describe("HTTP JSON client", () => {
  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  describe("request JSON responses", () => {
    it("decodes a valid JSON object with the supplied schema", async () => {
      fetchMock.mockResolvedValue(
        new Response('{"ignored":true,"value":"accepted"}', { status: 200 }),
      )

      const response = await requestJson(baseUrl, "/values", {
        decoder: valueResponseSchema,
      })

      expect(response).toStrictEqual({
        data: { value: "accepted" },
        status: 200,
      })
    })

    it("uses an empty object for an empty generic response body", async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

      await expect(requestJson(baseUrl, "/empty")).resolves.toStrictEqual({
        data: {},
        status: 204,
      })
    })

    it("rejects malformed JSON with request context", async () => {
      fetchMock.mockResolvedValue(new Response("{", { status: 200 }))

      await expect(requestJson(baseUrl, "/malformed")).rejects.toThrow(
        "Response contained malformed JSON for GET /malformed (HTTP 200)",
      )
    })

    it("rejects a payload that fails its decoder with request context", async () => {
      fetchMock.mockResolvedValue(new Response('{"value":42}', { status: 200 }))

      await expect(
        requestJson(baseUrl, "/values", { decoder: valueResponseSchema }),
      ).rejects.toThrow(
        "Response payload validation failed for GET /values (HTTP 200)",
      )
    })
  })

  describe("API client responses", () => {
    it("preserves the non-200 assertOk error before success decoding", async () => {
      fetchMock.mockResolvedValue(
        new Response('{"type":"unauthorized"}', { status: 401 }),
      )
      const client = createClient(baseUrl, {})

      await expect(client.get("/private", valueResponseSchema)).rejects.toThrow(
        'Expected HTTP 200, received 401: {"type":"unauthorized"}',
      )
    })

    it("keeps assertOk usable with a decoded response", () => {
      expect(assertOk({ data: { value: "ok" }, status: 200 })).toStrictEqual({
        value: "ok",
      })
    })
  })

  describe("admin authentication", () => {
    beforeEach(() => {
      vi.stubEnv("MEDUSA_E2E_ADMIN_EMAIL", "admin@example.test")
      vi.stubEnv("MEDUSA_E2E_ADMIN_PASSWORD", "not-a-secret")
    })

    it("uses a validated token for subsequent admin requests", async () => {
      fetchMock
        .mockResolvedValueOnce(
          new Response('{"token":"validated-token"}', { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response('{"value":"authorized"}', { status: 200 }),
        )

      const admin = await authenticateAdmin(baseUrl)

      await expect(
        admin.get("/admin/check", valueResponseSchema),
      ).resolves.toStrictEqual({ value: "authorized" })
      expect(fetchMock).toHaveBeenNthCalledWith(2, `${baseUrl}/admin/check`, {
        headers: { authorization: "Bearer validated-token" },
        method: "GET",
      })
    })

    it("fails with the stable authentication error on a rejected status", async () => {
      fetchMock.mockResolvedValue(
        new Response('{"type":"unauthorized"}', { status: 401 }),
      )

      await expect(authenticateAdmin(baseUrl)).rejects.toThrow(
        "Admin authentication failed",
      )
    })
  })
})
