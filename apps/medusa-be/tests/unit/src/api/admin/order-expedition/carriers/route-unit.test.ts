import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { isRecord } from "@techsio/std/object"
import { describe, expect, it, vi } from "vitest"

type JsonMock = ReturnType<typeof vi.fn<(body: unknown) => unknown>>
type MockResponse = MedusaResponse & { json: JsonMock }

const assertMockRequest: (
  candidate: unknown,
) => asserts candidate is MedusaRequest = (candidate) => {
  if (!isRecord(candidate)) {
    throw new TypeError("Expected a request mock")
  }
}

const assertMockResponse: (
  candidate: unknown,
) => asserts candidate is MockResponse = (candidate) => {
  if (!isRecord(candidate) || typeof candidate["json"] !== "function") {
    throw new TypeError("Expected a response mock with a json method")
  }
}

const createMockRequest = (): MedusaRequest => {
  const candidate: unknown = {}
  assertMockRequest(candidate)
  return candidate
}

const createMockResponse = (): MockResponse => {
  const candidate: unknown = {
    json: vi.fn<(body: unknown) => unknown>().mockReturnThis(),
  }
  assertMockResponse(candidate)
  return candidate
}

describe("GET /admin/order-expedition/carriers", () => {
  it("returns supported carrier options", async () => {
    const { GET } =
      await import("../../../../../../../src/api/admin/order-expedition/carriers/route")
    const req = createMockRequest()
    const res = createMockResponse()

    GET(req, res)

    expect(res.json).toHaveBeenCalledWith({
      carriers: [
        { label: "GLS", value: "gls" },
        { label: "PPL", value: "ppl" },
        { label: "Packeta", value: "packeta" },
        { label: "Other", value: "other" },
      ],
    })
  })
})
