import type {
  BigNumberInput,
  ProviderWebhookPayload,
} from "@medusajs/framework/types"
import type { createComgate } from "@paykit-sdk/comgate"
import type {
  Customer,
  LooseAutoComplete,
  Payee,
  PayKit,
  PayKitProvider,
  Payment,
  PaymentStatus,
  Refund,
  WebhookEventPayload,
} from "@paykit-sdk/core"
import type { createGopay } from "@paykit-sdk/gopay"
import type { createStripe } from "@paykit-sdk/stripe"

export type PaykitPaymentStatus = LooseAutoComplete<
  | PaymentStatus
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
>

export type PaykitPayment = Partial<
  Omit<Payment, "amount" | "currency" | "metadata" | "status">
> & {
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
  payment_intent_id?: string | null
  metadata?: Record<string, unknown> | null
}

export type PaykitCustomer = Partial<Customer>
export type PaykitRefund = Partial<Refund>

type PaykitSdkProvider = PayKitProvider
type PaykitSdkClient = Pick<
  InstanceType<typeof PayKit<PaykitSdkProvider>>,
  "customers" | "payments" | "refunds"
>
type PaykitSdkPayments = PaykitSdkClient["payments"]
type PaykitSdkRefunds = PaykitSdkClient["refunds"]
type PaykitSdkCustomers = PaykitSdkClient["customers"]

export type PaykitPaymentClient = {
  payments: {
    create: (
      input: Parameters<PaykitSdkPayments["create"]>[0]
    ) => Promise<PaykitPayment>
    retrieve: (
      id: Parameters<PaykitSdkPayments["retrieve"]>[0]
    ) => Promise<PaykitPayment | null>
    update?: (
      id: Parameters<PaykitSdkPayments["update"]>[0],
      input: Parameters<PaykitSdkPayments["update"]>[1]
    ) => Promise<PaykitPayment>
    cancel?: (
      id: Parameters<PaykitSdkPayments["cancel"]>[0]
    ) => Promise<PaykitPayment>
    capture?: (
      id: Parameters<PaykitSdkPayments["capture"]>[0],
      input: Parameters<PaykitSdkPayments["capture"]>[1]
    ) => Promise<PaykitPayment>
  }
  refunds?: {
    create: (
      input: Parameters<PaykitSdkRefunds["create"]>[0]
    ) => Promise<PaykitRefund>
  }
  customers?: {
    create: (
      input: Parameters<PaykitSdkCustomers["create"]>[0]
    ) => Promise<PaykitCustomer>
    update: (
      id: Parameters<PaykitSdkCustomers["update"]>[0],
      input: Parameters<PaykitSdkCustomers["update"]>[1]
    ) => Promise<PaykitCustomer>
    retrieve: (
      id: Parameters<PaykitSdkCustomers["retrieve"]>[0]
    ) => Promise<PaykitCustomer | null>
    delete: (id: Parameters<PaykitSdkCustomers["delete"]>[0]) => Promise<null>
  }
  handleWebhook?: (
    payload: ProviderWebhookPayload["payload"]
  ) => Promise<PaykitWebhookEvent | PaykitWebhookEvent[] | undefined>
  stripeCheckoutSessions?: {
    retrieve: (
      id: string,
      options?: Record<string, unknown>
    ) => Promise<PaykitStripeCheckoutSession | null>
    expire?: (id: string) => Promise<PaykitStripeCheckoutSession | null>
  }
}

export type PaykitStripeCheckoutSession = {
  id: string
  amount_total?: number | null
  amount_subtotal?: number | null
  currency?: string | null
  customer?: string | { id?: string | null } | null
  customer_email?: string | null
  metadata?: Record<string, string> | null
  payment_intent?: string | PaykitStripePaymentIntent | null
  payment_status?: string | null
  status?: string | null
  url?: string | null
}

export type PaykitStripePaymentIntent = {
  id?: string | null
  amount?: number | null
  currency?: string | null
  customer?: string | { id?: string | null } | null
  metadata?: Record<string, string> | null
  next_action?: {
    redirect_to_url?: {
      url?: string | null
    } | null
  } | null
  status?: string | null
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

export type PaykitGopayProviderOptions = Partial<
  Parameters<typeof createGopay>[0]
>
export type PaykitStripeProviderOptions = Partial<
  Parameters<typeof createStripe>[0]
>
export type PaykitComgateProviderOptions = Partial<
  Parameters<typeof createComgate>[0]
>

export type PaykitGopayOptions = PaykitAdapterOptions &
  PaykitGopayProviderOptions

export type PaykitStripeOptions = PaykitAdapterOptions &
  PaykitStripeProviderOptions & {
    webhookSecret?: string
  }

export type PaykitComgateOptions = PaykitAdapterOptions &
  PaykitComgateProviderOptions & {
    paymentLabel?: string
  }

type PaykitSdkWebhookEvent = WebhookEventPayload<Record<string, unknown>>

export type PaykitWebhookEvent = Partial<
  Omit<PaykitSdkWebhookEvent, "data" | "type">
> & {
  type?: WebhookEventPayload["type"] | string
  is_raw?: WebhookEventPayload["is_raw"]
  data?:
    | PaykitSdkWebhookEvent["data"]
    | PaykitPayment
    | { object?: PaykitPayment | null; payment?: PaykitPayment | null }
    | null
  payment?: PaykitPayment | null
  metadata?: Record<string, unknown> | null
  amount?: BigNumberInput
}
