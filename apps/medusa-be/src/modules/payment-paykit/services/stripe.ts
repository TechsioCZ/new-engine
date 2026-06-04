import type {
  BigNumberValue,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  InitiatePaymentInput,
  RefundPaymentInput,
  RefundPaymentOutput,
} from "@medusajs/framework/types"
import { MedusaError, ModuleProvider, Modules } from "@medusajs/framework/utils"
import { PAYKIT_PAYMENT_PROVIDER_IDENTIFIER } from "../constants"
import {
  type PaykitInjectedDependencies,
  PaykitPaymentProviderBase,
} from "../core/base"
import {
  createPaykitClientWithProvider,
  getStripeProviderOptions,
  getStripeWebhookOptions,
} from "../runtime"
import type {
  PaykitPayment,
  PaykitPaymentClient,
  PaykitStripeCheckoutSession,
  PaykitStripeOptions,
  PaykitStripePaymentIntent,
} from "../types"
import {
  fromStripeSmallestCurrencyUnit,
  toStripeSmallestCurrencyUnit,
} from "../utils/amounts"
import { toPaykitPaymentData, toPaykitRefundData } from "../utils/mappers"
import { requirePaykitOptions } from "../utils/validation"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isPaymentAmount = (
  value: unknown
): value is InitiatePaymentInput["amount"] =>
  typeof value === "number" ||
  typeof value === "string" ||
  (isRecord(value) &&
    (("value" in value &&
      (typeof value.value === "number" || typeof value.value === "string")) ||
      ("toJSON" in value && "valueOf" in value)))

const isStripeCheckoutSessionId = (id: string): boolean => id.startsWith("cs_")

const getStripeCheckoutSessionRetriever = (
  provider: unknown
): PaykitPaymentClient["stripeCheckoutSessions"] | undefined => {
  const native = isRecord(provider) ? provider._native : undefined
  const checkout = isRecord(native) ? native.checkout : undefined
  const sessions = isRecord(checkout) ? checkout.sessions : undefined
  const retrieve = isRecord(sessions) ? sessions.retrieve : undefined
  const expire = isRecord(sessions) ? sessions.expire : undefined

  if (typeof retrieve !== "function") {
    return
  }

  return {
    retrieve: (id, options) =>
      retrieve.call(
        sessions,
        id,
        options
      ) as Promise<PaykitStripeCheckoutSession>,
    ...(typeof expire === "function"
      ? {
          expire: (id) =>
            expire.call(sessions, id) as Promise<PaykitStripeCheckoutSession>,
        }
      : {}),
  }
}

const requireStripeCheckoutSessionRetriever = (
  provider: unknown
): NonNullable<PaykitPaymentClient["stripeCheckoutSessions"]> => {
  const checkoutSessions = getStripeCheckoutSessionRetriever(provider)

  if (!checkoutSessions) {
    throw new Error(
      "PayKit Stripe temporary Checkout Session fallback could not access provider._native.checkout.sessions. Remove this fallback after the PayKit SDK supports Checkout Session ids returned by createPayment."
    )
  }

  return checkoutSessions
}

const getStripeCustomer = (
  value:
    | PaykitStripeCheckoutSession["customer"]
    | PaykitStripePaymentIntent["customer"]
): PaykitPayment["customer"] => {
  if (typeof value === "string" && value.length > 0) {
    return { id: value }
  }

  if (isRecord(value) && typeof value.id === "string" && value.id.length > 0) {
    return { id: value.id }
  }

  return null
}

const getStripeCheckoutPaymentIntent = (
  session: PaykitStripeCheckoutSession
): PaykitStripePaymentIntent | null =>
  isRecord(session.payment_intent) ? session.payment_intent : null

const getStripeCheckoutCustomer = (
  session: PaykitStripeCheckoutSession,
  paymentIntent: PaykitStripePaymentIntent | null
): PaykitPayment["customer"] => {
  const paymentIntentCustomer = getStripeCustomer(paymentIntent?.customer)

  if (paymentIntentCustomer) {
    return paymentIntentCustomer
  }

  const checkoutCustomer = getStripeCustomer(session.customer)

  if (checkoutCustomer) {
    return checkoutCustomer
  }

  if (
    typeof session.customer_email === "string" &&
    session.customer_email.length > 0
  ) {
    return { email: session.customer_email }
  }

  return null
}

