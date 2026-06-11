import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import type { RemoteQueryFunction } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { customerRejectQuoteWorkflow } from "../../../../../workflows/quote/workflows"
import type { RejectQuoteType } from "../../validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<RejectQuoteType>,
  res: MedusaResponse
) => {
  const { id } = req.params

  if (!id) {
    throw new Error("Missing quote id")
  }

  const query = req.scope.resolve<RemoteQueryFunction>(
    ContainerRegistrationKeys.QUERY
  )

  await customerRejectQuoteWorkflow(req.scope).run({
    input: {
      quote_id: id,
      customer_id: req.auth_context.actor_id,
      ...req.validatedBody,
    },
  })

  const {
    data: [quote],
  } = await query.graph(
    {
      entity: "quote",
      fields: req.queryConfig.fields,
      filters: { id, customer_id: req.auth_context.actor_id },
    },
    { throwIfKeyNotFound: true }
  )

  return res.json({ quote })
}
