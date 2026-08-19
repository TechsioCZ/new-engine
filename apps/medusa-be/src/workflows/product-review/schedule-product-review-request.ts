import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  RESEND_CONFIG_MODULE,
  type ResendConfigModuleService,
} from "../../modules/resend-config"
import {
  type PaymentPaidEvent,
  resolveOrderIdFromPaymentEvent,
} from "../../subscriber-helpers/product-review-request-on-payment/helper"
import { scheduleProductReviewRequestForOrder } from "../../utils/product-review-request-queue"

type ScheduleProductReviewRequestInput = {
  event_data: PaymentPaidEvent
  event_name: string
}

const scheduleProductReviewRequestStep = createStep(
  "schedule-product-review-request",
  async (input: ScheduleProductReviewRequestInput, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const orderId = await resolveOrderIdFromPaymentEvent(
      container,
      input.event_data
    )

    if (!orderId) {
      logger.warn(
        `Skipping product review request queueing: could not resolve order from ${input.event_name} event ${JSON.stringify(input.event_data)}`
      )
      return new StepResponse(null)
    }

    const resendConfigService =
      container.resolve<ResendConfigModuleService>(RESEND_CONFIG_MODULE)
    const config = await resendConfigService.getConfig()
    const queueItem = await scheduleProductReviewRequestForOrder({
      container,
      delayMinutes: config.product_review_request_delay_minutes,
      logger,
      orderId,
    })

    return new StepResponse(queueItem)
  }
)

export const scheduleProductReviewRequestWorkflow = createWorkflow(
  "schedule-product-review-request",
  (input: ScheduleProductReviewRequestInput) =>
    new WorkflowResponse(scheduleProductReviewRequestStep(input))
)
