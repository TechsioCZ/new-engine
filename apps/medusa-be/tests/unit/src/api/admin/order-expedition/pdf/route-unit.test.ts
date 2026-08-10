import { beforeEach, describe, expect, it, vi } from "vitest"

import type { PostAdminOrderExpeditionPdfSchemaType } from "../../../../../../../src/api/admin/order-expedition/validators"

const { overrideModule } = vi.hoisted(() => ({
  overrideModule: <Module extends object>(
    original: Module,
    replacements: object,
  ): Module =>
    Object.defineProperties(
      { ...original },
      Object.getOwnPropertyDescriptors(replacements),
    ),
}))

vi.mock(import("@medusajs/framework/utils"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    ContainerRegistrationKeys: {
      QUERY: "query",
    },
    MedusaError: class MedusaError extends Error {
      static readonly Types = {
        INVALID_DATA: "invalid_data",
      }

      constructor(_type: string, message: string) {
        super(message)
        this.name = "MedusaError"
      }
    },
  }),
)

const { mockAddPage, mockDrawText, mockEmbedFont, mockPage, mockSave } =
  vi.hoisted(() => {
    const drawText = vi.fn<(text: string, options?: unknown) => void>()
    const page = {
      drawImage: vi.fn<(...args: unknown[]) => void>(),
      drawLine: vi.fn<(...args: unknown[]) => void>(),
      drawRectangle: vi.fn<(...args: unknown[]) => void>(),
      drawText,
    }

    return {
      mockAddPage: vi.fn<() => typeof page>(() => page),
      mockDrawText: drawText,
      mockEmbedFont: vi
        .fn<() => Promise<{ widthOfTextAtSize: (text: string) => number }>>()
        .mockResolvedValue({
          widthOfTextAtSize: (text: string) => text.length,
        }),
      mockPage: page,
      mockSave: vi
        .fn<() => Promise<Uint8Array>>()
        .mockResolvedValue(new Uint8Array([1, 2, 3])),
    }
  })

vi.mock(import("pdf-lib"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    PDFDocument: {
      create: vi.fn<() => Promise<unknown>>().mockResolvedValue({
        addPage: mockAddPage,
        embedFont: mockEmbedFont,
        getPageCount: vi.fn<() => number>(() => 1),
        getPages: vi.fn<() => (typeof mockPage)[]>(() => [mockPage]),
        registerFontkit: vi.fn<(...args: unknown[]) => void>(),
        save: mockSave,
      }),
    },
    PageSizes: {
      A4: [595.28, 841.89],
    },
    StandardFonts: {
      Helvetica: "Helvetica",
      HelveticaBold: "HelveticaBold",
    },
    rgb: vi.fn<(...args: number[]) => Record<string, never>>(() => ({})),
  }),
)

const PRINTABLE_ASCII_REGEX = /^[\u0020-\u007E]*$/u

type Graph = () => Promise<unknown>
interface MockPdfResponse {
  send: ReturnType<typeof vi.fn<(body: Buffer) => void>>
  set: ReturnType<
    typeof vi.fn<(headers: Record<string, string | number>) => void>
  >
}

const createMockResponse = (): MockPdfResponse => ({
  send: vi.fn<(body: Buffer) => void>(),
  set: vi.fn<(headers: Record<string, string | number>) => void>(),
})

const createQuery = (graph: ReturnType<typeof vi.fn<Graph>>) => ({ graph })

describe("POST /admin/order-expedition/pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSave.mockResolvedValue(new Uint8Array([1, 2, 3]))
  })

  it("fails before generating a PDF when any selected order is missing", async () => {
    const { postOrderExpeditionPdf } =
      await import("../../../../../../../src/api/admin/order-expedition/pdf/route")
    const graph = vi.fn<Graph>().mockResolvedValue({
      data: [{ display_id: 1001, id: "order_1" }],
    })
    const validatedBody: PostAdminOrderExpeditionPdfSchemaType = {
      order_ids: ["order_1", "order_missing"],
    }
    const res = createMockResponse()

    await expect(
      postOrderExpeditionPdf(
        createQuery(graph),
        validatedBody,
        "http://localhost/admin/order-expedition/pdf",
        res,
      ),
    ).rejects.toThrow("Orders not found: order_missing")
    expect(mockSave).not.toHaveBeenCalled()
    expect(res.send).not.toHaveBeenCalled()
  })

  it("generates one PDF for exactly the selected orders", async () => {
    const { postOrderExpeditionPdf } =
      await import("../../../../../../../src/api/admin/order-expedition/pdf/route")
    const graph = vi.fn<Graph>().mockResolvedValue({
      data: [
        {
          customer: { first_name: "Jana", last_name: "Novakova" },
          display_id: 1001,
          id: "order_1",
          items: [{ quantity: 1, title: "Tea" }],
          shipping_methods: [{ name: "PPL" }],
          status: "pending",
        },
      ],
    })
    const validatedBody: PostAdminOrderExpeditionPdfSchemaType = {
      order_ids: ["order_1"],
    }
    const res = createMockResponse()

    await postOrderExpeditionPdf(
      createQuery(graph),
      validatedBody,
      "http://localhost/admin/order-expedition/pdf",
      res,
    )

    expect(res.set).toHaveBeenCalledWith(
      expect.objectContaining({
        "Content-Disposition": 'attachment; filename="expedition-1001.pdf"',
        "Content-Type": "application/pdf",
      }),
    )
    expect(res.send).toHaveBeenCalledWith(Buffer.from([1, 2, 3]))
    expect(
      mockDrawText.mock.calls.some(([text]) => text === "Tea"),
    ).toBeTruthy()
  })

  it("replaces unsupported Helvetica characters before drawing text", async () => {
    const { postOrderExpeditionPdf } =
      await import("../../../../../../../src/api/admin/order-expedition/pdf/route")
    const graph = vi.fn<Graph>().mockResolvedValue({
      data: [
        {
          customer: { first_name: "Łukasz", last_name: "Őster 😀" },
          display_id: 1001,
          id: "order_1",
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
    const validatedBody: PostAdminOrderExpeditionPdfSchemaType = {
      order_ids: ["order_1"],
    }
    const res = createMockResponse()

    await postOrderExpeditionPdf(
      createQuery(graph),
      validatedBody,
      "http://localhost/admin/order-expedition/pdf",
      res,
    )

    const drawnTexts = mockDrawText.mock.calls.map(([text]) => text)

    expect(
      drawnTexts.some((text) => text.includes("Lukasz Oster ?")),
    ).toBeTruthy()
    expect(
      drawnTexts.some((text) => text.includes("Dlouha - ulice")),
    ).toBeTruthy()
    expect(drawnTexts.some((text) => text.includes("Kava Lodz ?"))).toBeTruthy()
    expect(drawnTexts.some((text) => text.includes("2 ks"))).toBeTruthy()
    expect(
      drawnTexts.every((text) => PRINTABLE_ASCII_REGEX.test(text)),
    ).toBeTruthy()
  })
})
