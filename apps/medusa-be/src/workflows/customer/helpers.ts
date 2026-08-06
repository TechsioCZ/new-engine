import type { CustomerUpdatableFields, Query } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { normalizeEmail } from "../../utils/email"
import { hasArrayData } from "../../utils/guards"
import { normalizeReactivatedCustomerFirstName } from "./normalizers"
import type {
  CustomerRecord,
  ReactivateCustomerAccountInput,
} from "./steps/prepare-customer-account-reactivation"

type ProviderIdentityRecord = {
  auth_identity_id?: string | null
  entity_id?: string | null
  id: string
}

function mergeCustomerMetadata(
  existingMetadata?: Record<string, unknown> | null,
  inputMetadata?: Record<string, unknown> | null
) {
  if (!inputMetadata) {
    return existingMetadata ?? null
  }

  return {
    ...(existingMetadata ?? {}),
    ...inputMetadata,
  }
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
  input: ReactivateCustomerAccountInput,
  customer: CustomerRecord
): CustomerUpdatableFields {
  return {
    company_name: input.company_name ?? customer.company_name ?? null,
    first_name: normalizeReactivatedCustomerFirstName(
      input.first_name ?? customer.first_name
    ),
    last_name: input.last_name ?? customer.last_name ?? null,
    metadata: mergeCustomerMetadata(customer.metadata, input.metadata),
    phone: input.phone ?? customer.phone ?? null,
  }
}