const getStripeCheckoutPaymentIntentId = (
  session: PaykitStripeCheckoutSession,
  paymentIntent: PaykitStripePaymentIntent | null
): string | null => {
  if (
    typeof session.payment_intent === "string" &&
    session.payment_intent.length > 0
  ) {
    return session.payment_intent
  }

  if (typeof paymentIntent?.id === "string" && paymentIntent.id.length > 0) {
    return paymentIntent.id
  }

  return null
}

const mapStripePaymentIntentStatus = (
  status: string | null | undefined
): PaykitPayment["status"] | undefined => {
  switch (status) {
    case "requires_payment_method":
    case "requires_confirmation":
      return "pending"
    case "requires_action":
      return "requires_action"
    case "requires_capture":
      return "requires_capture"
    case "succeeded":
      return "succeeded"
    case "canceled":
      return "canceled"
    case "processing":
      return "processing"
    default:
      return
  }
}

const getStripeCheckoutStatus = (
  session: PaykitStripeCheckoutSession,
  paymentIntent: PaykitStripePaymentIntent | null
): PaykitPayment["status"] => {
  const paymentIntentStatus = mapStripePaymentIntentStatus(
    paymentIntent?.status
  )

  if (paymentIntentStatus) {
    return paymentIntentStatus
  }

  if (
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required"
  ) {
    return "succeeded"
  }

  if (session.status === "expired") {
    return "canceled"
  }

  return "pending"
}

const toPaykitPaymentFromStripeCheckoutSession = (
  session: PaykitStripeCheckoutSession
): PaykitPayment => {
  const paymentIntent = getStripeCheckoutPaymentIntent(session)
  const paymentUrl =
    paymentIntent?.next_action?.redirect_to_url?.url ?? session.url ?? undefined

  return {
    id: session.id,
    amount:
      paymentIntent?.amount ??
      session.amount_total ??
      session.amount_subtotal ??
      undefined,
    currency: paymentIntent?.currency ?? session.currency ?? undefined,
    customer: getStripeCheckoutCustomer(session, paymentIntent),
    status: getStripeCheckoutStatus(session, paymentIntent),
    metadata: {
      ...(paymentIntent?.metadata ?? {}),
      ...(session.metadata ?? {}),
    },
    payment_intent_id: getStripeCheckoutPaymentIntentId(session, paymentIntent),
    requires_action:
      paymentIntent?.status === "requires_action" ||
      (session.status === "open" && session.payment_status !== "paid"),
    ...(paymentUrl ? { payment_url: paymentUrl } : {}),
  }
}

const withStripeCheckoutSessionRetrieve = (
  client: PaykitPaymentClient
): PaykitPaymentClient => {
  if (!client.stripeCheckoutSessions) {
    return client
  }

  const retrievePayment = client.payments.retrieve

  return {
    ...client,
    payments: {
      ...client.payments,
      retrieve: async (id) => {
        const payment = await retrievePayment(id)

        if (payment || !isStripeCheckoutSessionId(id)) {
          return payment
        }

        // TODO(paykit-sdk): remove this once Stripe retrievePayment supports
        // Checkout Session ids returned by createPayment's Checkout path.
        const session = await client.stripeCheckoutSessions?.retrieve(id, {
          expand: ["payment_intent"],
        })

        return session
          ? toPaykitPaymentFromStripeCheckoutSession(session)
          : null
      },
    },
  }
}

const getCurrencyCode = (data?: Record<string, unknown>): string | undefined =>
  typeof data?.currency === "string" && data.currency.length > 0
    ? data.currency
    : undefined

const getPaymentIntentIdFromData = (
  data?: Record<string, unknown>
): string | undefined =>
  typeof data?.payment_intent_id === "string" &&
  data.payment_intent_id.length > 0
    ? data.payment_intent_id
    : undefined

const getExplicitCaptureAmount = (
  input: CapturePaymentInput
): RefundPaymentInput["amount"] | undefined => {
  if (!("amount" in input)) {
    return
  }

  const amount = Reflect.get(input, "amount")

  if (amount !== undefined && !isPaymentAmount(amount)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "PayKit capture amount must be numeric"
    )
  }

  return amount
}

const getStoredCaptureAmount = (
  data?: Record<string, unknown>
): RefundPaymentInput["amount"] | undefined => {
  const amount = data?.amount

  if (amount === undefined) {
    return
  }

  if (!isPaymentAmount(amount)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "PayKit stored payment amount must be numeric"
    )
  }

  return amount
}

