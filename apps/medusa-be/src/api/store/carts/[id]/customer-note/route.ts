import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import type { MedusaContainer, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { updateCartWorkflow } from "@medusajs/medusa/core-flows"
import type { StoreSetCartCustomerNoteType } from "../../validators"

type CartRecord = {
  customer_id?: string | null
  id: string
  metadata?: Record<string, unknown> | null
}

async function retrieveCart(scope: MedusaContainer, id: string) {
  const query = scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const {
    data: [cart],
  } = await query.graph({
    entity: "cart",
    fields: ["id", "customer_id", "metadata"],
    filters: { id },
  })

  return cart as CartRecord | undefined
}

export async function POST(
  req: AuthenticatedMedusaRequest<StoreSetCartCustomerNoteType>,
  res: MedusaResponse
) {
  const { id: cartId } = req.params as { id: string }
  const customerId = req.auth_context.actor_id as string
  const note = req.validatedBody.note.trim()

  const cart = await retrieveCart(req.scope, cartId)

  if (!cart) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Cart ${cartId} not found`
    )
  }

  if (!cart.customer_id || cart.customer_id !== customerId) {
    throw new MedusaError(MedusaError.Types.FORBIDDEN, "Forbidden")
  }

  if (note) {
    const now = new Date().toISOString()
    const metadata = cart.metadata ?? {}
    const createdAt =
      typeof metadata.order_note_created_at === "string"
        ? metadata.order_note_created_at
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
