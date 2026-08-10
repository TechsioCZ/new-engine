import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { QR_PAYMENT_MODULE } from "../../modules/payment-qr"
import type { QrPaymentModuleService } from "../../modules/payment-qr"
import type { UpdateQrPaymentConfigInput } from "../../modules/payment-qr/types"

const updateQrPaymentConfigStep = createStep(
  "update-qr-payment-config",
  async (input: UpdateQrPaymentConfigInput, { container }) => {
    const service = container.resolve<QrPaymentModuleService>(QR_PAYMENT_MODULE)

    return new StepResponse(await service.updateConfig(input))
  },
)

export const updateQrPaymentConfigWorkflow = createWorkflow(
  "update-qr-payment-config",
  (input: UpdateQrPaymentConfigInput) =>
    new WorkflowResponse(updateQrPaymentConfigStep(input)),
)
