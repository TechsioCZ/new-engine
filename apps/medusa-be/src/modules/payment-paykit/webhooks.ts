import type { MedusaRequest } from "@medusajs/framework/http"
import type { PaymentModuleOptions } from "@medusajs/framework/types"
import { Modules, PaymentWebhookEvents } from "@medusajs/framework/utils"

type EmitPaykitPaymentWebhookEventInput = {
  data: Record<string, unknown>
  provider: string
  rawData?: string | Buffer
  req: MedusaRequest
}

export const emitPaykitPaymentWebhookEvent = async ({
  data,
  provider,
  rawData = "",
  req,
}: EmitPaykitPaymentWebhookEventInput): Promise<void> => {
  const paymentModule = req.scope.resolve(Modules.PAYMENT) as {
    options?: PaymentModuleOptions
  }
  const options = paymentModule.options || {}
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
      delay: options.webhook_delay || 5000,
      attempts: options.webhook_retries || 3,
    }
  )
}
