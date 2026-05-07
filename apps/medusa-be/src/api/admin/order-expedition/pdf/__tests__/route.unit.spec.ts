import { beforeEach, describe, expect, it, vi } from "vitest"

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

const { mockAddPage, mockDrawText, mockEmbedFont, mockSave } = vi.hoisted(
  () => {
    const drawText = vi.fn()

    return {
      mockAddPage: vi.fn(() => ({
        drawText,
      })),
      mockDrawText: drawText,
      mockEmbedFont: vi.fn().mockResolvedValue({
        widthOfTextAtSize: (text: string) => text.length,
      }),
      mockSave: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    }
  }
)

vi.mock("pdf-lib", () => ({
  PageSizes: {
    A4: [595.28, 841.89],
  },
  PDFDocument: {
    create: vi.fn().mockResolvedValue({
      addPage: mockAddPage,
      embedFont: mockEmbedFont,
      save: mockSave,
    }),
  },
  rgb: vi.fn(() => ({})),
  StandardFonts: {
    Helvetica: "Helvetica",
    HelveticaBold: "HelveticaBold",
  },
}))

const createMockResponse = () => ({
  send: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
})

const createMockRequest = (
  validatedBody: Record<string, unknown>,
  graph: ReturnType<typeof vi.fn>
) => ({
  scope: {
    resolve: vi.fn(() => ({ graph })),
  },
  validatedBody,
})

describe("POST /admin/order-expedition/pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSave.mockResolvedValue(new Uint8Array([1, 2, 3]))
  })

  it("fails before generating a PDF when any selected order is missing", async () => {
    const { POST } = await import("../route")
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
    const { POST } = await import("../route")
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
})
