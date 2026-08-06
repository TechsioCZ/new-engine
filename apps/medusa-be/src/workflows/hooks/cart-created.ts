import type { Link } from "@medusajs/framework/modules-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { createCartWorkflow } from "@medusajs/medusa/core-flows"
import { isRecord } from "@techsio/std/object"

import { COMPANY_MODULE } from "../../modules/company"

createCartWorkflow.hooks.cartCreated(
  async (
    { cart },
    { container },
  ): Promise<
    | StepResponse<undefined, null>
    | StepResponse<undefined, { cart_id: string; company_id: string }>
  > => {
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)

    const cartData: unknown = cart
    if (!isRecord(cartData) || typeof cartData["id"] !== "string") {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Cart-created hook received a cart without a valid id",
      )
    }

    const metadata = isRecord(cartData["metadata"])
      ? cartData["metadata"]
      : undefined
    const companyId = metadata?.["company_id"]
    if (typeof companyId !== "string" || companyId === "") {
      return new StepResponse(undefined, null)
    }

    await link.create({
      [COMPANY_MODULE]: {
        company_id: companyId,
      },
      [Modules.CART]: {
        cart_id: cartData["id"],
      },
    })

    return new StepResponse(undefined, {
      cart_id: cartData["id"],
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
