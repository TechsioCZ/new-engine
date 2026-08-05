import type { MedusaRequest } from "@medusajs/framework/http"
import type { Logger, PaymentModuleOptions } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  PaymentWebhookEvents,
} from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

interface EmitPaykitPaymentWebhookEventInput {
  data: Record<string, unknown>
  provider: string
  rawData?: string | Buffer
  req: MedusaRequest
}

const getPaymentModuleOptions = (
  paymentModule: unknown
): PaymentModuleOptions => {
  if (!isRecord(paymentModule)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Payment module could not be resolved for PayKit webhook"
    )
  }

  return isRecord(paymentModule["options"]) ? paymentModule["options"] : {}
}

const logWebhookEmitError = (
  req: MedusaRequest,
  error: unknown,
  context: Record<string, unknown>
): void => {
  const logger = req.scope.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const errorObject = error instanceof Error ? error : new Error(String(error))

  logger.error("Failed to emit PayKit payment webhook event", errorObject)
  logger.debug(
    JSON.stringify({
      ...context,
      error,
    })
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
    const paymentModule = req.scope.resolve(Modules.PAYMENT)
    options = getPaymentModuleOptions(paymentModule)
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
      }
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
