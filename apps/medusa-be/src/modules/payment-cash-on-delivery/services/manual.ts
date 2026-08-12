import { randomUUID } from "node:crypto"
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
  ModuleProvider,
  Modules,
  PaymentActions,
} from "@medusajs/framework/utils"
import { CASH_ON_DELIVERY_PAYMENT_PROVIDER_IDENTIFIER } from "../constants"

type CashOnDeliveryPaymentProviderOptions = Record<string, never>

const CASH_ON_DELIVERY_DATA_KEY = "cash_on_delivery"
const CASH_ON_DELIVERY_REFERENCE_KEY = "cash_on_delivery_reference"

export class CashOnDeliveryPaymentProvider extends AbstractPaymentProvider<CashOnDeliveryPaymentProviderOptions> {
  static override identifier = CASH_ON_DELIVERY_PAYMENT_PROVIDER_IDENTIFIER

  constructor(
    container: Record<string, unknown>,
    options: CashOnDeliveryPaymentProviderOptions = {}
  ) {
    super(container, options)
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const existingReference =
      readString(input.data?.[CASH_ON_DELIVERY_REFERENCE_KEY]) ??
      readString(input.data?.id) ??
      readString(input.context?.idempotency_key)

    const id = existingReference ?? `cod-${randomUUID()}`

    return {
      id,
      status: "pending",
      data: {
        ...input.data,
        [CASH_ON_DELIVERY_DATA_KEY]: true,
        [CASH_ON_DELIVERY_REFERENCE_KEY]: id,
      },
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    return { status: "authorized", data: input.data }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    return {
      status:
        input.data?.[CASH_ON_DELIVERY_DATA_KEY] === true
          ? "authorized"
          : "pending",
    }
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    return { data: input.data }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return this.initiatePayment(input)
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    return { data: input.data }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    return { data: input.data }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: input.data }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data }
  }

  async getWebhookActionAndData(
    _payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    return { action: PaymentActions.NOT_SUPPORTED }
  }
}

export default ModuleProvider(Modules.PAYMENT, {
  services: [CashOnDeliveryPaymentProvider],
})

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}
