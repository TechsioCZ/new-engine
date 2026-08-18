import JSZip from "jszip"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: {
    QUERY: "query",
  },
  MedusaError: class MedusaError extends Error {
    static Types = {
      INVALID_DATA: "invalid_data",
      NOT_FOUND: "not_found",
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
    const { POST } = await import(
      "../../../../../../../src/api/admin/order-expedition/pdf/route"
    )
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
    const { POST } = await import(
      "../../../../../../../src/api/admin/order-expedition/pdf/route"
    )
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
        "Content-Disposition": 'attachment; filename="objednavka-1001.pdf"',
        "Content-Type": "application/pdf",
      })
    )
    expect(res.send).toHaveBeenCalledWith(Buffer.from([1, 2, 3]))
    expect(mockDrawText).toHaveBeenCalled()
  })

  it("returns separately named PDFs in one ZIP archive", async () => {
    const { POST } = await import(
      "../../../../../../../src/api/admin/order-expedition/pdf/route"
    )
    const graph = vi.fn().mockResolvedValue({
      data: [
        {
          id: "order_1",
          display_id: 1001,
          items: [{ quantity: 1, title: "Tea" }],
          status: "pending",
        },
        {
          id: "order_2",
          display_id: 1002,
          items: [{ quantity: 1, title: "Coffee" }],
          status: "pending",
        },
      ],
    })
    const req = createMockRequest(
      {
        mode: "separate",
        order_ids: ["order_1", "order_2"],
      },
      graph
    )
    const res = createMockResponse()

    await POST(req, res)

    expect(res.set).toHaveBeenCalledWith(
      expect.objectContaining({
        "Content-Disposition":
          'attachment; filename="objednavky-1001-1002-2.zip"',
        "Content-Type": "application/zip",
      })
    )
    expect(mockSave).toHaveBeenCalledTimes(2)

    const buffer = res.send.mock.calls[0]?.[0]

    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError("Expected the PDF route to send a ZIP buffer")
    }

    const archive = await JSZip.loadAsync(buffer)

    expect(Object.keys(archive.files)).toEqual([
      "objednavka-1001.pdf",
      "objednavka-1002.pdf",
    ])
    await expect(
      archive.file("objednavka-1001.pdf")?.async("nodebuffer")
    ).resolves.toEqual(Buffer.from([1, 2, 3]))
    await expect(
      archive.file("objednavka-1002.pdf")?.async("nodebuffer")
    ).resolves.toEqual(Buffer.from([1, 2, 3]))
  })

  it("preserves Unicode text and the order currency symbol", async () => {
    const { POST } = await import(
      "../../../../../../../src/api/admin/order-expedition/pdf/route"
    )
    const graph = vi.fn().mockResolvedValue({
      data: [
        {
          id: "order_1",
          display_id: 1001,
          currency_code: "eur",
          customer: { first_name: "Łukasz", last_name: "Őster 😀" },
          items: [{ quantity: 2, title: "Káva Łódź 😀", unit_price: 8.99 }],
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

    expect(drawnTexts.some((text) => text.includes("Łukasz Őster 😀"))).toBe(
      true
    )
    expect(drawnTexts.some((text) => text.includes("Dlouhá - ulice"))).toBe(
      true
    )
    expect(drawnTexts.some((text) => text.includes("Káva Łódź 😀"))).toBe(true)
    expect(drawnTexts.some((text) => text.includes("8,99 €"))).toBe(true)
    expect(drawnTexts.some((text) => text.includes("2 ks"))).toBe(true)
  })
})
