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
import { z } from "@medusajs/framework/zod"
import { omitInternalMetadata, PAYKIT_METADATA_KEY } from "@paykit-sdk/core"

import { PAYKIT_PAYMENT_PROVIDER_IDENTIFIER } from "../constants"
import { PaykitPaymentProviderBase } from "../core/base"
import type { PaykitInjectedDependencies } from "../core/base"
import {
  createPaykitClientWithProvider,
  getStripeProviderOptions,
  getStripeWebhookOptions,
} from "../runtime"
import { resolveStripeRuntimeOptions } from "../runtime-config"
import type {
  PaykitPayment,
  PaykitPaymentClient,
  PaykitStripeCheckoutSession,
  PaykitStripeOptions,
  PaykitStripePaymentIntent,
  PaykitStripeProvider,
} from "../types"
import {
  fromStripeSmallestCurrencyUnit,
  toNumericPaymentAmount,
  toStripeSmallestCurrencyUnit,
} from "../utils/amounts"
import { toPaykitPaymentData, toPaykitRefundData } from "../utils/mappers"
import { requirePaykitOptions } from "../utils/validation"

const isNonEmptyString = (value: string | null | undefined): value is string =>
  typeof value === "string" && value.length > 0

// Mirrors the historical truthiness check on provider data, so non-string ids
// still reach the typed provider id validation instead of silently skipping it.
const hasProviderPaymentId = (data?: DeletePaymentInput["data"]): boolean =>
  Boolean(data?.["id"])

const isStripeCheckoutSessionId = (id: string): boolean => id.startsWith("cs_")

const isStripeResourceMissingError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  Reflect.get(error, "code") === "resource_missing"

const getStripeCheckoutSessionRetriever = (
  provider: PaykitStripeProvider,
): NonNullable<PaykitPaymentClient["stripeCheckoutSessions"]> => ({
  expire: async (id) => await provider._native.checkout.sessions.expire(id),
  retrieve: async (id, options) =>
    await provider._native.checkout.sessions.retrieve(id, options),
})

const requireStripeCheckoutSessionRetriever = (
  provider: PaykitStripeProvider,
): NonNullable<PaykitPaymentClient["stripeCheckoutSessions"]> =>
  getStripeCheckoutSessionRetriever(provider)

const getStripeCustomer = (
  value:
    | PaykitStripeCheckoutSession["customer"]
    | PaykitStripePaymentIntent["customer"],
): PaykitPayment["customer"] => {
  if (typeof value === "string" && value.length > 0) {
    return { id: value }
  }

  if (
    typeof value === "object" &&
    value !== null &&
    typeof value.id === "string" &&
    value.id.length > 0
  ) {
    return { id: value.id }
  }

  return null
}

const getStripeCheckoutPaymentIntent = (
  session: PaykitStripeCheckoutSession,
): PaykitStripePaymentIntent | null =>
  typeof session.payment_intent === "object" && session.payment_intent !== null
    ? session.payment_intent
    : null

