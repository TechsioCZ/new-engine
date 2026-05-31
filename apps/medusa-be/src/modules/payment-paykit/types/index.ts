import type {
  BigNumberInput,
  ProviderWebhookPayload,
} from "@medusajs/framework/types"
import type { createComgate } from "@paykit-sdk/comgate"
import type {
  BillingInfo,
  CreateCustomerParams,
  CreatePaymentSchema,
  CreateRefundSchema,
  Customer,
  Payee,
  Payment,
  PaymentStatus,
  UpdateCustomerParams,
  UpdatePaymentSchema,
  WebhookEventPayload,
} from "@paykit-sdk/core"
import type { createGopay } from "@paykit-sdk/gopay"
import type { createStripe } from "@paykit-sdk/stripe"

export type PaykitPaymentStatus =
  | PaymentStatus
  | "pending"
  | "processing"
  | "requires_action"
  | "requires_more"
  | "requires_capture"
  | "authorized"
  | "succeeded"
  | "captured"
  | "paid"
  | "canceled"
  | "cancelled"
  | "failed"
  | "error"
  | string

export type PaykitPayment = Partial<
  Omit<Payment, "amount" | "currency" | "metadata" | "status">
> &
  Record<string, unknown> & {
    id?: string
    amount?: BigNumberInput
    amount_paid?: BigNumberInput
    currency?: string | null
    currency_code?: string | null
    customer?: Partial<Payee> | null
    item_id?: string | null
    status?: PaykitPaymentStatus
    state?: PaykitPaymentStatus
    requires_action?: boolean
    payment_url?: string | null
    paymentUrl?: string | null
    checkout_url?: string | null
    gw_url?: string | null
    url?: string | null
    metadata?: Record<string, unknown> | null
  }

export type PaykitBillingInfo = BillingInfo
export type PaykitCustomer = Partial<Customer> & Record<string, unknown>
export type PaykitCreatePaymentInput = CreatePaymentSchema

export type PaykitUpdatePaymentInput = UpdatePaymentSchema

export type PaykitPaymentClient = {
  payments: {
    create: (input: PaykitCreatePaymentInput) => Promise<PaykitPayment>
    retrieve: (id: string) => Promise<PaykitPayment | null>
    update?: (
      id: string,
      input: PaykitUpdatePaymentInput
    ) => Promise<PaykitPayment>
    cancel?: (id: string) => Promise<PaykitPayment>
    capture?: (id: string, input: { amount: number }) => Promise<PaykitPayment>
    refund?: (id: string, input: { amount: number }) => Promise<PaykitPayment>
  }
  refunds?: {
    create: (input: CreateRefundSchema) => Promise<PaykitPayment>
  }
  customers?: {
    create: (input: CreateCustomerParams) => Promise<PaykitCustomer>
    update: (id: string, input: UpdateCustomerParams) => Promise<PaykitCustomer>
    retrieve: (id: string) => Promise<PaykitCustomer | null>
    delete: (id: string) => Promise<null>
  }
  handleWebhook?: (
    payload: ProviderWebhookPayload["payload"]
  ) => Promise<PaykitWebhookEvent | PaykitWebhookEvent[] | undefined>
}

export type PaykitClientFactory = () =>
  | PaykitPaymentClient
  | Promise<PaykitPaymentClient>

export type PaykitAdapterOptions = {
  debug?: boolean
  capture?: boolean
  client?: PaykitPaymentClient
  clientFactory?: PaykitClientFactory
}

export type PaykitGopayOptions = PaykitAdapterOptions &
  Partial<Parameters<typeof createGopay>[0]>

export type PaykitStripeOptions = PaykitAdapterOptions &
  Partial<Parameters<typeof createStripe>[0]> & {
    webhookSecret?: string
  }

export type PaykitComgateOptions = PaykitAdapterOptions &
  Partial<Parameters<typeof createComgate>[0]> & {
    paymentLabel?: string
  }

export type PaykitWebhookEvent = {
  type?: WebhookEventPayload["type"] | string
  is_raw?: WebhookEventPayload["is_raw"]
  data?:
    | PaykitPayment
    | { object?: PaykitPayment | null; payment?: PaykitPayment | null }
    | null
  payment?: PaykitPayment | null
  metadata?: Record<string, unknown> | null
  amount?: BigNumberInput
}
