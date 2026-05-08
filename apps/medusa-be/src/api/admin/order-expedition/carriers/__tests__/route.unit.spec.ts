import { describe, expect, it, vi } from "vitest"

const createMockResponse = () => ({
  json: vi.fn().mockReturnThis(),
})

describe("GET /admin/order-expedition/carriers", () => {
  it("returns supported carrier options", async () => {
    const { GET } = await import("../route")
    const res = createMockResponse()

    await GET({} as never, res as never)

    expect(res.json).toHaveBeenCalledWith({
      carriers: [
        { label: "PPL", value: "ppl" },
        { label: "Packeta", value: "packeta" },
        { label: "Other", value: "other" },
      ],
    })
  })
})
