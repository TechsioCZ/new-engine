import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { GLSClientModuleService } from "../../../../modules/gls-client"
import { GLS_CLIENT_MODULE } from "../../../../modules/gls-client"
import type { PacketaClientModuleService } from "../../../../modules/packeta-client"
import { PACKETA_CLIENT_MODULE } from "../../../../modules/packeta-client"
import type { PplClientModuleService } from "../../../../modules/ppl-client"
import { PPL_CLIENT_MODULE } from "../../../../modules/ppl-client"
import {
  ORDER_EXPEDITION_CARRIER_OPTIONS,
  type OrderExpeditionCarrierKey,
} from "../../../../utils/order-expedition"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const enabledCarriers = await resolveEnabledCarriers(req)

  res.json({
    carriers: ORDER_EXPEDITION_CARRIER_OPTIONS.filter(
      (carrier) =>
        carrier.value === "other" || enabledCarriers.has(carrier.value)
    ),
  })
}

async function resolveEnabledCarriers(req: MedusaRequest) {
  const checks: Promise<OrderExpeditionCarrierKey | null>[] = []

  if (process.env.FEATURE_GLS_ENABLED === "1") {
    checks.push(
      req.scope
        .resolve<GLSClientModuleService>(GLS_CLIENT_MODULE)
        .getActiveConfig()
        .then((config) => (config.is_enabled ? "gls" : null))
    )
  }

  if (process.env.FEATURE_PACKETA_ENABLED === "1") {
    checks.push(
      req.scope
        .resolve<PacketaClientModuleService>(PACKETA_CLIENT_MODULE)
        .getActiveConfig()
        .then((config) => (config.is_enabled ? "packeta" : null))
    )
  }

  if (process.env.FEATURE_PPL_ENABLED === "1") {
    checks.push(
      req.scope
        .resolve<PplClientModuleService>(PPL_CLIENT_MODULE)
        .getConfig()
        .then((config) => (config?.is_enabled ? "ppl" : null))
    )
  }

  return new Set((await Promise.all(checks)).filter(isCarrierKey))
}

function isCarrierKey(
  carrier: OrderExpeditionCarrierKey | null
): carrier is OrderExpeditionCarrierKey {
  return carrier !== null
}
