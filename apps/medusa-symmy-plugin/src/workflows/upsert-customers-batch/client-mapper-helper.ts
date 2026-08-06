import type {
  CustomerGroupIndex,
  ExistingCustomer,
  ExistingCustomerIndex,
  ExistingGroup,
} from "./client"
import type { CustomerAddressInput, CustomerInput } from "./types"

type Metadata = Record<string, unknown>

type CustomerMetadataIdentifier =
  | "company_registration_number"
  | "erp_id"
  | "vat_id"

export interface CustomerLookupKeys {
  ids: Set<string>
  emails: Set<string>
  metadataIdentifiers: Record<CustomerMetadataIdentifier, Set<string>>
}

export const CustomerBatchClientMapperHelper = {
  addCreatedCustomerToIndex(
    index: ExistingCustomerIndex,
    customer: CustomerInput,
    customerId: string,
  ): void {
    this.addCustomerToIndex(index, {
      addresses: [],
      email: customer.email ?? null,
      groups: [],
      id: customerId,
      metadata: this.buildMetadata(null, customer),
    })
  },

  addCustomerToIndex(
    index: ExistingCustomerIndex,
    customer: ExistingCustomer,
  ): void {
    index.byId.set(customer.id, customer)
    const email = this.normalizeEmail(customer.email)
    if (email !== undefined) {
      index.byEmail.set(email, customer)
    }
    const erpId = this.stringMetadataValue(customer.metadata, "erp_id")
    if (erpId !== null) {
      index.byErpId.set(erpId, customer)
    }
    const vatId = this.stringMetadataValue(customer.metadata, "vat_id")
    if (vatId !== null) {
      index.byVatId.set(vatId, customer)
    }
    const registrationNumber = this.stringMetadataValue(
      customer.metadata,
      "company_registration_number",
    )
    if (registrationNumber !== null) {
      index.byCompanyRegistrationNumber.set(registrationNumber, customer)
    }
  },

  applyGroupCodeMappings(
    groups: ExistingGroup[],
    mappings: {
      code: string | null
      erp_code: string | null
      customer_group_id: string
    }[],
  ): ExistingGroup[] {
    const mappingsByGroupId = new Map(
      mappings.map((mapping) => [mapping.customer_group_id, mapping]),
    )

    return groups.map((group) => {
      const mapping = mappingsByGroupId.get(group.id)
      return mapping === undefined
        ? group
        : { ...group, code: mapping.code, erp_code: mapping.erp_code }
    })
  },

  buildAddressPayload(address: CustomerAddressInput) {
    return {
      address_1: address.address_1,
      ...(address.address_2 === undefined
        ? {}
        : { address_2: address.address_2 }),
      city: address.city,
      ...(address.company === undefined ? {} : { company: address.company }),
      country_code: address.country_code.toLowerCase(),
      ...(address.first_name === undefined
        ? {}
        : { first_name: address.first_name }),
      ...(address.last_name === undefined
        ? {}
        : { last_name: address.last_name }),
      ...(address.phone === undefined ? {} : { phone: address.phone }),
      postal_code: address.postal_code,
    }
  },

  buildCreatePayload(customer: CustomerInput) {
    const email = this.normalizeEmail(customer.email)
    return {
      ...(customer.company_name === undefined
        ? {}
        : { company_name: customer.company_name }),
      ...(email === undefined ? {} : { email }),
      first_name: customer.first_name,
      last_name: customer.last_name,
      metadata: this.buildMetadata(null, customer),
      ...(customer.phone === undefined ? {} : { phone: customer.phone }),
    }
  },

  buildCustomerIndex(customers: ExistingCustomer[]): ExistingCustomerIndex {
    const index: ExistingCustomerIndex = {
      byCompanyRegistrationNumber: new Map(),
      byEmail: new Map(),
      byErpId: new Map(),
      byId: new Map(),
      byVatId: new Map(),
    }

    for (const customer of customers) {
      this.addCustomerToIndex(index, customer)
    }

    return index
  },

  buildGroupIndex(
    groups: ExistingGroup[],
    codes: Set<string>,
  ): CustomerGroupIndex {
    const byCode = new Map<string, ExistingGroup>()

    for (const group of groups) {
      for (const code of [group.name, group.erp_code, group.code]) {
        if (typeof code === "string" && codes.has(code)) {
          byCode.set(code, group)
        }
      }
    }

    return { byCode }
  },

  buildMetadata(
    existingMetadata: Metadata | null | undefined,
    customer: CustomerInput,
  ) {
    return {
      ...existingMetadata,
      ...customer.metadata,
      ...(customer.identifier_type !== "email" &&
      customer.identifier_type !== "customer_id"
        ? {
            [customer.identifier_type]:
              customer.metadata?.[customer.identifier_type],
          }
        : {}),
    }
  },

  buildUpdatePayload(existing: ExistingCustomer, customer: CustomerInput) {
    const email = this.normalizeEmail(customer.email)

    return {
      ...(customer.company_name === undefined
        ? {}
        : { company_name: customer.company_name }),
      first_name: customer.first_name,
      last_name: customer.last_name,
      ...(email === undefined ? {} : { email }),
      ...(customer.phone === undefined ? {} : { phone: customer.phone }),
      metadata: this.buildMetadata(existing.metadata, customer),
    }
  },

  collectCustomerLookupKeys(customers: CustomerInput[]): CustomerLookupKeys {
    const ids = new Set<string>()
    const emails = new Set<string>()
    const metadataIdentifiers: CustomerLookupKeys["metadataIdentifiers"] = {
      company_registration_number: new Set<string>(),
      erp_id: new Set<string>(),
      vat_id: new Set<string>(),
    }

    for (const customer of customers) {
      if (
        customer.identifier_type === "customer_id" &&
        customer.customer_id !== undefined
      ) {
        ids.add(customer.customer_id)
      }
      const email = this.normalizeEmail(customer.email)
      if (email !== undefined) {
        emails.add(email)
      }
      if (
        customer.identifier_type === "erp_id" ||
        customer.identifier_type === "vat_id" ||
        customer.identifier_type === "company_registration_number"
      ) {
        const value = this.stringMetadataValue(
          customer.metadata,
          customer.identifier_type,
        )
        if (value !== null) {
          metadataIdentifiers[customer.identifier_type].add(value)
        }
      }
    }

    return { emails, ids, metadataIdentifiers }
  },

  collectGroupCodes(customers: CustomerInput[]): Set<string> {
    return new Set(
      customers.flatMap((customer) => customer.customer_group_codes ?? []),
    )
  },

  findExistingCustomer(
    customer: CustomerInput,
    index: ExistingCustomerIndex,
  ): ExistingCustomer | null {
    if (
      customer.identifier_type === "customer_id" &&
      customer.customer_id !== undefined
    ) {
      return index.byId.get(customer.customer_id) ?? null
    }
    if (customer.identifier_type === "email" && customer.email !== undefined) {
      return index.byEmail.get(customer.email.toLowerCase()) ?? null
    }

    const identifier = this.stringMetadataValue(
      customer.metadata,
      customer.identifier_type,
    )
    if (identifier === null) {
      return null
    }
    if (customer.identifier_type === "erp_id") {
      return index.byErpId.get(identifier) ?? null
    }
    if (customer.identifier_type === "vat_id") {
      return index.byVatId.get(identifier) ?? null
    }
    if (customer.identifier_type === "company_registration_number") {
      return index.byCompanyRegistrationNumber.get(identifier) ?? null
    }

    return null
  },

  normalizeEmail(email: string | null | undefined) {
    return email?.toLowerCase()
  },

  stringMetadataValue(metadata: Metadata | null | undefined, key: string) {
    const value = metadata?.[key]
    return typeof value === "string" && value.length > 0 ? value : null
  },
}

export const customerBatchClientMapperHelper = CustomerBatchClientMapperHelper
