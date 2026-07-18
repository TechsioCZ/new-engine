import type { UpdatePaymentOutput } from "@medusajs/framework/types"
import { describe, expect, it, vi } from "vitest"

import { QR_PAYMENT_MODULE } from "../constants"
import type { QrPaymentModuleService } from "../service"
import { QrManualPaymentProvider } from "../services/manual"

const PNG_DATA_URL_PATTERN = /^data:image\/png;base64,/

// QrManualPaymentProvider only ever calls `getIban()` on the injected
// qr_payment module (see services/manual.ts#getIban), so the test double
// only needs to implement that member. The cast is legal without going
// through `unknown` because `QrPaymentModuleService` (which has every
// member, including `getIban`) is assignable to this narrower literal type.
const createMockQrPaymentModule = (
  getIban: () => Promise<string | null>
): QrPaymentModuleService => ({ getIban }) as QrPaymentModuleService

// updatePayment delegates to initiatePayment at runtime (which resolves an
// `id`), but the DTO it is declared to return (`UpdatePaymentOutput`) does
// not include `id`. Narrow the assertion locally instead of widening the
// production return type.
type UpdatePaymentOutputWithId = UpdatePaymentOutput & { id?: string }

describe("QrManualPaymentProvider", () => {
  it("generates SPAYD and QR image data for a payment session", async () => {
    const getIban = vi.fn().mockResolvedValue("CZ65 0800 0000 1920 0014 5399")
    const provider = new QrManualPaymentProvider({
      [QR_PAYMENT_MODULE]: createMockQrPaymentModule(getIban),
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
      [QR_PAYMENT_MODULE]: createMockQrPaymentModule(getIban),
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

  it("preserves the existing QR payment reference when payment amount changes", async () => {
    const getIban = vi.fn().mockResolvedValue("CZ6508000000192000145399")
    const provider = new QrManualPaymentProvider({
      [QR_PAYMENT_MODULE]: createMockQrPaymentModule(getIban),
    })

    const result = (await provider.updatePayment({
      amount: 250,
      currency_code: "CZK",
      data: {
        qr_payment: {
          reference: "1234567890",
        },
      },
      context: {
        idempotency_key: "new-idempotency-key",
      },
    })) as UpdatePaymentOutputWithId

    expect(result.id).toBe("1234567890")
    expect(result.data?.payment_qr_spayd).toContain("AM:250.00")
    expect(result.data?.payment_qr_spayd).toContain("X-VS:1234567890")
    expect(result.data?.qr_payment).toMatchObject({
      reference: "1234567890",
    })
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
