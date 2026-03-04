import type { Link } from "@medusajs/framework/modules-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createOrderWorkflow } from "@medusajs/medusa/core-flows"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { COMPANY_MODULE } from "../../modules/company"

createOrderWorkflow.hooks.orderCreated(
  async ({ order }, { container }) => {
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)

    if (!order.metadata?.company_id) {
      return new StepResponse(undefined, null)
    }

    await link.create({
      [Modules.ORDER]: {
        order_id: order.id,
      },
      [COMPANY_MODULE]: {
        company_id: order.metadata?.company_id,
      },
    })

    return new StepResponse(undefined, order.id)
  },
  async (orderId, { container }) => {
    if (!orderId) {
      return
    }

    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)

    await link.dismiss({
      [Modules.ORDER]: {
        order_id: orderId,
      },
    })
  }
)
