import { describe, expect, it, vi } from "vitest"
import { ORDER_BUSINESS_STATUS_IDS } from "../../../../../../../src/utils/order-business-status"

describe("GET /admin/order-business-statuses/catalog", () => {
  it("returns every assignable status in the canonical order", async () => {
    const { GET } = await import(
      "../../../../../../../src/api/admin/order-business-statuses/catalog/route"
    )
    const res = { json: vi.fn() }

    await GET({} as never, res as never)

    expect(res.json).toHaveBeenCalledWith({
      statuses: ORDER_BUSINESS_STATUS_IDS.map((id) =>
        expect.objectContaining({
          id,
          translation_key: `statuses.${id}`,
        })
      ),
    })
  })
})
