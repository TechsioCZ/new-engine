import { describe, expect, it, vi } from "vitest"
import { QR_PAYMENT_MODULE } from "../constants"
import { QrManualPaymentProvider } from "../services/manual"

const PNG_DATA_URL_PATTERN = /^data:image\/png;base64,/

describe("QrManualPaymentProvider", () => {
  it("generates SPAYD and QR image data for a payment session", async () => {
    const getIban = vi.fn().mockResolvedValue("CZ65 0800 0000 1920 0014 5399")
    const provider = new QrManualPaymentProvider({
      [QR_PAYMENT_MODULE]: { getIban },
    })

    const result = await provider.initiatePayment({
      amount: 1234.5,
      currency_code: "czk",
      context: {
        idempotency_key: "1234567890",
      },
    })

    expect(result.id).toBe("1234567890")
    expect(result.status).toBe("pending")
    expect(result.data?.payment_qr_spayd).toContain(
      "ACC:CZ6508000000192000145399"
    )
    expect(result.data?.payment_qr_spayd).toContain("AM:1234.50")
    expect(result.data?.payment_qr_spayd).toContain("CC:CZK")
    expect(result.data?.payment_qr_spayd).toContain("X-VS:1234567890")
    expect(result.data?.payment_qr_data_url).toEqual(
      expect.stringMatching(PNG_DATA_URL_PATTERN)
    )
    expect(result.data?.qr_payment).toMatchObject({
      amount: 1234.5,
      currency_code: "CZK",
      iban: "CZ6508000000192000145399",
      reference: "1234567890",
    })
  })

  it("loads IBAN from the qr payment module", async () => {
    const getIban = vi.fn().mockResolvedValue("CZ6508000000192000145399")
    const provider = new QrManualPaymentProvider({
      [QR_PAYMENT_MODULE]: { getIban },
    })

    const result = await provider.initiatePayment({
      amount: 100,
      currency_code: "CZK",
      data: {
        reference: "987654321",
      },
    })

    expect(getIban).toHaveBeenCalled()
    expect(result.data?.payment_qr_spayd).toContain("X-VS:987654321")
  })

  it("authorizes the manual QR payment so checkout can create an order", async () => {
    const provider = new QrManualPaymentProvider({})

    await expect(
      provider.authorizePayment({
        data: {
          payment_qr_spayd: "SPD*1.0",
        },
      })
    ).resolves.toEqual({
      status: "authorized",
      data: {
        payment_qr_spayd: "SPD*1.0",
      },
    })
  })
})
