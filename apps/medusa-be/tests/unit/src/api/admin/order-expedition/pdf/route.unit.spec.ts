import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { PostAdminOrderExpeditionPdfSchemaType } from "../../../../../../../src/api/admin/order-expedition/validators"

vi.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: {
    QUERY: "query",
  },
  MedusaError: class MedusaError extends Error {
    static Types = {
      INVALID_DATA: "invalid_data",
    }

    constructor(_type: string, message: string) {
      super(message)
    }
  },
}))

const { mockAddPage, mockDrawText, mockEmbedFont, mockPage, mockSave } =
  vi.hoisted(() => {
    const drawText = vi.fn()
    const page = {
      drawImage: vi.fn(),
      drawLine: vi.fn(),
      drawRectangle: vi.fn(),
      drawText,
    }

    return {
      mockAddPage: vi.fn(() => page),
      mockPage: page,
      mockDrawText: drawText,
      mockEmbedFont: vi.fn().mockResolvedValue({
        widthOfTextAtSize: (text: string) => text.length,
      }),
      mockSave: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    }
  })

vi.mock("pdf-lib", () => ({
  PageSizes: {
    A4: [595.28, 841.89],
  },
  PDFDocument: {
    create: vi.fn().mockResolvedValue({
      addPage: mockAddPage,
      embedFont: mockEmbedFont,
      getPageCount: vi.fn(() => 1),
      getPages: vi.fn(() => [mockPage]),
      registerFontkit: vi.fn(),
      save: mockSave,
    }),
  },
  rgb: vi.fn(() => ({})),
  StandardFonts: {
    Helvetica: "Helvetica",
    HelveticaBold: "HelveticaBold",
  },
}))

/**
 * Asserts that a plain mock object contains the given keys before narrowing
 * it to a framework type. Building the mock as `unknown` first (instead of
 * the target type) avoids requiring every property of the huge Node
 * request/response interfaces while still validating the shape the route
 * handler actually reads from at runtime.
 */
function assertMockShape<T>(
  candidate: unknown,
  requiredKeys: readonly string[]
): asserts candidate is T {
  if (typeof candidate !== "object" || candidate === null) {
    throw new TypeError("Expected a mock object")
  }

  for (const key of requiredKeys) {
    if (!(key in candidate)) {
      throw new TypeError(`Mock object missing required key: ${key}`)
    }
  }
}

type MockPdfResponse = MedusaResponse & {
  send: ReturnType<typeof vi.fn>
  set: ReturnType<typeof vi.fn>
}

const createMockResponse = (): MockPdfResponse => {
  const candidate: unknown = {
    send: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  }
  assertMockShape<MockPdfResponse>(candidate, ["send", "set"])
  return candidate
}

const createMockRequest = (
  validatedBody: Record<string, unknown>,
  graph: ReturnType<typeof vi.fn>
): MedusaRequest<PostAdminOrderExpeditionPdfSchemaType> => {
  const candidate: unknown = {
    scope: {
      resolve: vi.fn(() => ({ graph })),
    },
    validatedBody,
  }
  assertMockShape<MedusaRequest<PostAdminOrderExpeditionPdfSchemaType>>(
    candidate,
    ["scope", "validatedBody"]
  )
  return candidate
}

describe("POST /admin/order-expedition/pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSave.mockResolvedValue(new Uint8Array([1, 2, 3]))
  })

  it("fails before generating a PDF when any selected order is missing", async () => {
    const { POST } =
      await import("../../../../../../../src/api/admin/order-expedition/pdf/route")
    const graph = vi.fn().mockResolvedValue({
      data: [{ id: "order_1", display_id: 1001 }],
    })
    const req = createMockRequest(
      {
        order_ids: ["order_1", "order_missing"],
      },
      graph
    )
    const res = createMockResponse()

    await expect(POST(req, res)).rejects.toThrow(
      "Orders not found: order_missing"
    )
    expect(mockSave).not.toHaveBeenCalled()
    expect(res.send).not.toHaveBeenCalled()
  })

  it("generates one PDF for exactly the selected orders", async () => {
    const { POST } =
      await import("../../../../../../../src/api/admin/order-expedition/pdf/route")
    const graph = vi.fn().mockResolvedValue({
      data: [
        {
          id: "order_1",
          display_id: 1001,
          customer: { first_name: "Jana", last_name: "Novakova" },
          items: [{ quantity: 1, title: "Tea" }],
          shipping_methods: [{ name: "PPL" }],
          status: "pending",
        },
      ],
    })
    const req = createMockRequest({ order_ids: ["order_1"] }, graph)
    const res = createMockResponse()

    await POST(req, res)

    expect(res.set).toHaveBeenCalledWith(
      expect.objectContaining({
        "Content-Disposition": 'attachment; filename="expedition-1001.pdf"',
        "Content-Type": "application/pdf",
      })
    )
    expect(res.send).toHaveBeenCalledWith(Buffer.from([1, 2, 3]))
    expect(mockDrawText).toHaveBeenCalled()
  })

  it("replaces unsupported Helvetica characters before drawing text", async () => {
    const { POST } =
      await import("../../../../../../../src/api/admin/order-expedition/pdf/route")
    const graph = vi.fn().mockResolvedValue({
      data: [
        {
          id: "order_1",
          display_id: 1001,
          customer: { first_name: "Łukasz", last_name: "Őster 😀" },
          items: [{ quantity: 2, title: "Káva Łódź 😀" }],
          shipping_address: {
            address_1: "Dlouhá — ulice",
            city: "Łódź",
            first_name: "Łukasz",
            last_name: "Őster 😀",
            postal_code: "90-001",
          },
          shipping_methods: [{ name: "PPL" }],
          status: "pending",
        },
      ],
    })
    const req = createMockRequest({ order_ids: ["order_1"] }, graph)
    const res = createMockResponse()

    await POST(req, res)

    const drawnTexts = mockDrawText.mock.calls.map(([text]) => text as string)

    expect(drawnTexts.some((text) => text.includes("Lukasz Oster ?"))).toBe(
      true
    )
    expect(drawnTexts.some((text) => text.includes("Dlouha - ulice"))).toBe(
      true
    )
    expect(drawnTexts.some((text) => text.includes("Kava Lodz ?"))).toBe(true)
    expect(drawnTexts.some((text) => text.includes("2 ks"))).toBe(true)
    expect(
      drawnTexts.every((text) =>
        Array.from(text).every((char) => {
          const code = char.charCodeAt(0)
          return code >= 32 && code <= 126
        })
      )
    ).toBe(true)
  })
})
