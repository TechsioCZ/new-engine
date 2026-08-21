import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  PRIVATE_FLOW_NOT_FOUND_MESSAGE,
  setPrivateNoStore,
} from "../../../../store/private-flow-utils"

/**
 * Medusa's generic provider-update route accepts its reset JWT without the
 * storefront market authority enforced by our password-reset workflow. Keep
 * this exact customer/emailpass path closed so password updates can only be
 * completed through /auth/customer/emailpass/reset-password/complete.
 */
export function POST(_request: MedusaRequest, response: MedusaResponse) {
  setPrivateNoStore(response)

  return response.status(404).json({
    message: PRIVATE_FLOW_NOT_FOUND_MESSAGE,
    type: "not_found",
  })
}
