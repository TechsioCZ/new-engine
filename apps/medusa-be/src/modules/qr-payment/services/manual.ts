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

type QrManualPaymentProviderDependencies = {
  [QR_PAYMENT_MODULE]?: QrPaymentModuleService
}

const QR_PAYMENT_DATA_KEY = "qr_payment"
const QR_PAYMENT_SPAYD_KEY = "payment_qr_spayd"
const QR_PAYMENT_DATA_URL_KEY = "payment_qr_data_url"

export class QrManualPaymentProvider extends AbstractPaymentProvider<QrManualPaymentProviderOptions> {
  static override identifier = QR_PAYMENT_PROVIDER_IDENTIFIER

  protected readonly options_: QrManualPaymentProviderOptions
  protected readonly container_: QrManualPaymentProviderDependencies

  constructor(
    container: QrManualPaymentProviderDependencies,
    options: QrManualPaymentProviderOptions = {}
  ) {
    super(container, options)

    this.container_ = container
    this.options_ = options
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const reference = this.getPaymentReference(input)
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

    if (!spayd) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "QR payment requires configured IBAN and a positive payment amount"
      )
    }

    const qrDataUrl = await QRCode.toDataURL(spayd, {
      errorCorrectionLevel: "M",
      margin: 4,
      width: 320,
    })

    return {
      id: reference,
      status: "pending",
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
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    return {
      status: "authorized",
      data: input.data,
    }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    return {
      status: this.hasQrPaymentData(input.data) ? "authorized" : "pending",
    }
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    return {
      data: input.data,
    }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return this.initiatePayment(input)
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    return {
      data: input.data,
    }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    return {
      data: input.data,
    }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return {
      data: input.data,
    }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return {
      data: input.data,
    }
  }

  async getWebhookActionAndData(
    _payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    return {
      action: PaymentActions.NOT_SUPPORTED,
    }
  }

  private async getIban() {
    const qrPaymentService = this.container_[QR_PAYMENT_MODULE]

    return normalizeIban(await qrPaymentService?.getIban())
  }

  private getPaymentReference(input: InitiatePaymentInput) {
    const dataReference =
      getString(input.data?.reference) ??
      getString(input.data?.order_id) ??
      getString(input.context?.idempotency_key)

    return dataReference ?? `qr_${Date.now()}`
  }

  private hasQrPaymentData(data: Record<string, unknown> | undefined) {
    return typeof data?.[QR_PAYMENT_SPAYD_KEY] === "string"
  }
}

export default ModuleProvider(Modules.PAYMENT, {
  services: [QrManualPaymentProvider],
})

function normalizeAmount(amount: InitiatePaymentInput["amount"]) {
  const normalized = Number(amount)

  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "QR payment amount must be positive"
    )
  }

  return normalized
}

function normalizeIban(value: string | null | undefined) {
  const normalized = value?.replace(/\s+/g, "").toUpperCase() ?? ""

  return normalized || null
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}
