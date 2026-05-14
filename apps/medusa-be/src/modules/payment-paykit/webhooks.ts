import type { MedusaRequest } from "@medusajs/framework/http"
import type { Logger, PaymentModuleOptions } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  PaymentWebhookEvents,
} from "@medusajs/framework/utils"

type EmitPaykitPaymentWebhookEventInput = {
  data: Record<string, unknown>
  provider: string
  rawData?: string | Buffer
  req: MedusaRequest
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const getPaymentModuleOptions = (
  paymentModule: unknown
): PaymentModuleOptions => {
  if (!isRecord(paymentModule)) {
    throw new Error("Payment module could not be resolved for PayKit webhook")
  }

  return isRecord(paymentModule.options)
    ? (paymentModule.options as PaymentModuleOptions)
    : {}
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
        name: PaymentWebhookEvents.WebhookReceived,
        data: {
          provider,
          payload: {
            data,
            rawData,
            headers: req.headers,
          },
        },
      },
      {
        delay: options.webhook_delay ?? 5000,
        attempts: options.webhook_retries ?? 3,
      }
    )
  } catch (error) {
    logWebhookEmitError(req, error, {
      eventName: PaymentWebhookEvents.WebhookReceived,
      headers: req.headers,
      paymentModuleOptions: options,
      provider,
      rawData,
    })
  }
}