const withPreservedStripePaymentData = (
  data: Record<string, unknown> | undefined,
  providerPaymentId: string,
  operationPaymentId: string,
  payment: PaykitPayment
): Record<string, unknown> => ({
  ...data,
  ...toPaykitPaymentData(payment),
  id: providerPaymentId,
  ...(operationPaymentId !== providerPaymentId
    ? { payment_intent_id: operationPaymentId }
    : {}),
})

export class PaykitStripePaymentProvider extends PaykitPaymentProviderBase<PaykitStripeOptions> {
  static override identifier = PAYKIT_PAYMENT_PROVIDER_IDENTIFIER

  // Medusa's provider loader instantiates provider classes directly.
  // biome-ignore lint/complexity/noUselessConstructor: the base constructor is protected; this keeps the provider constructor public.
  constructor(
    container: PaykitInjectedDependencies,
    options: PaykitStripeOptions
  ) {
    super(container, options)
  }

  static override validateOptions(options: PaykitStripeOptions = {}): void {
    if (options.client || options.clientFactory) {
      return
    }

    requirePaykitOptions("PayKit Stripe", options, ["apiKey", "webhookSecret"])
  }

  protected async createDefaultClient(): Promise<PaykitPaymentClient> {
    const { client, provider } = await createPaykitClientWithProvider(
      "@paykit-sdk/stripe",
      "createStripe",
      getStripeProviderOptions(this.options_),
      getStripeWebhookOptions(this.options_)
    )

    return {
      ...client,
      stripeCheckoutSessions: requireStripeCheckoutSessionRetriever(provider),
    }
  }

  protected override async getClient(): Promise<PaykitPaymentClient> {
    return withStripeCheckoutSessionRetrieve(await super.getClient())
  }

  private async getStripeOperationPaymentId(
    data: Record<string, unknown> | undefined,
    client: PaykitPaymentClient
  ): Promise<string> {
    const providerPaymentId = this.getProviderPaymentId(data)

    if (!isStripeCheckoutSessionId(providerPaymentId)) {
      return providerPaymentId
    }

    const existingPaymentIntentId = getPaymentIntentIdFromData(data)

    if (existingPaymentIntentId) {
      return existingPaymentIntentId
    }

    // TODO(paykit-sdk): remove this once Stripe createPayment/retrievePayment
    // expose a stable PaymentIntent id for Checkout Session payments.
    const session = await client.stripeCheckoutSessions?.retrieve(
      providerPaymentId,
      { expand: ["payment_intent"] }
    )
    const paymentIntentId = session
      ? getStripeCheckoutPaymentIntentId(
          session,
          getStripeCheckoutPaymentIntent(session)
        )
      : null

    if (!paymentIntentId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `PayKit Stripe payment ${providerPaymentId} did not include a PaymentIntent id`
      )
    }

