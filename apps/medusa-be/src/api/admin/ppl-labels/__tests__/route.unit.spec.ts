import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { afterEach, describe, expect, it, vi } from "vitest"

const createOrder = (id: string, displayId: number) => ({
  display_id: displayId,
  fulfillments: [
    {
      canceled_at: null,
      data: {
        label_url: `https://files.example.test/storage/${id}.png`,
        shipment_number: `PPL-${displayId}`,
        status: "completed",
      },
      id: `ful_${id}`,
      provider_id: "ppl_ppl",
    },
  ],
  id,
})

describe("POST /admin/ppl-labels", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("queries every selected order and refuses redirects when downloading stored labels", async () => {
    const orderIds = ["order_1", "order_2"]
    const graph = vi.fn().mockResolvedValue({
      data: orderIds.map((id, index) => createOrder(id, index + 1)),
    })
    const fetchMock = vi.fn().mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(Uint8Array.from([1, 2, 3]).buffer),
      headers: { get: vi.fn(() => "image/png") },
      ok: true,
    })
    const response = {
      send: vi.fn(),
      set: vi.fn(),
    }

    vi.stubEnv("FEATURE_PPL_ENABLED", "0")
    vi.stubEnv("MINIO_FILE_URL", "https://files.example.test/storage")
    vi.stubGlobal("fetch", fetchMock)

    const { POST } = await import("../route")

    await POST(
      {
        scope: {
          resolve: vi.fn((key: string) => {
            if (key === ContainerRegistrationKeys.QUERY) {
              return { graph }
            }

            throw new Error(`Unexpected dependency: ${key}`)
          }),
        },
        validatedBody: { order_ids: orderIds },
      } as never,
      response as never
    )

    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { id: orderIds },
        pagination: { skip: 0, take: orderIds.length },
      })
    )
    expect(fetchMock).toHaveBeenCalledTimes(orderIds.length)

    for (const id of orderIds) {
      expect(fetchMock).toHaveBeenCalledWith(
        `https://files.example.test/storage/${id}.png`,
        expect.objectContaining({
          redirect: "error",
          signal: expect.any(AbortSignal),
        })
      )
    }
  })
})
