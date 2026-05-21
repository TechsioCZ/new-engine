import { describe, expect, it } from "vitest"
import OrderReceiptModuleService from "../../../../../src/modules/order-receipt/service"
import { QR_PAYMENT_MEDUSA_PROVIDER_ID } from "../../../../../src/modules/payment-qr/constants"

const baseOrder = {
  created_at: "2026-05-19T08:00:00.000Z",
  currency_code: "CZK",
  display_id: 1234,
  email: "customer@example.test",
  id: "order_123",
  items: [
    {
      quantity: 1,
      subtotal: 100,
      tax_total: 21,
      title: "Test product",
      total: 121,
      unit_price: 100,
    },
  ],
  subtotal: 100,
  tax_total: 21,
  total: 121,
}

const qrPaymentCollections = [
  {
    payments: [
      {
        data: {
          payment_qr_spayd:
            "SPD*1.0*ACC:CZ3301000000000002970297*AM:121.00*CC:CZK*MSG:OBJEDNAVKA 1234*X-VS:1234",
        },
        provider_id: QR_PAYMENT_MEDUSA_PROVIDER_ID,
      },
    ],
  },
]

describe("order receipt service", () => {
  it("renders payment QR commands when SPAYD payment data is present for a QR payment", async () => {
    const service = new OrderReceiptModuleService()

    const withoutQr = await service.generateOrderReceiptAttachment(baseOrder)
    const withQr = await service.generateOrderReceiptAttachment({
      ...baseOrder,
      payment_collections: qrPaymentCollections,
    })

    expect(withQr.content.length).toBeGreaterThan(withoutQr.content.length)
    expect(withQr.content.toString("utf8")).toContain("64.00 606.00")
    expect(withQr.content.toString("utf8")).toContain(" re f Q")
  })

  it("does not render payment QR commands for a non-QR payment", async () => {
    const service = new OrderReceiptModuleService()

    const withoutQr = await service.generateOrderReceiptAttachment(baseOrder)
    const withNonQrPayment = await service.generateOrderReceiptAttachment({
      ...baseOrder,
      payment_collections: [
        {
          payments: [
            {
              data: {
                payment_qr_spayd:
                  "SPD*1.0*ACC:CZ3301000000000002970297*AM:121.00*CC:CZK",
              },
              provider_id: "pp_paykit_comgate",
            },
          ],
        },
      ],
    })

    expect(withNonQrPayment.content.length).toBe(withoutQr.content.length)
    expect(withNonQrPayment.content.toString("utf8")).not.toContain(
      "64.00 606.00"
    )
  })

  it("does not render payment QR commands for the system default payment", async () => {
    const service = new OrderReceiptModuleService()

    const withoutQr = await service.generateOrderReceiptAttachment(baseOrder)
    const withSystemPayment = await service.generateOrderReceiptAttachment({
      ...baseOrder,
      payment_collections: [
        {
          payments: [
            {
              data: {
                payment_qr_spayd:
                  "SPD*1.0*ACC:CZ3301000000000002970297*AM:121.00*CC:CZK",
              },
              provider_id: "pp_system_default",
            },
          ],
        },
      ],
    })

    expect(withSystemPayment.content.length).toBe(withoutQr.content.length)
    expect(withSystemPayment.content.toString("utf8")).not.toContain(
      "64.00 606.00"
    )
  })
})