    return paymentIntentId
  }

  override async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    const client = await this.getClient()
    const providerPaymentId = this.getProviderPaymentId(input.data)

    if (!client.payments.capture) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "PayKit provider does not support payment capture"
      )
    }

    const explicitAmount = getExplicitCaptureAmount(input)
    const paymentDataAmount = getStoredCaptureAmount(input.data)
    const amount = explicitAmount ?? paymentDataAmount

    if (amount === undefined) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayKit capture amount is missing"
      )
    }

    const operationPaymentId = await this.getStripeOperationPaymentId(
      input.data,
      client
    )
    const currencyCode = getCurrencyCode(input.data)
    const normalizedAmount =
      explicitAmount === undefined
        ? this.normalizePaymentDataAmount(amount, currencyCode)
        : this.normalizeAmount(
            explicitAmount as InitiatePaymentInput["amount"],
            currencyCode
          )
    const payment = await client.payments.capture(operationPaymentId, {
      amount: normalizedAmount,
    })

    return {
      data: withPreservedStripePaymentData(
        input.data,
        providerPaymentId,
        operationPaymentId,
        payment
      ),
    }
  }

  override async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    const client = await this.getClient()
    const providerPaymentId = this.getProviderPaymentId(input.data)
    const amount = this.normalizeAmount(
      input.amount,
      getCurrencyCode(input.data)
    )

    if (!client.refunds?.create) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "PayKit provider does not support refunds"
      )
    }

    const operationPaymentId = await this.getStripeOperationPaymentId(
      input.data,
      client
    )
    const refund = await client.refunds.create({
      payment_id: operationPaymentId,
      amount,
      reason: null,
      metadata: null,
    })

    if (!refund.id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayKit refund response did not include an id"
      )
    }

    return {
      data: {
        ...input.data,
        id: providerPaymentId,
        ...(operationPaymentId !== providerPaymentId
          ? { payment_intent_id: operationPaymentId }
          : {}),
        refund: toPaykitRefundData(refund),
        refund_id: refund.id,
      },
    }
  }

  override async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    return this.cancelOrExpirePayment(input.data)
  }

  override async deletePayment(
    input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    if (!input.data?.id) {
      return { data: input.data }
    }

    return this.cancelOrExpirePayment(input.data)
  }

  private async cancelOrExpirePayment(
    data: Record<string, unknown> | undefined
  ): Promise<CancelPaymentOutput> {
    const providerPaymentId = this.getProviderPaymentId(data)
    const client = await this.getClient()

    if (
      isStripeCheckoutSessionId(providerPaymentId) &&
      client.stripeCheckoutSessions
    ) {
      const output = await this.cancelOrExpireCheckoutSessionPayment(
        data,
        providerPaymentId,
        client
      )

      if (output) {
        return output
      }
    }

    if (!client.payments.cancel) {
      return { data }
    }

    const operationPaymentId = await this.getStripeOperationPaymentId(
      data,
      client
    )
    const payment = await client.payments.cancel(operationPaymentId)

    return {
      data: withPreservedStripePaymentData(
        data,
        providerPaymentId,
        operationPaymentId,
        payment
      ),
    }
  }

  private async cancelOrExpireCheckoutSessionPayment(
    data: Record<string, unknown> | undefined,
    providerPaymentId: string,
    client: PaykitPaymentClient
  ): Promise<CancelPaymentOutput | undefined> {
    const session = await client.stripeCheckoutSessions?.retrieve(
      providerPaymentId,
      { expand: ["payment_intent"] }
    )

    if (!session) {
      return
    }

    if (session.status === "open" && client.stripeCheckoutSessions?.expire) {
      // TODO(paykit-sdk): remove this once Stripe delete/cancel supports
      // Checkout Session ids returned by createPayment's Checkout path.
      const expiredSession =
        await client.stripeCheckoutSessions.expire(providerPaymentId)
      const payment = expiredSession
        ? toPaykitPaymentFromStripeCheckoutSession(expiredSession)
        : ({
            id: providerPaymentId,
            status: "canceled",
          } satisfies PaykitPayment)

      return {
        data: withPreservedStripePaymentData(
          data,
          providerPaymentId,
          providerPaymentId,
          payment
        ),
      }
    }

    const payment = toPaykitPaymentFromStripeCheckoutSession(session)
    const operationPaymentId = payment.payment_intent_id

    if (
      payment.status === "requires_capture" &&
      operationPaymentId &&
      client.payments.cancel
    ) {
      const canceledPayment = await client.payments.cancel(operationPaymentId)

      return {
        data: withPreservedStripePaymentData(
          data,
          providerPaymentId,
          operationPaymentId,
          canceledPayment
        ),
      }
    }

    return {
      data: withPreservedStripePaymentData(
        data,
        providerPaymentId,
        operationPaymentId ?? providerPaymentId,
        payment
      ),
    }
  }

  protected override normalizeAmount(
    amount: InitiatePaymentInput["amount"],
    currencyCode?: string
  ): number {
    const normalized = super.normalizeAmount(amount, currencyCode)

    return toStripeSmallestCurrencyUnit(normalized, currencyCode)
  }

  protected override normalizePaymentDataAmount(
    amount: InitiatePaymentInput["amount"],
    currencyCode?: string
  ): number {
    return super.normalizeAmount(amount, currencyCode)
  }

  protected override normalizeWebhookAmount(
    amount: BigNumberValue | undefined,
    payment: PaykitPayment
  ): BigNumberValue | undefined {
    if (amount === undefined) {
      return amount
    }

    const currencyCode = payment.currency ?? payment.currency_code ?? undefined
    const normalized = super.normalizeWebhookNumericAmount(amount, currencyCode)

    return fromStripeSmallestCurrencyUnit(normalized, currencyCode)
  }
}

export default ModuleProvider(Modules.PAYMENT, {
  services: [PaykitStripePaymentProvider],
})
