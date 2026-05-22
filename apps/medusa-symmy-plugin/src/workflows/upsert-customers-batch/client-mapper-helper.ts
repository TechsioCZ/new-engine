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

export type CustomerLookupKeys = {
  ids: Set<string>
  emails: Set<string>
  metadataIdentifiers: Record<CustomerMetadataIdentifier, Set<string>>
}

export class CustomerBatchClientMapperHelper {
  collectCustomerLookupKeys(customers: CustomerInput[]): CustomerLookupKeys {
    const ids = new Set<string>()
    const emails = new Set<string>()
    const metadataIdentifiers: CustomerLookupKeys["metadataIdentifiers"] = {
      company_registration_number: new Set<string>(),
      erp_id: new Set<string>(),
      vat_id: new Set<string>(),
    }

    for (const customer of customers) {
      if (customer.identifier_type === "customer_id" && customer.customer_id) {
        ids.add(customer.customer_id)
      }
      const email = this.normalizeEmail(customer.email)
      if (email) {
        emails.add(email)
      }
      if (
        customer.identifier_type === "erp_id" ||
        customer.identifier_type === "vat_id" ||
        customer.identifier_type === "company_registration_number"
      ) {
        const value = this.stringMetadataValue(
          customer.metadata,
          customer.identifier_type
        )
        if (value) {
          metadataIdentifiers[customer.identifier_type].add(value)
        }
      }
    }

    return { ids, emails, metadataIdentifiers }
  }

  collectGroupCodes(customers: CustomerInput[]): Set<string> {
    return new Set(
      customers.flatMap((customer) => customer.customer_group_codes ?? [])
    )
  }

  buildCustomerIndex(customers: ExistingCustomer[]): ExistingCustomerIndex {
    const index: ExistingCustomerIndex = {
      byId: new Map(),
      byEmail: new Map(),
      byErpId: new Map(),
      byVatId: new Map(),
      byCompanyRegistrationNumber: new Map(),
    }

    for (const customer of customers) {
      this.addCustomerToIndex(index, customer)
    }

    return index
  }

  addCreatedCustomerToIndex(
    index: ExistingCustomerIndex,
    customer: CustomerInput,
    customerId: string
  ): void {
    this.addCustomerToIndex(index, {
      id: customerId,
      email: customer.email ?? null,
      metadata: this.buildMetadata(null, customer),
      groups: [],
      addresses: [],
    })
  }

  findExistingCustomer(
    customer: CustomerInput,
    index: ExistingCustomerIndex
  ): ExistingCustomer | null {
    if (customer.identifier_type === "customer_id" && customer.customer_id) {
      return index.byId.get(customer.customer_id) ?? null
    }
    if (customer.identifier_type === "email" && customer.email) {
      return index.byEmail.get(customer.email.toLowerCase()) ?? null
    }

    const identifier = this.stringMetadataValue(
      customer.metadata,
      customer.identifier_type
    )
    if (!identifier) {
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
  }

  buildGroupIndex(
    groups: ExistingGroup[],
    codes: Set<string>
  ): CustomerGroupIndex {
    const byCode = new Map<string, ExistingGroup>()

    for (const group of groups) {
      for (const code of [group.name, group.erp_code, group.code]) {
        if (code && codes.has(code)) {
          byCode.set(code, group)
        }
      }
    }

    return { byCode }
  }

  applyGroupCodeMappings(
    groups: ExistingGroup[],
    mappings: {
      code: string | null
      erp_code: string | null
      customer_group_id: string
    }[]
  ): ExistingGroup[] {
    const mappingsByGroupId = new Map(
      mappings.map((mapping) => [mapping.customer_group_id, mapping])
    )

    return groups.map((group) => {
      const mapping = mappingsByGroupId.get(group.id)
      return mapping
        ? { ...group, code: mapping.code, erp_code: mapping.erp_code }
        : group
    })
  }

  buildCreatePayload(customer: CustomerInput) {
    return {
      company_name: customer.company_name,
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: this.normalizeEmail(customer.email),
      phone: customer.phone,
      metadata: this.buildMetadata(null, customer),
    }
  }

  buildUpdatePayload(existing: ExistingCustomer, customer: CustomerInput) {
    return {
      company_name: customer.company_name,
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: this.normalizeEmail(customer.email),
      phone: customer.phone,
      metadata: this.buildMetadata(existing.metadata, customer),
    }
  }

  buildAddressPayload(address: CustomerAddressInput) {
    return {
      first_name: address.first_name,
      last_name: address.last_name,
      company: address.company,
      address_1: address.address_1,
      address_2: address.address_2,
      city: address.city,
      postal_code: address.postal_code,
      country_code: address.country_code.toLowerCase(),
      phone: address.phone,
    }
  }

  stringMetadataValue(metadata: Metadata | null | undefined, key: string) {
    const value = metadata?.[key]
    return typeof value === "string" && value.length ? value : null
  }

  private addCustomerToIndex(
    index: ExistingCustomerIndex,
    customer: ExistingCustomer
  ): void {
    index.byId.set(customer.id, customer)
    const email = this.normalizeEmail(customer.email)
    if (email) {
      index.byEmail.set(email, customer)
    }
    const erpId = this.stringMetadataValue(customer.metadata, "erp_id")
    if (erpId) {
      index.byErpId.set(erpId, customer)
    }
    const vatId = this.stringMetadataValue(customer.metadata, "vat_id")
    if (vatId) {
      index.byVatId.set(vatId, customer)
    }
    const registrationNumber = this.stringMetadataValue(
      customer.metadata,
      "company_registration_number"
    )
    if (registrationNumber) {
      index.byCompanyRegistrationNumber.set(registrationNumber, customer)
    }
  }

  private buildMetadata(
    existingMetadata: Metadata | null | undefined,
    customer: CustomerInput
  ) {
    return {
      ...(existingMetadata ?? {}),
      ...(customer.metadata ?? {}),
      ...(customer.identifier_type !== "email" &&
      customer.identifier_type !== "customer_id"
        ? {
            [customer.identifier_type]:
              customer.metadata?.[customer.identifier_type],
          }
        : {}),
    }
  }

  private normalizeEmail(email: string | null | undefined) {
    return email?.toLowerCase()
  }
}

export const customerBatchClientMapperHelper =
  new CustomerBatchClientMapperHelper()
