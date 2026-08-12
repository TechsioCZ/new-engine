import type { Query } from "@medusajs/framework/types"
import { describe, expect, it, vi } from "vitest"
import { fetchPendingFulfillments } from "../../../jobs/gls-tracking-sync"
import { GLS_PROVIDER_ID } from "../constants"

describe("fetchPendingFulfillments", () => {
  it("continues beyond a full page of terminal records instead of starving live shipments", async () => {
    const failedPage = Array.from({ length: 100 }, (_, index) =>
      fulfillment("failed_".concat(String(index)), true)
    )
    const graph = vi
      .fn()
      .mockResolvedValueOnce({ data: failedPage })
      .mockResolvedValueOnce({ data: [fulfillment("live_1", false)] })

    await expect(
      fetchPendingFulfillments({ graph } as unknown as Query, 25)
    ).resolves.toEqual([fulfillment("live_1", false)])
    expect(graph).toHaveBeenCalledTimes(2)
    expect(graph.mock.calls[1][0].pagination.skip).toBe(100)
    expect(graph.mock.calls[0][0].pagination.order).toEqual({
      shipped_at: "ASC",
      id: "ASC",
    })
  })

  it("ignores malformed records without a configuration id", async () => {
    const malformed = fulfillment("malformed_1", false)
    malformed.data.config_id = " "
    const graph = vi.fn().mockResolvedValue({ data: [malformed] })

    await expect(
      fetchPendingFulfillments({ graph } as unknown as Query, 25)
    ).resolves.toEqual([])
  })
})

function fulfillment(id: string, deliveryFailed: boolean) {
  return {
    id,
    provider_id: GLS_PROVIDER_ID,
    shipped_at: "2026-08-09T00:00:00.000Z",
    delivered_at: null,
    data: {
      status: "completed",
      packet_id: id,
      barcode: "barcode_".concat(id),
      supports_cod: false,
      config_id: "config_testing",
      environment: "testing",
      delivery_failed: deliveryFailed,
    },
  }
}
