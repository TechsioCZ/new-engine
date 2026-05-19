import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  QR_PAYMENT_MODULE,
  type QrPaymentModuleService,
} from "../../../modules/qr-payment"
import type {
  QrPaymentConfigDTO,
  QrPaymentConfigResponse,
} from "../../../modules/qr-payment/types"
import type { PostAdminQrPaymentConfigSchemaType } from "./validators"

const toConfigResponse = (
  config: QrPaymentConfigDTO
): QrPaymentConfigResponse => ({
  id: config.id,
  iban: config.iban ?? null,
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const qrPaymentService =
    req.scope.resolve<QrPaymentModuleService>(QR_PAYMENT_MODULE)

  const qrPaymentConfig = await qrPaymentService.getConfig()
  if (!qrPaymentConfig) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "QR payment configuration not found. Please restart the server to initialize."
    )
  }

  res.json({ config: toConfigResponse(qrPaymentConfig) })
}

export async function POST(
  req: MedusaRequest<PostAdminQrPaymentConfigSchemaType>,
  res: MedusaResponse
) {
  const qrPaymentService =
    req.scope.resolve<QrPaymentModuleService>(QR_PAYMENT_MODULE)

  const updated = await qrPaymentService.updateConfig(req.validatedBody)

  res.json({ config: toConfigResponse(updated) })
}
