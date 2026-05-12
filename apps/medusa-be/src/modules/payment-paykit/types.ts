import type {
  BigNumberInput,
  ProviderWebhookPayload,
} from "@medusajs/framework/types"

export type PaykitPaymentStatus =
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

export type PaykitPayment = Record<string, unknown> & {
  id?: string
  amount?: BigNumberInput
  amount_paid?: BigNumberInput
  currency?: string | null
  currency_code?: string | null
  customer?: string | { email?: string } | null
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

export type PaykitCustomerInput = string | { email: string }

export type PaykitBillingInfo = {
  address: {
    name: string
    line1: string
    line2: string
    city: string
    state?: string
    postal_code: string
    country: string
    phone?: string
  }
  carrier?: string
  currency: string
}

export type PaykitCustomer = Record<string, unknown> & {
  id?: string
  email?: string
  name?: string
  phone?: string
  metadata?: Record<string, string>
}

export type PaykitCreatePaymentInput = {
  amount: number
  billing?: PaykitBillingInfo
  currency: string
  customer: PaykitCustomerInput
  item_id: string | null
  capture_method: "automatic" | "manual"
  metadata?: Record<string, unknown>
  provider_metadata?: Record<string, unknown>
}

export type PaykitUpdatePaymentInput = {
  amount?: number
  currency?: string
  customer?: PaykitCustomerInput
  metadata?: Record<string, string>
  provider_metadata?: Record<string, unknown>
}

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
    create: (input: {
      payment_id: string
      amount: number
      reason: string | null
      metadata: Record<string, string> | null
      provider_metadata?: Record<string, unknown>
    }) => Promise<PaykitPayment>
  }
  customers?: {
    create: (input: {
      billing: PaykitBillingInfo | null
      email: string
      metadata?: Record<string, string>
      name?: string
      phone: string
    }) => Promise<PaykitCustomer>
    update: (
      id: string,
      input: {
        billing?: PaykitBillingInfo | null
        email?: string
        metadata?: Record<string, string>
        name?: string
        phone?: string
      }
    ) => Promise<PaykitCustomer>
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

export type PaykitProviderOptions = {
  cloudApiKey?: string
  debug?: boolean
  capture?: boolean
  client?: PaykitPaymentClient
  clientFactory?: PaykitClientFactory
}

export type PaykitGopayOptions = PaykitProviderOptions & {
  clientId?: string
  clientSecret?: string
  goId?: string
  isSandbox?: boolean
  webhookUrl?: string
}

export type PaykitStripeOptions = PaykitProviderOptions & {
  apiKey?: string
  webhookSecret?: string
}

export type PaykitComgateOptions = PaykitProviderOptions & {
  merchant?: string
  secret?: string
  isSandbox?: boolean
}

export type PaykitWebhookEvent = {
  type?: string
  data?:
    | PaykitPayment
    | { object?: PaykitPayment | null; payment?: PaykitPayment | null }
    | null
  payment?: PaykitPayment | null
  metadata?: Record<string, unknown> | null
  amount?: BigNumberInput
}
