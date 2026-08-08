import type { CustomerUpdatableFields, Query } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

import { withoutCustomerAccountDeactivationNonce } from "../../utils/customer-account-deactivation"
import { normalizeEmail } from "../../utils/email"
import { hasArrayData, isObjectRecord } from "../../utils/guards"
import { normalizeReactivatedCustomerFirstName } from "./normalizers"
import type {
  CustomerRecord,
  ReactivateCustomerAccountInput,
} from "./steps/prepare-customer-account-reactivation"

interface ProviderIdentityRecord {
  auth_identity?: {
    app_metadata?: Record<string, unknown> | null
  } | null
  auth_identity_id?: string | null
  entity_id?: string | null
  id: string
}

const isProviderIdentityRecord = (
  value: unknown,
): value is ProviderIdentityRecord => {
  if (!isObjectRecord(value)) {
    return false
  }

  const {
    auth_identity: authIdentity,
    auth_identity_id: authIdentityId,
    entity_id: entityId,
    id,
  } = value
  if (typeof id !== "string") {
    return false
  }

  if (authIdentity !== undefined && authIdentity !== null) {
    if (!isObjectRecord(authIdentity)) {
      return false
    }

    const { app_metadata: appMetadata } = authIdentity
    if (
      appMetadata !== undefined &&
      appMetadata !== null &&
      !isObjectRecord(appMetadata)
    ) {
      return false
    }
  }

  if (
    authIdentityId !== undefined &&
    authIdentityId !== null &&
    typeof authIdentityId !== "string"
  ) {
    return false
  }

  return (
    entityId === undefined || entityId === null || typeof entityId === "string"
  )
}

const mergeCustomerMetadata = (
  existingMetadata?: Record<string, unknown> | null,
  inputMetadata?: Record<string, unknown> | null,
): Record<string, unknown> | null => {
  const mergedMetadata =
    inputMetadata === undefined || inputMetadata === null
      ? existingMetadata
      : { ...existingMetadata, ...inputMetadata }

  return mergedMetadata === undefined || mergedMetadata === null
    ? null
    : withoutCustomerAccountDeactivationNonce(mergedMetadata)
}

export const verifyAuthIdentityEmail = async ({
  authIdentityId,
  customerId,
  email,
  query,
}: {
  authIdentityId: string
  customerId: string
  email: string
  query: Query
}): Promise<void> => {
  const providerIdentityResult: unknown = await query.graph({
    entity: "provider_identity",
    fields: [
      "id",
      "auth_identity_id",
      "entity_id",
      "auth_identity.app_metadata",
    ],
    filters: {
      auth_identity_id: authIdentityId,
      provider: "emailpass",
    },
  })

  if (!hasArrayData(providerIdentityResult, isProviderIdentityRecord)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Unexpected response shape while loading auth identity.",
    )
  }

  const providerIdentity = providerIdentityResult.data.find(
    (identity) => identity.auth_identity_id === authIdentityId,
  )

  if (
    normalizeEmail(providerIdentity?.entity_id ?? "") !== email ||
    providerIdentity?.auth_identity?.app_metadata?.["customer_id"] !==
      customerId
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Authenticated identity does not match the customer email.",
    )
  }
}

export const buildReactivatedCustomerUpdateInput = (
  input: ReactivateCustomerAccountInput,
  customer: CustomerRecord,
): CustomerUpdatableFields => ({
  company_name: input.company_name ?? customer.company_name ?? null,
  first_name: normalizeReactivatedCustomerFirstName(
    input.first_name ?? customer.first_name,
  ),
  last_name: input.last_name ?? customer.last_name ?? null,
  metadata: mergeCustomerMetadata(customer.metadata, input.metadata),
  phone: input.phone ?? customer.phone ?? null,
})
