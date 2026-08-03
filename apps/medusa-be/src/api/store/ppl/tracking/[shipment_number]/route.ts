import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  PPL_CLIENT_MODULE,
  PPL_STATUS_MESSAGES,
  type PplClientModuleService,
  type PplShipmentState,
} from "../../../../../modules/ppl-client"

/**
 * GET /store/ppl/tracking/:shipment_number
 *
 * Fetch tracking status for a PPL shipment on-demand.
 * Returns current status from PPL API + tracking URL.
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { shipment_number } = req.params
  const logger = req.scope.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

  if (!shipment_number) {
    res.status(400).json({
      error: "Shipment number is required",
    })
    return
  }

  if (process.env["FEATURE_PPL_ENABLED"] !== "1") {
    res.status(503).json({
      error: "PPL service is not enabled",
    })
    return
  }

  try {
    const pplClient =
      req.scope.resolve<PplClientModuleService>(PPL_CLIENT_MODULE)

    const shipmentInfos = await pplClient.getShipmentInfo({
      shipmentNumbers: [shipment_number],
    })
    const info = shipmentInfos[0]

    const trackingUrl = `https://www.ppl.cz/vyhledat-zasilku?shipmentId=${shipment_number}`

    if (!info) {
      res.status(404).json({
        error: "Shipment not found",
        shipment_number,
        tracking_url: trackingUrl,
      })
      return
    }

    const status = info.shipmentState as PplShipmentState
    const statusMessage = PPL_STATUS_MESSAGES[status] || status

    res.json({
      shipment_number: info.shipmentNumber,
      status,
      status_message: statusMessage,
      status_date: info.stateDate,
      delivered_at: info.deliveryDate || null,
      picked_up_at: info.pickupDate || null,
      cod_paid_at: info.cashOnDelivery?.codPaidDate || null,
      tracking_url: trackingUrl,
    })
  } catch (error) {
    logger.error(
      "PPL tracking error",
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({
      error: "Failed to fetch tracking status",
      shipment_number,
      tracking_url: `https://www.ppl.cz/vyhledat-zasilku?shipmentId=${shipment_number}`,
    })
  }
}
