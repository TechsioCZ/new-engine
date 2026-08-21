import { beforeEach, describe, expect, it, vi } from "vitest"

const run = vi.hoisted(() => vi.fn())
const sendOrderReceiptWorkflow = vi.hoisted(() => vi.fn(() => ({ run })))

vi.mock("../../../../src/workflows/send-order-receipt", () => ({
  sendOrderReceiptWorkflow,
}))

describe("order receipt subscriber", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("uses an independent retryable subscriber identity", async () => {
    const { config, default: orderReceiptHandler } = await import(
      "../../../../src/subscribers/order-receipt"
    )
    const logger = { error: vi.fn() }
    const container = { resolve: vi.fn(() => logger) }

    await orderReceiptHandler({
      container,
      event: { data: { id: "order_1" } },
    } as never)

    expect(config).toEqual({
      context: { subscriberId: "order-receipt-delivery" },
      event: "order.placed",
    })
    expect(sendOrderReceiptWorkflow).toHaveBeenCalledWith(container)
    expect(run).toHaveBeenCalledWith({ input: { order_id: "order_1" } })
    expect(logger.error).not.toHaveBeenCalled()
  })

  it("logs a PII-free retry signal and propagates delivery failure", async () => {
    const providerFailure = new Error(
      "secret-key customer@example.test provider body"
    )
    run.mockRejectedValueOnce(providerFailure)
    const { default: orderReceiptHandler } = await import(
      "../../../../src/subscribers/order-receipt"
    )
    const logger = { error: vi.fn() }

    await expect(
      orderReceiptHandler({
        container: { resolve: vi.fn(() => logger) },
        event: { data: { id: "order_1" } },
      } as never)
    ).rejects.toBe(providerFailure)

    expect(logger.error).toHaveBeenCalledWith(
      "Order receipt delivery failed for order order_1; event-bus retry requested."
    )
    const logged = String(logger.error.mock.calls[0]?.[0])
    expect(logged).not.toContain("secret-key")
    expect(logged).not.toContain("customer@example.test")
    expect(logged).not.toContain("provider body")
  })
})
