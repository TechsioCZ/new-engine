import { createCartWorkflow } from "@medusajs/medusa/core-flows"
import type { Link } from "@medusajs/framework/modules-sdk"
import type { CartDTO } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { COMPANY_MODULE } from "../../modules/company"

createCartWorkflow.hooks.cartCreated(
  async (
    { cart },
    { container }
  ): Promise<
    | StepResponse<undefined, null>
    | StepResponse<undefined, { cart_id: string; company_id: string }>
  > => {
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)

    const cartInputdata = cart as CartDTO

    if (!cartInputdata.metadata?.company_id) {
      return new StepResponse(undefined, null)
    }

    await link.create({
      [COMPANY_MODULE]: {
        company_id: cartInputdata.metadata?.company_id,
      },
      [Modules.CART]: {
        cart_id: cartInputdata.id,
      },
    })

    return new StepResponse(undefined, {
      cart_id: cartInputdata.id,
      company_id: cartInputdata.metadata?.company_id as string,
    })
  },
  async (input, { container }) => {
    if (!input?.cart_id || !input?.company_id) {
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
  }
)
