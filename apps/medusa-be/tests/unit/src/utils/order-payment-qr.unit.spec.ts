import { describe, expect, it } from "vitest"
import {
  ORDER_PAYMENT_QR_METADATA_KEY,
  OrderPaymentQr,
} from "../../../../src/utils/order-payment-qr"

describe("order payment QR", () => {
  const orderPaymentQr = new OrderPaymentQr()

  it("builds a one-time SPAYD payment string from order totals", () => {
    expect(
      orderPaymentQr.buildSpayd(
        {
          currency_code: "czk",
          display_id: 12_345,
          id: "order_123",
          total: 555.5,
        },
        "CZ3301000000000002970297"
      )
    ).toBe(
      "SPD*1.0*ACC:CZ3301000000000002970297*AM:555.50*CC:CZK*MSG:OBJEDNAVKA 12345*X-VS:12345"
    )
  })

  it("uses numeric custom display id as variable symbol", () => {
    expect(
      orderPaymentQr.buildSpayd(
        {
          currency_code: "CZK",
          custom_display_id: "ORDER-2026-0001",
          display_id: 12_345,
          id: "order_123",
          total: "1000",
        },
        "CZ33 0100 0000 0000 0297 0297"
      )
    ).toContain("*X-VS:20260001")
  })

  it("merges generated SPAYD string into existing metadata", () => {
    expect(
      orderPaymentQr.buildMetadata(
        { source: "checkout" },
        {
          currency_code: "CZK",
          display_id: 987,
          id: "order_987",
          total: 42,
        },
        "CZ3301000000000002970297"
      )
    ).toEqual({
      source: "checkout",
      [ORDER_PAYMENT_QR_METADATA_KEY]:
        "SPD*1.0*ACC:CZ3301000000000002970297*AM:42.00*CC:CZK*MSG:OBJEDNAVKA 987*X-VS:987",
    })
  })

  it("matches the official Czech generator shape for domestic accounts", () => {
    expect(
      orderPaymentQr.buildSpayd(
        {
          currency_code: "CZK",
          display_id: 23,
          id: "order_23",
          total: 578,
        },
        "CZ9608000000005444195083"
      )
    ).toBe(
      "SPD*1.0*ACC:CZ9608000000005444195083*AM:578.00*CC:CZK*MSG:OBJEDNAVKA 23*X-VS:23"
    )
  })

  it("formats Medusa BigNumber-like totals", () => {
    expect(
      orderPaymentQr.buildSpayd(
        {
          currency_code: "CZK",
          display_id: 24,
          id: "order_24",
          total: {
            valueOf: () => "1109.90909",
          },
        },
        "CZ9608000000005444195083"
      )
    ).toContain("*AM:1109.91*")
  })

  it("falls back to CZK when currency code is empty", () => {
    expect(
      orderPaymentQr.buildSpayd(
        {
          currency_code: "  ",
          display_id: 23,
          id: "order_23",
          total: 578,
        },
        "CZ9608000000005444195083"
      )
    ).toContain("*CC:CZK*")
  })

  it("leaves metadata unchanged when IBAN is not configured", () => {
    const metadata = { source: "checkout" }

    expect(
      orderPaymentQr.buildMetadata(
        metadata,
        {
          currency_code: "CZK",
          display_id: 987,
          id: "order_987",
          total: 42,
        },
        undefined
      )
    ).toBe(metadata)
  })

  it("builds PDF drawing commands from a SPAYD string", () => {
    const commands = orderPaymentQr.buildPdfCommands(
      "SPD*1.0*ACC:CZ3301000000000002970297*AM:42.00*CC:CZK",
      { size: 86, x: 445, y: 684 }
    )

    expect(commands.length).toBeGreaterThan(1)
    expect(commands[0]).toBe("q 1 1 1 rg 445.00 684.00 86.00 86.00 re f Q")
    expect(commands.some((command) => command.endsWith(" re f Q"))).toBe(true)
  })
})
