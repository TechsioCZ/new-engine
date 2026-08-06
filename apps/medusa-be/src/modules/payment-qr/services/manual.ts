import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  PaymentProviderOutput,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import {
  AbstractPaymentProvider,
  MedusaError,
  ModuleProvider,
  Modules,
  PaymentActions,
} from "@medusajs/framework/utils"
import QRCode from "qrcode"

import { buildPaymentQrSpayd } from "../../../utils/order-payment-qr"
import { QR_PAYMENT_MODULE, QR_PAYMENT_PROVIDER_IDENTIFIER } from "../constants"
import type { QrPaymentModuleService } from "../service"

type QrManualPaymentProviderOptions = Record<string, never>

interface QrManualPaymentProviderDependencies extends Record<string, unknown> {
  [QR_PAYMENT_MODULE]?: QrPaymentModuleService
}

const QR_PAYMENT_DATA_KEY = "qr_payment"
const QR_PAYMENT_SPAYD_KEY = "payment_qr_spayd"
const QR_PAYMENT_DATA_URL_KEY = "payment_qr_data_url"

/**
 * Mirrors the truthiness guard that used to be applied directly to the
 * nullable SPAYD payload: `null`, `undefined` and `""` all count as missing.
 */
const isNonEmptyString = (value: string | null | undefined): value is string =>
  typeof value === "string" && value.length > 0

/**
 * Narrows an untrusted `data` slot to an indexable object without asserting.
 * Matches the previous `typeof value === "object" && value !== null` guard, so
 * arrays are still accepted and only `null` is rejected.
 */
const isQrPaymentDataObjectLike = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const getString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined

const normalizeAmount = (amount: InitiatePaymentInput["amount"]) => {
  const normalized = Number(amount)

  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "QR payment amount must be positive",
    )
  }

  return normalized
}

const normalizeIban = (value: string | null | undefined) => {
  const normalized = value?.replaceAll(/\s+/gu, "").toUpperCase() ?? ""

  return normalized || null
}

/**
 * Resolves the variable symbol used for the SPAYD payload. An already issued
 * reference on the payment session wins so that regenerating the QR code after
 * a cart change keeps the same variable symbol.
 */
const getPaymentReference = (
  input: Pick<InitiatePaymentInput, "context" | "data">,
) => {
  const existingQrPayment = input.data?.[QR_PAYMENT_DATA_KEY]
  const existingReference = isQrPaymentDataObjectLike(existingQrPayment)
    ? getString(existingQrPayment["reference"])
    : undefined
  const dataReference =
    getString(input.data?.["reference"]) ??
    getString(input.data?.["order_id"]) ??
    getString(input.context?.idempotency_key)

  return existingReference ?? dataReference ?? `qr_${Date.now()}`
}

const hasQrPaymentData = (data: Record<string, unknown> | undefined) =>
  typeof data?.[QR_PAYMENT_SPAYD_KEY] === "string"

/**
 * Manual (offline) bank transfer provider that renders a Czech SPAYD QR code.
 *
 * `AbstractPaymentProvider` mandates the full async provider surface, so the
 * purely synchronous members below keep their framework signatures and use
 * `await Promise.resolve(this)` to stay honest about being instance methods
 * that return promises.
 */
export class QrManualPaymentProvider extends AbstractPaymentProvider<QrManualPaymentProviderOptions> {
  static override readonly identifier = QR_PAYMENT_PROVIDER_IDENTIFIER

  protected readonly providerOptions: QrManualPaymentProviderOptions
  protected readonly dependencies: QrManualPaymentProviderDependencies

  constructor(
    container: QrManualPaymentProviderDependencies,
    options: QrManualPaymentProviderOptions = {},
  ) {
    super(container, options)

    this.dependencies = container
    this.providerOptions = options
  }

  async initiatePayment(
    input: InitiatePaymentInput,
  ): Promise<InitiatePaymentOutput> {
    const reference = getPaymentReference(input)
    const iban = await this.getIban()
    const amount = normalizeAmount(input.amount)
    const currencyCode = input.currency_code.toUpperCase()
    const message = `OBJEDNAVKA ${reference}`
    const spayd = buildPaymentQrSpayd({
      amount,
      currency_code: currencyCode,
      iban,
      message,
      reference,
    })

    if (!isNonEmptyString(spayd)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "QR payment requires configured IBAN and a positive payment amount",
      )
    }

    const qrDataUrl = await QRCode.toDataURL(spayd, {
      errorCorrectionLevel: "M",
      margin: 4,
      width: 320,
    })

    return {
      data: {
        [QR_PAYMENT_SPAYD_KEY]: spayd,
        [QR_PAYMENT_DATA_URL_KEY]: qrDataUrl,
        [QR_PAYMENT_DATA_KEY]: {
          amount,
          currency_code: currencyCode,
          iban,
          message,
          qr_data_url: qrDataUrl,
          reference,
          spayd,
        },
      },
      id: reference,
      status: "pending",
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput,
  ): Promise<AuthorizePaymentOutput> {
    await Promise.resolve(this)

    return {
      status: "authorized",
      ...(input.data ? { data: input.data } : {}),
    }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput,
  ): Promise<GetPaymentStatusOutput> {
    await Promise.resolve(this)

    return {
      status: hasQrPaymentData(input.data) ? "authorized" : "pending",
    }
  }

  async retrievePayment(
    input: RetrievePaymentInput,
  ): Promise<RetrievePaymentOutput> {
    return await this.echoPaymentData(input.data)
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return await this.initiatePayment(input)
  }

  async capturePayment(
    input: CapturePaymentInput,
  ): Promise<CapturePaymentOutput> {
    return await this.echoPaymentData(input.data)
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    return await this.echoPaymentData(input.data)
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return await this.echoPaymentData(input.data)
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return await this.echoPaymentData(input.data)
  }

  async getWebhookActionAndData(
    _payload: ProviderWebhookPayload["payload"],
  ): Promise<WebhookActionResult> {
    await Promise.resolve(this)

    return {
      action: PaymentActions.NOT_SUPPORTED,
    }
  }

  /**
   * Offline bank transfers have no remote state to reconcile, so retrieve,
   * capture, refund, cancel and delete simply hand the stored session payload
   * back unchanged. Every one of those outputs is a `PaymentProviderOutput`.
   */
  private async echoPaymentData(
    data: Record<string, unknown> | undefined,
  ): Promise<PaymentProviderOutput> {
    await Promise.resolve(this)

    return data ? { data } : {}
  }

  private async getIban() {
    const qrPaymentService = this.dependencies[QR_PAYMENT_MODULE]

    return normalizeIban(await qrPaymentService?.getIban())
  }
}

export default ModuleProvider(Modules.PAYMENT, {
  services: [QrManualPaymentProvider],
})
