import type { Link } from "@medusajs/framework/modules-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { z } from "@medusajs/framework/zod"
import { createCartWorkflow } from "@medusajs/medusa/core-flows"

import { COMPANY_MODULE } from "../../modules/company"

const cartMetadataSchema = z.object({ company_id: z.unknown().optional() })

createCartWorkflow.hooks.cartCreated(
  async (
    { cart },
    { container },
  ): Promise<
    | StepResponse<undefined, null>
    | StepResponse<undefined, { cart_id: string; company_id: string }>
  > => {
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)

    const cartId = cart.id
    if (cartId === "") {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Cart-created hook received a cart without a valid id",
      )
    }

    const parsedMetadata = cartMetadataSchema.safeParse(cart.metadata)
    const companyId = parsedMetadata.success
      ? parsedMetadata.data.company_id
      : undefined
    if (typeof companyId !== "string" || companyId === "") {
      return new StepResponse(undefined, null)
    }

    await link.create({
      [COMPANY_MODULE]: {
        company_id: companyId,
      },
      [Modules.CART]: {
        cart_id: cartId,
      },
    })

    return new StepResponse(undefined, {
      cart_id: cartId,
      company_id: companyId,
    })
  },
  async (
    input: { cart_id: string; company_id: string } | null | undefined,
    { container },
  ) => {
    if (!input) {
      return
    }

    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)

    await link.dismiss({
      [COMPANY_MODULE]: {
        company_id: input.company_id,
      },
      [Modules.CART]: {
        cart_id: input.cart_id,
      },
    })
  },
)
