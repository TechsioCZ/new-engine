import type { MedusaRequest } from "@medusajs/framework/http"
import type { Logger, PaymentModuleOptions } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  PaymentWebhookEvents,
} from "@medusajs/framework/utils"

interface PaykitWebhookData {
  fullUrl: string
  url: string
}

interface EmitPaykitPaymentWebhookEventInput {
  data: PaykitWebhookData
  provider: string
  rawData?: string | Buffer
  req: MedusaRequest
}

interface PaykitWebhookEmitErrorContext {
  eventName: typeof PaymentWebhookEvents.WebhookReceived
  headers: MedusaRequest["headers"]
  paymentModuleOptions: PaymentModuleOptions
  provider: string
  rawData: string | Buffer
}

const logWebhookEmitError = (
  req: MedusaRequest,
  error: unknown,
  context: PaykitWebhookEmitErrorContext,
): void => {
  const logger = req.scope.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const errorObject = error instanceof Error ? error : new Error(String(error))

  logger.error("Failed to emit PayKit payment webhook event", errorObject)
  logger.debug(
    JSON.stringify({
      ...context,
      error,
    }),
  )
}

export const emitPaykitPaymentWebhookEvent = async ({
  data,
  provider,
  rawData = "",
  req,
}: EmitPaykitPaymentWebhookEventInput): Promise<void> => {
  let options: PaymentModuleOptions = {}

  try {
    const paymentModule = req.scope.resolve<{
      options?: PaymentModuleOptions
    }>(Modules.PAYMENT)
    options = paymentModule.options ?? {}
    const eventBus = req.scope.resolve(Modules.EVENT_BUS)

    await eventBus.emit(
      {
        data: {
          payload: {
            data,
            headers: req.headers,
            rawData,
          },
          provider,
        },
        name: PaymentWebhookEvents.WebhookReceived,
      },
      {
        attempts: options.webhook_retries ?? 3,
        delay: options.webhook_delay ?? 5000,
      },
    )
  } catch (error) {
    // Provider callback routes acknowledge the callback; emit failures are
    // logged here instead of bubbling to the HTTP handler.
    logWebhookEmitError(req, error, {
      eventName: PaymentWebhookEvents.WebhookReceived,
      headers: req.headers,
      paymentModuleOptions: options,
      provider,
      rawData,
    })
  }
}
