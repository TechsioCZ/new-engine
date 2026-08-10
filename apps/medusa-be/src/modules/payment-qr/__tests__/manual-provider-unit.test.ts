import { getRecordValue, isRecord } from "@techsio/std/object"
import { describe, expect, it, vi } from "vitest"

import { QR_PAYMENT_MODULE } from "../constants"
import { QrPaymentModuleService } from "../service"
import { QrManualPaymentProvider } from "../services/manual"

const PNG_DATA_URL_PATTERN = /^data:image\/png;base64,/u

class MockQrPaymentModuleService extends QrPaymentModuleService {
  readonly #getIban: () => Promise<string | null>

  constructor(getIban: () => Promise<string | null>) {
    super({})
    this.#getIban = getIban
  }

  override async getIban(): Promise<string | null> {
    return await this.#getIban()
  }
}

const createMockQrPaymentModule = (
  getIban: () => Promise<string | null>,
): QrPaymentModuleService => new MockQrPaymentModuleService(getIban)

describe(QrManualPaymentProvider, () => {
  it("generates SPAYD and QR image data for a payment session", async () => {
    const getIban = vi
      .fn<() => Promise<string | null>>()
      .mockResolvedValue("CZ65 0800 0000 1920 0014 5399")
    const provider = new QrManualPaymentProvider({
      [QR_PAYMENT_MODULE]: createMockQrPaymentModule(getIban),
    })

    const result = await provider.initiatePayment({
      amount: 1234.5,
      context: {
        idempotency_key: "1234567890",
      },
      currency_code: "czk",
    })

    expect(result).toMatchObject({
      data: {
        qr_payment: {
          amount: 1234.5,
          currency_code: "CZK",
          iban: "CZ6508000000192000145399",
          reference: "1234567890",
        },
      },
      id: "1234567890",
      status: "pending",
    })
    const spayd = result.data?.["payment_qr_spayd"]
    expect([spayd, spayd, spayd, spayd]).toStrictEqual([
      expect.stringContaining("ACC:CZ6508000000192000145399"),
      expect.stringContaining("AM:1234.50"),
      expect.stringContaining("CC:CZK"),
      expect.stringContaining("X-VS:1234567890"),
    ])
    expect(result.data?.["payment_qr_data_url"]).toStrictEqual(
      expect.stringMatching(PNG_DATA_URL_PATTERN),
    )
  })

  it("loads IBAN from the qr payment module", async () => {
    const getIban = vi
      .fn<() => Promise<string | null>>()
      .mockResolvedValue("CZ6508000000192000145399")
    const provider = new QrManualPaymentProvider({
      [QR_PAYMENT_MODULE]: createMockQrPaymentModule(getIban),
    })

    const result = await provider.initiatePayment({
      amount: 100,
      currency_code: "CZK",
      data: {
        reference: "987654321",
      },
    })

    expect(getIban).toHaveBeenCalledWith()
    expect(result.data?.["payment_qr_spayd"]).toContain("X-VS:987654321")
  })

  it("preserves the existing QR payment reference when payment amount changes", async () => {
    const getIban = vi
      .fn<() => Promise<string | null>>()
      .mockResolvedValue("CZ6508000000192000145399")
    const provider = new QrManualPaymentProvider({
      [QR_PAYMENT_MODULE]: createMockQrPaymentModule(getIban),
    })

    const result = await provider.updatePayment({
      amount: 250,
      context: {
        idempotency_key: "new-idempotency-key",
      },
      currency_code: "CZK",
      data: {
        qr_payment: {
          reference: "1234567890",
        },
      },
    })

    expect(getRecordValue(result, "id")).toBe("1234567890")
    const data = getRecordValue(result, "data")
    expect(
      isRecord(data) ? getRecordValue(data, "payment_qr_spayd") : undefined,
    ).toContain("AM:250.00")
    expect(
      isRecord(data) ? getRecordValue(data, "payment_qr_spayd") : undefined,
    ).toContain("X-VS:1234567890")
    expect(
      isRecord(data) ? getRecordValue(data, "qr_payment") : undefined,
    ).toMatchObject({
      reference: "1234567890",
    })
  })

  it("ignores malformed stored QR payment references", async () => {
    const getIban = vi
      .fn<() => Promise<string | null>>()
      .mockResolvedValue("CZ6508000000192000145399")
    const provider = new QrManualPaymentProvider({
      [QR_PAYMENT_MODULE]: createMockQrPaymentModule(getIban),
    })

    const results = await Promise.all(
      [
        null,
        { reference: 123 },
        Object.assign([], { reference: "array-reference" }),
      ].map(
        async (qrPayment) =>
          await provider.updatePayment({
            amount: 250,
            currency_code: "CZK",
            data: {
              order_id: "order-reference",
              qr_payment: qrPayment,
            },
          }),
      ),
    )

    expect(results.map((result) => getRecordValue(result, "id"))).toStrictEqual(
      ["order-reference", "order-reference", "order-reference"],
    )
  })

  it("authorizes the manual QR payment so checkout can create an order", async () => {
    const provider = new QrManualPaymentProvider({})

    await expect(
      provider.authorizePayment({
        data: {
          payment_qr_spayd: "SPD*1.0",
        },
      }),
    ).resolves.toStrictEqual({
      data: {
        payment_qr_spayd: "SPD*1.0",
      },
      status: "authorized",
    })
  })
})
