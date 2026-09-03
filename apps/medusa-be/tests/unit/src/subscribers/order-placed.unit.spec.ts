import { beforeEach, describe, expect, it, vi } from "vitest"

const receiptRun = vi.hoisted(() => vi.fn())
const accountSetupRun = vi.hoisted(() => vi.fn())
const sendOrderReceiptWorkflow = vi.hoisted(() =>
  vi.fn(() => ({ run: receiptRun }))
)
const sendAccountSetupWorkflow = vi.hoisted(() =>
  vi.fn(() => ({ run: accountSetupRun }))
)

vi.mock("../../../../src/workflows/send-order-receipt", () => ({
  sendOrderReceiptWorkflow,
}))

vi.mock("../../../../src/workflows/send-account-setup", () => ({
  sendAccountSetupWorkflow,
}))

vi.mock("../../../../src/workflows/order-note/upsert-order-note", () => ({
  syncOrderNoteWorkflow: vi.fn(),
}))

describe("order placed post-processing subscriber", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("runs account setup without entering the receipt delivery branch", async () => {
    receiptRun.mockRejectedValueOnce(new Error("receipt provider unavailable"))
    const { default: orderPlacedHandler } = await import(
      "../../../../src/subscribers/order-placed"
    )
    const graph = vi.fn().mockResolvedValue({ data: [] })
    const container = {
      resolve: vi.fn((key: string) => {
        if (key === "query") {
          return { graph }
        }

        if (key === "logger") {
          return { error: vi.fn() }
        }

        throw new Error(`Unexpected dependency ${key}`)
      }),
    }

    await orderPlacedHandler({
      container,
      event: { data: { id: "order_1" } },
    } as never)

    expect(sendOrderReceiptWorkflow).not.toHaveBeenCalled()
    expect(receiptRun).not.toHaveBeenCalled()
    expect(sendAccountSetupWorkflow).toHaveBeenCalledWith(container)
    expect(accountSetupRun).toHaveBeenCalledWith({
      input: { order_id: "order_1" },
    })
  })
})
