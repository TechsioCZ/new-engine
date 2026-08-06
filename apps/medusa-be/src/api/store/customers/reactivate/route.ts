import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { reactivateCustomerAccountWorkflow } from "../../../../workflows/customer/workflows/reactivate-customer-account"
import type { StoreReactivateCustomerAccountSchemaType } from "../validators"

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function POST(
  req: AuthenticatedMedusaRequest<StoreReactivateCustomerAccountSchemaType>,
  res: MedusaResponse
) {
  const email = normalizeEmail(req.validatedBody.email)
  const authEmail =
    typeof req.auth_context.entity_id === "string"
      ? normalizeEmail(req.auth_context.entity_id)
      : null

  if (authEmail !== email) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Authenticated identity does not match the customer email."
    )
  }

  const { result } = await reactivateCustomerAccountWorkflow(req.scope).run({
    input: {
      auth_identity_id: req.auth_context.auth_identity_id,
      email,
      first_name: req.validatedBody.first_name,
      last_name: req.validatedBody.last_name,
    },
  })

  res.status(200).json({
    customer_id: result.customer_id,
    reactivated: result.reactivated,
  })
}
