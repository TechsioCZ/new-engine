import { describe, expect, it } from "vitest"
import {
  getItemQuantity,
  getItemSubtotal,
  getItemUnitPrice,
  getShippingSubtotalTotal,
  getTaxTotal,
  getTotal,
} from "../../../../../src/modules/order-receipt/helpers"
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
  it("derives detail unit price line subtotal when subtotal is absent", () => {
    const item = {
      detail: {
        raw_quantity: { value: "2", precision: 20 },
        raw_unit_price: { value: "1652.06612", precision: 20 },
      },
      title: "Pánská mikina Capita SKULL HOODIE",
    }

    expect(getItemQuantity(item)).toBe(2)
    expect(getItemSubtotal(item)).toBeCloseTo(3304.132_24)
  })

  it("keeps discounted line subtotal when it differs from unit price", () => {
    expect(
      getItemSubtotal({
        quantity: 2,
        subtotal: 160,
        unit_price: 100,
      })
    ).toBe(160)
  })

  it("keeps discounted multi-quantity line subtotal equal to unit price", () => {
    expect(
      getItemSubtotal({
        quantity: 2,
        subtotal: 100,
        unit_price: 100,
      })
    ).toBe(100)
  })

  it("keeps tax-exclusive item prices as net amounts", () => {
    const item = {
      is_tax_inclusive: false,
      quantity: 1,
      subtotal: 100,
      tax_lines: [{ rate: 21 }],
      unit_price: 100,
    }

    expect(getItemUnitPrice(item)).toBe(100)
    expect(getItemSubtotal(item)).toBe(100)
  })

  it("converts tax-inclusive item prices to net amounts", () => {
    const item = {
      is_tax_inclusive: true,
      quantity: 1,
      subtotal: 121,
      tax_lines: [{ rate: 21 }],
      unit_price: 121,
    }

    expect(getItemUnitPrice(item)).toBe(100)
    expect(getItemSubtotal(item)).toBe(100)
  })

  it("derives discounted tax totals from the current order total", () => {
    expect(
      getTaxTotal({
        discount_total: 10,
        id: "order_discounted",
        items: [
          {
            is_tax_inclusive: false,
            quantity: 1,
            subtotal: 100,
            tax_lines: [{ rate: 21 }],
          },
        ],
        shipping_methods: [
          {
            amount: 20,
            is_tax_inclusive: false,
            tax_lines: [{ rate: 0 }],
          },
        ],
        summary: {
          current_order_total: 131,
        },
      })
    ).toBe(21)
  })

  it("clamps derived tax totals at zero", () => {
    expect(
      getTaxTotal({
        id: "order_rounding",
        items: [
          {
            is_tax_inclusive: false,
            quantity: 1,
            subtotal: 20,
            tax_lines: [{ rate: 21 }],
          },
        ],
        summary: {
          current_order_total: 10,
        },
      })
    ).toBe(0)
  })

  it("keeps receipt total aligned with QR/manual payment amount", () => {
    const order = {
      currency_code: "EUR",
      id: "order_total",
      items: [
        {
          is_tax_inclusive: true,
          quantity: 2,
          subtotal: 16.98,
          tax_lines: [{ rate: 0 }],
        },
      ],
      shipping_methods: [
        {
          amount: 10,
          is_tax_inclusive: true,
          tax_lines: [{ rate: 23 }],
        },
      ],
      summary: {
        current_order_total: 26.98,
      },
    }

    const item = order.items.at(0)
    if (!item) {
      throw new Error("Expected receipt test order to include an item")
    }

    const subtotal = getItemSubtotal(item)
    const shipping = getShippingSubtotalTotal(order)
    const tax = getTaxTotal(order)

    expect(getTotal(order)).toBe(26.98)
    expect(subtotal + shipping + tax).toBeCloseTo(26.98)
  })

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