const getStripeCheckoutCustomer = (
  session: PaykitStripeCheckoutSession,
  paymentIntent: PaykitStripePaymentIntent | null,
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
  paymentIntent: PaykitStripePaymentIntent | null,
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

const getStripeCheckoutItemId = (
  metadata: NonNullable<PaykitStripeCheckoutSession["metadata"]>,
): string | null => {
  const paykitMetadata = metadata[PAYKIT_METADATA_KEY]

  if (typeof paykitMetadata !== "string") {
    return null
  }

  try {
    const result = z
      .object({ itemId: z.string() })
      .safeParse(JSON.parse(paykitMetadata))
    return result.success ? result.data.itemId : null
  } catch {
    return null
  }
}

const STRIPE_PAYMENT_INTENT_STATUS_MAP = new Map<
  string,
  NonNullable<PaykitPayment["status"]>
>([
  ["canceled", "canceled"],
  ["processing", "processing"],
  ["requires_action", "requires_action"],
  ["requires_capture", "requires_capture"],
  ["requires_confirmation", "pending"],
  ["requires_payment_method", "pending"],
  ["succeeded", "succeeded"],
])

const mapStripePaymentIntentStatus = (
  status: string | null | undefined,
): PaykitPayment["status"] | undefined =>
  isNonEmptyString(status)
    ? STRIPE_PAYMENT_INTENT_STATUS_MAP.get(status)
    : undefined

const getStripeCheckoutStatus = (
  session: PaykitStripeCheckoutSession,
  paymentIntent: PaykitStripePaymentIntent | null,
): PaykitPayment["status"] => {
  const paymentIntentStatus = mapStripePaymentIntentStatus(
    paymentIntent?.status,
  )

  if (paymentIntentStatus !== undefined) {
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

const STRIPE_REQUIRES_ACTION_PAYMENT_INTENT_STATUSES = new Set([
  "requires_action",
  "requires_confirmation",
  "requires_payment_method",
])

/**
 * A Checkout Session without an expanded PaymentIntent status still requires
 * customer action while it is open and unpaid.
 */
const isStripeCheckoutAwaitingPayment = (
  session: PaykitStripeCheckoutSession,
): boolean =>
  session.status === "open" &&
  session.payment_status !== "paid" &&
  session.payment_status !== "no_payment_required"

const getStripeCheckoutRequiresAction = (
  session: PaykitStripeCheckoutSession,
  paymentIntentStatus: string | null | undefined,
): boolean =>
  isNonEmptyString(paymentIntentStatus)
    ? STRIPE_REQUIRES_ACTION_PAYMENT_INTENT_STATUSES.has(paymentIntentStatus)
    : isStripeCheckoutAwaitingPayment(session)

const toPaykitPaymentFromStripeCheckoutSession = (
  session: PaykitStripeCheckoutSession,
): PaykitPayment => {
  const paymentIntent = getStripeCheckoutPaymentIntent(session)
  const paymentIntentStatus = paymentIntent?.status
  const metadata = {
    ...paymentIntent?.metadata,
    ...session.metadata,
  }
  const paymentUrl =
    paymentIntent?.next_action?.redirect_to_url?.url ?? session.url ?? undefined

  return {
    amount:
      paymentIntent?.amount ??
      session.amount_total ??
      session.amount_subtotal ??
      undefined,
    currency: paymentIntent?.currency ?? session.currency ?? undefined,
    customer: getStripeCheckoutCustomer(session, paymentIntent),
    id: session.id,
    item_id: getStripeCheckoutItemId(metadata),
    metadata: omitInternalMetadata(metadata),
    payment_intent_id: getStripeCheckoutPaymentIntentId(session, paymentIntent),
    requires_action: getStripeCheckoutRequiresAction(
      session,
      paymentIntentStatus,
    ),
    status: getStripeCheckoutStatus(session, paymentIntent),
    ...(isNonEmptyString(paymentUrl) ? { payment_url: paymentUrl } : {}),
  }
}

const withStripeCheckoutSessionRetrieve = (
  client: PaykitPaymentClient,
): PaykitPaymentClient => {
  const checkoutSessions = client.stripeCheckoutSessions

  if (!checkoutSessions) {
    return client
  }

  const retrievePayment = client.payments.retrieve

  return {
    ...client,
    payments: {
      ...client.payments,
      retrieve: async (id) => {
        if (!isStripeCheckoutSessionId(id)) {
          return await retrievePayment(id)
        }

        // PayKit Stripe 1.3.2 maps an expanded PaymentIntent for cs_ ids but
        // drops Checkout Session metadata and its PaymentIntent id. Remove this
        // compatibility path once the SDK preserves both values itself.
        let session: PaykitStripeCheckoutSession | null

        try {
          session = await checkoutSessions.retrieve(id, {
            expand: ["payment_intent"],
          })
        } catch (error) {
          // Match PayKit's retrievePayment contract for missing Stripe objects;
          // all operational and authentication errors must still propagate.
          if (isStripeResourceMissingError(error)) {
            return null
          }

          throw error
        }

        return session
          ? toPaykitPaymentFromStripeCheckoutSession(session)
          : null
      },
    },
  }
}

const getCurrencyCode = (
  data?: InitiatePaymentInput["data"],
): string | undefined =>
  typeof data?.["currency"] === "string" && data["currency"].length > 0
    ? data["currency"]
    : undefined

const getPaymentIntentIdFromData = (
  data?: InitiatePaymentInput["data"],
): string | undefined =>
  typeof data?.["payment_intent_id"] === "string" &&
  data["payment_intent_id"].length > 0
    ? data["payment_intent_id"]
    : undefined

const getExplicitCaptureAmount = (
  input: CapturePaymentInput,
): number | undefined => {
  if (!("amount" in input)) {
    return undefined
  }

  const amount = Reflect.get(input, "amount")
  return amount === undefined
    ? undefined
    : toNumericPaymentAmount(amount, "PayKit capture amount must be numeric")
}

const getStoredCaptureAmount = (
  data?: CapturePaymentInput["data"],
): number | undefined => {
  const amount = data?.["amount"]
  return amount === undefined
    ? undefined
    : toNumericPaymentAmount(
        amount,
        "PayKit stored payment amount must be numeric",
      )
}

const withPreservedStripePaymentData = (
  data: CancelPaymentInput["data"],
  providerPaymentId: string,
  operationPaymentId: string,
  payment: PaykitPayment,
): NonNullable<CancelPaymentOutput["data"]> => ({
  ...data,
  ...toPaykitPaymentData(payment),
  id: providerPaymentId,
  ...(operationPaymentId === providerPaymentId
    ? {}
    : { payment_intent_id: operationPaymentId }),
})

/**
 * Cancels a Stripe payment addressed by a Checkout Session id. Open sessions
 * are expired, completed sessions fall back to canceling their capturable
 * PaymentIntent, and anything else is reported from the session itself.
 * Returns `undefined` when the session cannot be retrieved so the caller can
 * fall back to PayKit's own cancel path.
 */
const cancelOrExpireStripeCheckoutSessionPayment = async (
  data: CancelPaymentInput["data"],
  providerPaymentId: string,
  client: PaykitPaymentClient,
): Promise<CancelPaymentOutput | undefined> => {
  const session = await client.stripeCheckoutSessions?.retrieve(
    providerPaymentId,
    { expand: ["payment_intent"] },
  )

  if (!session) {
    return undefined
  }

  if (
    session.status === "open" &&
    client.stripeCheckoutSessions?.expire !== undefined
  ) {
    // Expiring the Checkout Session is the only cancel path Stripe accepts for
    // the cs_ ids createPayment's Checkout flow returns; drop this branch once
    // PayKit's delete/cancel accepts those ids directly.
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
        payment,
      ),
    }
  }

  const payment = toPaykitPaymentFromStripeCheckoutSession(session)
  const operationPaymentId = payment.payment_intent_id

  if (
    payment.status === "requires_capture" &&
    isNonEmptyString(operationPaymentId) &&
    client.payments.cancel
  ) {
    const canceledPayment = await client.payments.cancel(operationPaymentId)

    return {
      data: withPreservedStripePaymentData(
        data,
        providerPaymentId,
        operationPaymentId,
        canceledPayment,
      ),
    }
  }

  return {
    data: withPreservedStripePaymentData(
      data,
      providerPaymentId,
      operationPaymentId ?? providerPaymentId,
      payment,
    ),
  }
}

export class PaykitStripePaymentProvider extends PaykitPaymentProviderBase<PaykitStripeOptions> {
  static override readonly identifier = PAYKIT_PAYMENT_PROVIDER_IDENTIFIER

  // Medusa's provider loader instantiates provider classes directly.
  // the base constructor is protected; this keeps the provider constructor public.
  public constructor(
    container: PaykitInjectedDependencies,
    options: PaykitStripeOptions,
  ) {
    super(container, options)
  }

  static override validateOptions(options: PaykitStripeOptions = {}): void {
    if (
      Boolean(options.client) ||
      Boolean(options.clientFactory) ||
      Boolean(options.apiStoreName)
    ) {
      return
    }

    requirePaykitOptions("PayKit Stripe", options, ["apiKey", "webhookSecret"])
  }

  protected async createDefaultClient(): Promise<PaykitPaymentClient> {
    const options = await resolveStripeRuntimeOptions(
      this.providerContainer,
      this.providerOptions,
    )
    const { client, provider } = await createPaykitClientWithProvider(
      "@paykit-sdk/stripe",
      "createStripe",
      getStripeProviderOptions(options),
      getStripeWebhookOptions(options),
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
    data: CancelPaymentInput["data"],
    client: PaykitPaymentClient,
  ): Promise<string> {
    const providerPaymentId = this.getProviderPaymentId(data)

    if (!isStripeCheckoutSessionId(providerPaymentId)) {
      return providerPaymentId
    }

    const existingPaymentIntentId = getPaymentIntentIdFromData(data)

    if (existingPaymentIntentId !== undefined) {
      return existingPaymentIntentId
    }

    // Resolving the PaymentIntent id from the Checkout Session is required
    // while PayKit's Stripe createPayment/retrievePayment do not expose a
    // stable PaymentIntent id for Checkout Session payments.
    const session = await client.stripeCheckoutSessions?.retrieve(
      providerPaymentId,
      { expand: ["payment_intent"] },
    )
    const paymentIntentId = session
      ? getStripeCheckoutPaymentIntentId(
          session,
          getStripeCheckoutPaymentIntent(session),
        )
      : null

    if (paymentIntentId === null) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `PayKit Stripe payment ${providerPaymentId} did not include a PaymentIntent id`,
      )
    }

    return paymentIntentId
  }

  override async capturePayment(
    input: CapturePaymentInput,
  ): Promise<CapturePaymentOutput> {
    const client = await this.getClient()
    const providerPaymentId = this.getProviderPaymentId(input.data)

    if (!client.payments.capture) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "PayKit provider does not support payment capture",
      )
    }

    const explicitAmount = getExplicitCaptureAmount(input)
    const paymentDataAmount = getStoredCaptureAmount(input.data)
    const amount = explicitAmount ?? paymentDataAmount

    if (amount === undefined) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayKit capture amount is missing",
      )
    }

    const operationPaymentId = await this.getStripeOperationPaymentId(
      input.data,
      client,
    )
    const currencyCode = getCurrencyCode(input.data)
    const normalizedAmount =
      explicitAmount === undefined
        ? this.normalizePaymentDataAmount(amount, currencyCode)
        : this.normalizeAmount(explicitAmount, currencyCode)
    const payment = await client.payments.capture(operationPaymentId, {
      amount: normalizedAmount,
    })

    return {
      data: withPreservedStripePaymentData(
        input.data,
        providerPaymentId,
        operationPaymentId,
        payment,
      ),
    }
  }

  override async refundPayment(
    input: RefundPaymentInput,
  ): Promise<RefundPaymentOutput> {
    const client = await this.getClient()
    const providerPaymentId = this.getProviderPaymentId(input.data)
    const amount = this.normalizeAmount(
      input.amount,
      getCurrencyCode(input.data),
    )

    if (!client.refunds?.create) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "PayKit provider does not support refunds",
      )
    }

    const operationPaymentId = await this.getStripeOperationPaymentId(
      input.data,
      client,
    )
    const refund = await client.refunds.create({
      amount,
      metadata: null,
      payment_id: operationPaymentId,
      reason: null,
    })

    if (!isNonEmptyString(refund.id)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayKit refund response did not include an id",
      )
    }

    return {
      data: {
        ...input.data,
        id: providerPaymentId,
        ...(operationPaymentId === providerPaymentId
          ? {}
          : { payment_intent_id: operationPaymentId }),
        refund: toPaykitRefundData(refund),
        refund_id: refund.id,
      },
    }
  }

  override async cancelPayment(
    input: CancelPaymentInput,
  ): Promise<CancelPaymentOutput> {
    return await this.cancelOrExpirePayment(input.data)
  }

  override async deletePayment(
    input: DeletePaymentInput,
  ): Promise<DeletePaymentOutput> {
    if (!hasProviderPaymentId(input.data)) {
      return input.data === undefined ? {} : { data: input.data }
    }

    return await this.cancelOrExpirePayment(input.data)
  }

  private async cancelOrExpirePayment(
    data: CancelPaymentInput["data"],
  ): Promise<CancelPaymentOutput> {
    const providerPaymentId = this.getProviderPaymentId(data)
    const client = await this.getClient()

    if (
      isStripeCheckoutSessionId(providerPaymentId) &&
      client.stripeCheckoutSessions
    ) {
      const output = await cancelOrExpireStripeCheckoutSessionPayment(
        data,
        providerPaymentId,
        client,
      )

      if (output) {
        return output
      }
    }

    if (!client.payments.cancel) {
      return data === undefined ? {} : { data }
    }

    const operationPaymentId = await this.getStripeOperationPaymentId(
      data,
      client,
    )
    const payment = await client.payments.cancel(operationPaymentId)

    return {
      data: withPreservedStripePaymentData(
        data,
        providerPaymentId,
        operationPaymentId,
        payment,
      ),
    }
  }

  protected override normalizeAmount(
    amount: InitiatePaymentInput["amount"],
    currencyCode?: string,
  ): number {
    const normalized = super.normalizeAmount(amount, currencyCode)

    return toStripeSmallestCurrencyUnit(normalized, currencyCode)
  }

  protected override normalizePaymentDataAmount(
    amount: InitiatePaymentInput["amount"],
    currencyCode?: string,
  ): number {
    return super.normalizeAmount(amount, currencyCode)
  }

  protected override normalizeWebhookAmount(
    amount: BigNumberValue | undefined,
    payment: PaykitPayment,
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
