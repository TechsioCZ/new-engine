import type {
  MetadataType,
  CustomerUpdatableFields,
  Query,
} from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { getRecordValue } from "@techsio/std/object"

import { withoutCustomerAccountDeactivationNonce } from "../../utils/customer-account-deactivation"
import { normalizeEmail } from "../../utils/email"
import { normalizeReactivatedCustomerFirstName } from "./normalizers"
import type {
  CustomerRecord,
  ReactivateCustomerAccountInput,
} from "./steps/prepare-customer-account-reactivation"

const mergeCustomerMetadata = (
  existingMetadata?: MetadataType,
  inputMetadata?: MetadataType,
): MetadataType => {
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
  const providerIdentityResult: {
    data: {
      auth_identity: { app_metadata: MetadataType } | null
      auth_identity_id: string
      entity_id: string
      id: string
    }[]
  } = await query.graph({
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

  const providerIdentity = providerIdentityResult.data.find(
    (identity) => identity.auth_identity_id === authIdentityId,
  )

  if (
    normalizeEmail(providerIdentity?.entity_id ?? "") !== email ||
    (providerIdentity?.auth_identity?.app_metadata === undefined ||
    providerIdentity.auth_identity.app_metadata === null
      ? undefined
      : getRecordValue(
          providerIdentity.auth_identity.app_metadata,
          "customer_id",
        )) !== customerId
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
