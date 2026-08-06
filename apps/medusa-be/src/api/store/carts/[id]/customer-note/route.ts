import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import type { MedusaContainer, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { updateCartWorkflow } from "@medusajs/medusa/core-flows"

import type { StoreSetCartCustomerNoteType } from "../../validators"

const CartRecordSchema = z.object({
  customer_id: z.string().nullable().optional(),
  id: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

const retrieveCart = async (scope: MedusaContainer, id: string) => {
  const query = scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: ["id", "customer_id", "metadata"],
    filters: { id },
  })

  return z.array(CartRecordSchema).parse(data).at(0)
}

const post = async (
  req: AuthenticatedMedusaRequest<StoreSetCartCustomerNoteType>,
  res: MedusaResponse,
) => {
  const cartId = typeof req.params["id"] === "string" ? req.params["id"] : ""

  if (!cartId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Cart id is missing")
  }

  const customerId =
    typeof req.auth_context.actor_id === "string"
      ? req.auth_context.actor_id
      : ""

  if (!customerId) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Unauthorized")
  }

  const note = req.validatedBody.note.trim()
  const cart = await retrieveCart(req.scope, cartId)

  if (!cart) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Cart ${cartId} not found`,
    )
  }

  if (
    typeof cart.customer_id !== "string" ||
    cart.customer_id.length === 0 ||
    cart.customer_id !== customerId
  ) {
    throw new MedusaError(MedusaError.Types.FORBIDDEN, "Forbidden")
  }

  if (note.length > 0) {
    const now = new Date().toISOString()
    const metadata = cart.metadata ?? {}
    const createdAt =
      typeof metadata["order_note_created_at"] === "string"
        ? metadata["order_note_created_at"]
        : now

    await updateCartWorkflow(req.scope).run({
      input: {
        id: cartId,
        metadata: {
          ...metadata,
          order_note: note,
          order_note_created_at: createdAt,
          order_note_updated_at: now,
        },
      },
    })
  }

  const updatedCart = await retrieveCart(req.scope, cartId)

  res.status(200).json({ cart: updatedCart })
}

export { post as POST }
