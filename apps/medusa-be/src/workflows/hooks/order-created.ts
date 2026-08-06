import type { Link } from "@medusajs/framework/modules-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { createOrderWorkflow } from "@medusajs/medusa/core-flows"
import { isRecord } from "@techsio/std/object"

import { COMPANY_MODULE } from "../../modules/company"

createOrderWorkflow.hooks.orderCreated(
  async ({ order }, { container }) => {
    const orderValue: unknown = order
    if (!isRecord(orderValue) || !isRecord(orderValue["metadata"])) {
      return new StepResponse(undefined, null)
    }

    const companyId = orderValue["metadata"]["company_id"]
    if (typeof companyId !== "string" || companyId === "") {
      return new StepResponse(undefined, null)
    }

    const orderId = orderValue["id"]
    if (typeof orderId !== "string" || orderId === "") {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Created order is missing its id",
      )
    }

    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
    await link.create({
      [Modules.ORDER]: {
        order_id: orderId,
      },
      [COMPANY_MODULE]: {
        company_id: companyId,
      },
    })

    return new StepResponse(undefined, orderId)
  },
  async (orderId: string | null | undefined, { container }) => {
    if (orderId === undefined || orderId === null || orderId === "") {
      return
    }

    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
    await link.dismiss({
      [Modules.ORDER]: {
        order_id: orderId,
      },
    })
  },
)
