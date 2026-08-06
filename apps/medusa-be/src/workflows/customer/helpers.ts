import type { Query } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { hasArrayData } from "../../utils/guards"
import { normalizeReactivatedCustomerFirstName } from "./normalizers"
import type {
  CreateOrReactivateCustomerAccountInput,
  CustomerRecord,
  ReactivateCustomerAccountUpdateInput,
} from "./steps/create-or-reactivate-customer-account"

type ProviderIdentityRecord = {
  auth_identity_id?: string | null
  entity_id?: string | null
  id: string
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function verifyAuthIdentityEmail({
  authIdentityId,
  email,
  query,
}: {
  authIdentityId: string
  email: string
  query: Query
}) {
  const providerIdentityResult: unknown = await query.graph({
    entity: "provider_identity",
    fields: ["id", "auth_identity_id", "entity_id"],
    filters: {
      auth_identity_id: authIdentityId,
      provider: "emailpass",
    },
  })

  if (!hasArrayData<ProviderIdentityRecord>(providerIdentityResult)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Unexpected response shape while loading auth identity."
    )
  }

  const providerIdentity = providerIdentityResult.data.find(
    (identity) => identity.auth_identity_id === authIdentityId
  )

  if (normalizeEmail(providerIdentity?.entity_id ?? "") !== email) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Authenticated identity does not match the customer email."
    )
  }
}

export function buildReactivatedCustomerUpdateInput(
  input: CreateOrReactivateCustomerAccountInput,
  customer: CustomerRecord
): ReactivateCustomerAccountUpdateInput {
  return {
    company_name: input.company_name ?? customer.company_name ?? null,
    first_name: normalizeReactivatedCustomerFirstName(
      input.first_name ?? customer.first_name
    ),
    has_account: true,
    last_name: input.last_name ?? customer.last_name ?? null,
    metadata: input.metadata ?? customer.metadata ?? null,
    phone: input.phone ?? customer.phone ?? null,
  }
}
