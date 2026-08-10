import type { Link } from "@medusajs/framework/modules-sdk"
import type { OrderDTO } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { z } from "@medusajs/framework/zod"
import { createOrderWorkflow } from "@medusajs/medusa/core-flows"

import { COMPANY_MODULE } from "../../modules/company"

const orderMetadataSchema = z.object({
  company_id: z.unknown().optional(),
})

createOrderWorkflow.hooks.orderCreated(
  async ({ order }: { order: OrderDTO }, { container }) => {
    const parsedMetadata = orderMetadataSchema.safeParse(order.metadata)
    const companyId = parsedMetadata.success
      ? parsedMetadata.data.company_id
      : undefined
    if (typeof companyId !== "string" || companyId === "") {
      return new StepResponse(undefined, null)
    }

    const orderId = order.id
    if (orderId === "") {
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
