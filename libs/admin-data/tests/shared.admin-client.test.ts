import { vi } from "vitest"
import {
  type AdminDataFetch,
  createFetchAdminDataClient,
  createMedusaSdkAdminDataClient,
} from "../src/shared/admin-client"
import type { AdminApiError } from "../src/shared/error-utils"

describe("admin data client", () => {
  it("treats 204 JSON responses as undefined and injects bearer tokens", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(null, { status: 204 })
    ) as unknown as AdminDataFetch
    const client = createFetchAdminDataClient({
      baseUrl: "https://admin.example/",
      fetch: fetchImpl,
      getToken: () => "token_123",
    })

    await expect(
      client.fetchJson("/admin/orders/ord_1", { method: "DELETE" })
    ).resolves.toBeUndefined()

    const init = vi.mocked(fetchImpl).mock.calls[0]?.[1]

    expect(init?.method).toBe("DELETE")
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer token_123"
    )
  })

  it("preserves parsed error payloads on raw fetch failures", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            blocked_orders: [{ id: "ord_1" }],
            message: "Order is blocked",
          }),
          {
            headers: { "content-type": "application/json" },
            status: 400,
          }
        )
    ) as unknown as AdminDataFetch
    const client = createFetchAdminDataClient({
      baseUrl: "https://admin.example",
      fetch: fetchImpl,
    })

    await expect(
      client.fetchJson("/admin/order-expedition/status")
    ).rejects.toMatchObject({
      message: "Order is blocked",
      payload: {
        blocked_orders: [{ id: "ord_1" }],
        message: "Order is blocked",
      },
      status: 400,
    } satisfies Partial<AdminApiError>)
  })

  it("can request raw SDK responses for text and blob transports", async () => {
    const sdkFetch = vi.fn(async () => new Response("pdf-body"))
    const client = createMedusaSdkAdminDataClient({
      client: {
        fetch: sdkFetch,
      },
    })

    await expect(client.fetchText("/admin/order-expedition/pdf")).resolves.toBe(
      "pdf-body"
    )

    expect(sdkFetch).toHaveBeenCalledWith(
      "/admin/order-expedition/pdf",
      expect.objectContaining({
        headers: expect.objectContaining({ accept: null }),
      })
    )
  })
})
