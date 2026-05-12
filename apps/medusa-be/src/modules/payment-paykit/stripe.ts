import type {
  BigNumberValue,
  InitiatePaymentInput,
  ProviderWebhookPayload,
  WebhookActionResult,
} from "@medusajs/framework/types"
import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import {
  fromStripeSmallestCurrencyUnit,
  toStripeSmallestCurrencyUnit,
} from "./amounts"
import {
  type PaykitInjectedDependencies,
  PaykitPaymentProviderBase,
} from "./base"
import {
  PAYKIT_PAYMENT_PROVIDER_IDENTIFIER,
  requirePaykitOptions,
} from "./config"
import { mapPaykitWebhookEvent } from "./mappers"
import {
  createPaykitClient,
  getStripeProviderOptions,
  getStripeWebhookOptions,
} from "./runtime"
import type {
  PaykitPayment,
  PaykitPaymentClient,
  PaykitStripeOptions,
} from "./types"

const STRIPE_PAYMENT_INTENT_EVENTS = new Set([
  "payment_intent.created",
  "payment_intent.processing",
  "payment_intent.requires_action",
  "payment_intent.amount_capturable_updated",
  "payment_intent.partially_funded",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
])

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
    return await createPaykitClient(
      "@paykit-sdk/stripe",
      "createStripe",
      getStripeProviderOptions(this.options_),
      getStripeWebhookOptions(this.options_)
    )
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

    const normalized = super.normalizeAmount(
      amount as InitiatePaymentInput["amount"],
      payment.currency ?? payment.currency_code
    )

    return fromStripeSmallestCurrencyUnit(
      normalized,
      payment.currency ?? payment.currency_code
    )
  }

  override async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    try {
      return await super.getWebhookActionAndData(payload)
    } catch (error) {
      const fallback = this.mapVerifiedStripePaymentIntentWebhook(
        payload,
        error
      )

      if (fallback) {
        return fallback
      }

      throw error
    }
  }

  private mapVerifiedStripePaymentIntentWebhook(
    payload: ProviderWebhookPayload["payload"],
    error: unknown
  ): WebhookActionResult | undefined {
    if (
      !(
        error instanceof Error &&
        error.message.includes("Unhandled event type: payment_intent.")
      )
    ) {
      return
    }

    const event = this.parseStripeWebhookEvent(payload.rawData)

    if (!(event && STRIPE_PAYMENT_INTENT_EVENTS.has(event.type))) {
      return
    }

    const paymentIntent = event.data?.object

    if (!paymentIntent || typeof paymentIntent !== "object") {
      return
    }

    const paykitEventType =
      event.type === "payment_intent.canceled"
        ? "payment.canceled"
        : this.getPaykitPaymentEventType(event.type)

    return mapPaykitWebhookEvent(
      {
        type: paykitEventType,
        data: {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          customer: paymentIntent.customer ?? "",
          status: this.mapStripePaymentIntentStatus(paymentIntent.status),
          metadata: paymentIntent.metadata,
          payment_url: paymentIntent.next_action?.redirect_to_url?.url,
        },
      },
      {
        normalizeAmount: (amount, payment) =>
          this.normalizeWebhookAmount(amount, payment),
      }
    )
  }

  private parseStripeWebhookEvent(
    rawData: ProviderWebhookPayload["payload"]["rawData"]
  ):
    | {
        type: string
        data?: {
          object?: {
            id?: string
            amount?: number
            currency?: string
            customer?: unknown
            status?: string
            metadata?: Record<string, unknown>
            next_action?: {
              redirect_to_url?: {
                url?: string
              }
            }
          }
        }
      }
    | undefined {
    let rawBody = ""

    if (Buffer.isBuffer(rawData)) {
      rawBody = rawData.toString("utf8")
    } else if (typeof rawData === "string") {
      rawBody = rawData
    }

    if (!rawBody) {
      return
    }

    try {
      return JSON.parse(rawBody)
    } catch {
      return
    }
  }

  private mapStripePaymentIntentStatus(status: unknown): string {
    switch (status) {
      case "requires_payment_method":
      case "requires_confirmation":
        return "pending"
      case "processing":
        return "processing"
      case "requires_action":
        return "requires_action"
      case "requires_capture":
        return "requires_capture"
      case "succeeded":
        return "succeeded"
      case "canceled":
        return "canceled"
      default:
        return "failed"
    }
  }

  private getPaykitPaymentEventType(
    eventType: string
  ): "payment.created" | "payment.updated" {
    return eventType === "payment_intent.created"
      ? "payment.created"
      : "payment.updated"
  }
}

export default ModuleProvider(Modules.PAYMENT, {
  services: [PaykitStripePaymentProvider],
})
