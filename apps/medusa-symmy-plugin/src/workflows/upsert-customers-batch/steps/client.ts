import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createCustomerAddressesWorkflow,
  createCustomersWorkflow,
  linkCustomerGroupsToCustomerWorkflow,
  updateCustomerAddressesWorkflow,
  updateCustomersWorkflow,
} from "@medusajs/medusa/core-flows"
import type { CustomerAddressInput, CustomerInput } from "../types"

type Metadata = Record<string, unknown>

export type ExistingAddress = {
  id: string
  customer_id: string
}

export type ExistingGroup = {
  id: string
  name: string
  metadata: Metadata | null
}

export type ExistingCustomer = {
  id: string
  email: string | null
  metadata: Metadata | null
  groups: ExistingGroup[]
  addresses: ExistingAddress[]
}

export type CustomerCache = {
  byId: Map<string, ExistingCustomer>
  byEmail: Map<string, ExistingCustomer>
  byErpId: Map<string, ExistingCustomer>
  byVatId: Map<string, ExistingCustomer>
  byCompanyRegistrationNumber: Map<string, ExistingCustomer>
}

export type GroupCache = {
  byCode: Map<string, ExistingGroup>
}

const CUSTOMER_FIELDS = [
  "id",
  "email",
  "metadata",
  "groups.id",
  "groups.name",
  "groups.metadata",
  "addresses.id",
  "addresses.customer_id",
] as const

const getQuery = (container: MedusaContainer) =>
  container.resolve(ContainerRegistrationKeys.QUERY)

export type Query = ReturnType<typeof getQuery>
type PgConnection = {
  raw<T = { rows: unknown[] }>(sql: string, bindings?: unknown[]): Promise<T>
}

const stringMetadataValue = (
  metadata: Metadata | null | undefined,
  key: string
) => {
  const value = metadata?.[key]
  return typeof value === "string" && value.length ? value : null
}

const normalizeEmail = (email: string | null | undefined) =>
  email?.toLowerCase()

export class CustomerBatchClient {
  private readonly container: MedusaContainer
  private readonly pg: PgConnection
  private readonly query: Query

  constructor(container: MedusaContainer) {
    this.container = container
    this.pg = container.resolve<PgConnection>(
      ContainerRegistrationKeys.PG_CONNECTION
    )
    this.query = getQuery(container)
  }

  async preload(customers: CustomerInput[]): Promise<CustomerCache> {
    const ids = new Set<string>()
    const emails = new Set<string>()
    const metadataIdentifiers = {
      company_registration_number: new Set<string>(),
      erp_id: new Set<string>(),
      vat_id: new Set<string>(),
    }

    for (const customer of customers) {
      if (customer.identifier_type === "customer_id" && customer.customer_id) {
        ids.add(customer.customer_id)
      }
      if (customer.email) {
        emails.add(customer.email.toLowerCase())
      }
      if (
        customer.identifier_type === "erp_id" ||
        customer.identifier_type === "vat_id" ||
        customer.identifier_type === "company_registration_number"
      ) {
        const value = stringMetadataValue(
          customer.metadata,
          customer.identifier_type
        )
        if (value) {
          metadataIdentifiers[customer.identifier_type].add(value)
        }
      }
    }

    const metadataCustomerIds =
      await this.queryCustomerIdsByMetadata(metadataIdentifiers)
    const [byIdCustomers, byEmailCustomers, byMetadataCustomers] =
      await Promise.all([
        this.queryCustomers({ id: Array.from(ids) }),
        this.queryCustomers({ email: Array.from(emails) }),
        this.queryCustomers({ id: Array.from(metadataCustomerIds) }),
      ])

    return this.buildCustomerCache([
      ...byIdCustomers,
      ...byEmailCustomers,
      ...byMetadataCustomers,
    ])
  }

  async preloadGroups(customers: CustomerInput[]): Promise<GroupCache> {
    const codes = new Set(
      customers.flatMap((customer) => customer.customer_group_codes ?? [])
    )
    const byCode = new Map<string, ExistingGroup>()
    if (!codes.size) {
      return { byCode }
    }

    const [nameGroups, metadataGroupIds] = await Promise.all([
      this.queryGroups({ name: Array.from(codes) }),
      this.queryGroupIdsByMetadataCodes(codes),
    ])
    const metadataGroups = await this.queryGroups({
      id: Array.from(metadataGroupIds),
    })

    for (const group of [...nameGroups, ...metadataGroups]) {
      for (const code of [
        group.name,
        stringMetadataValue(group.metadata, "erp_code"),
        stringMetadataValue(group.metadata, "code"),
      ]) {
        if (code && codes.has(code)) {
          byCode.set(code, group)
        }
      }
    }

    return { byCode }
  }

  private async queryGroups(
    filters: Record<string, string[]>
  ): Promise<ExistingGroup[]> {
    if (Object.values(filters).every((values) => values.length === 0)) {
      return []
    }
    const { data } = await this.query.graph({
      entity: "customer_group",
      fields: ["id", "name", "metadata"],
      filters,
    })
    return (data ?? []) as ExistingGroup[]
  }

  cacheCustomer(
    cache: CustomerCache,
    customer: CustomerInput,
    customerId: string
  ): void {
    this.addCustomerToCache(cache, {
      id: customerId,
      email: customer.email ?? null,
      metadata: this.buildMetadata(null, customer),
      groups: [],
      addresses: [],
    })
  }

  findExistingCustomer(
    customer: CustomerInput,
    cache: CustomerCache
  ): ExistingCustomer | null {
    if (customer.identifier_type === "customer_id" && customer.customer_id) {
      return cache.byId.get(customer.customer_id) ?? null
    }
    if (customer.identifier_type === "email" && customer.email) {
      return cache.byEmail.get(customer.email.toLowerCase()) ?? null
    }

    const identifier = stringMetadataValue(
      customer.metadata,
      customer.identifier_type
    )
    if (!identifier) {
      return null
    }
    if (customer.identifier_type === "erp_id") {
      return cache.byErpId.get(identifier) ?? null
    }
    if (customer.identifier_type === "vat_id") {
      return cache.byVatId.get(identifier) ?? null
    }
    if (customer.identifier_type === "company_registration_number") {
      return cache.byCompanyRegistrationNumber.get(identifier) ?? null
    }

    return null
  }

  async createCustomer(customer: CustomerInput): Promise<ExistingCustomer> {
    const { result } = await createCustomersWorkflow(this.container).run({
      input: {
        customersData: [this.buildCreatePayload(customer)] as never,
      },
    })
    const created = result?.[0] as unknown as ExistingCustomer | undefined
    if (!created) {
      throw new Error("createCustomersWorkflow returned empty result")
    }
    return created
  }

  async updateCustomer(
    customerId: string,
    existing: ExistingCustomer,
    customer: CustomerInput
  ): Promise<void> {
    await updateCustomersWorkflow(this.container).run({
      input: {
        selector: { id: customerId },
        update: this.buildUpdatePayload(existing, customer) as never,
      },
    })
  }

  async upsertAddresses(
    customerId: string,
    existing: ExistingCustomer | null,
    addresses: CustomerAddressInput[] | undefined
  ): Promise<void> {
    if (!addresses?.length) {
      return
    }

    if (!existing && addresses.some((address) => address.address_id)) {
      throw new Error("address_id can only be used when updating a customer")
    }

    const existingAddressIds = new Set(
      (existing?.addresses ?? []).map((address) => address.id)
    )
    for (const address of addresses) {
      if (address.address_id) {
        if (existing && !existingAddressIds.has(address.address_id)) {
          throw new Error(
            `Address '${address.address_id}' does not belong to customer '${customerId}'`
          )
        }
        await updateCustomerAddressesWorkflow(this.container).run({
          input: {
            selector: { id: address.address_id, customer_id: customerId },
            update: this.buildAddressPayload(address) as never,
          },
        })
        continue
      }

      await createCustomerAddressesWorkflow(this.container).run({
        input: {
          addresses: [
            {
              ...this.buildAddressPayload(address),
              customer_id: customerId,
            },
          ] as never,
        },
      })
    }
  }

  async syncGroups(
    customerId: string,
    existing: ExistingCustomer | null,
    groupCodes: string[] | undefined,
    groupCache: GroupCache
  ): Promise<void> {
    if (!groupCodes) {
      return
    }

    const targetIds = new Set<string>()
    for (const code of groupCodes) {
      const group = groupCache.byCode.get(code)
      if (!group) {
        throw new Error(`Customer group code '${code}' was not found`)
      }
      targetIds.add(group.id)
    }

    const currentIds = new Set(
      (existing?.groups ?? []).map((group) => group.id)
    )
    const add = Array.from(targetIds).filter((id) => !currentIds.has(id))
    const remove = Array.from(currentIds).filter((id) => !targetIds.has(id))

    if (!(add.length || remove.length)) {
      return
    }

    await linkCustomerGroupsToCustomerWorkflow(this.container).run({
      input: {
        id: customerId,
        add,
        remove,
      },
    })
  }

  private buildCustomerCache(customers: ExistingCustomer[]): CustomerCache {
    const cache: CustomerCache = {
      byId: new Map(),
      byEmail: new Map(),
      byErpId: new Map(),
      byVatId: new Map(),
      byCompanyRegistrationNumber: new Map(),
    }

    for (const customer of customers) {
      this.addCustomerToCache(cache, customer)
    }

    return cache
  }

  private addCustomerToCache(
    cache: CustomerCache,
    customer: ExistingCustomer
  ): void {
    cache.byId.set(customer.id, customer)
    const email = normalizeEmail(customer.email)
    if (email) {
      cache.byEmail.set(email, customer)
    }
    const erpId = stringMetadataValue(customer.metadata, "erp_id")
    if (erpId) {
      cache.byErpId.set(erpId, customer)
    }
    const vatId = stringMetadataValue(customer.metadata, "vat_id")
    if (vatId) {
      cache.byVatId.set(vatId, customer)
    }
    const registrationNumber = stringMetadataValue(
      customer.metadata,
      "company_registration_number"
    )
    if (registrationNumber) {
      cache.byCompanyRegistrationNumber.set(registrationNumber, customer)
    }
  }

  private async queryCustomers(
    filters: Record<string, string[]>
  ): Promise<ExistingCustomer[]> {
    if (Object.values(filters).every((values) => values.length === 0)) {
      return []
    }
    const { data } = await this.query.graph({
      entity: "customer",
      fields: CUSTOMER_FIELDS as unknown as string[],
      filters,
    })
    return (data ?? []) as ExistingCustomer[]
  }

  private async queryCustomerIdsByMetadata(
    identifiers: Record<
      "company_registration_number" | "erp_id" | "vat_id",
      Set<string>
    >
  ): Promise<Set<string>> {
    const ids = new Set<string>()
    for (const [key, values] of Object.entries(identifiers)) {
      if (!values.size) {
        continue
      }
      const valueList = Array.from(values)
      const placeholders = valueList.map(() => "?").join(", ")
      const result = await this.pg.raw<{ rows: { id: string }[] }>(
        `select id from "customer" where deleted_at is null and metadata ->> ? in (${placeholders})`,
        [key, ...valueList]
      )
      for (const row of result.rows ?? []) {
        ids.add(row.id)
      }
    }
    return ids
  }

  private async queryGroupIdsByMetadataCodes(
    codes: Set<string>
  ): Promise<Set<string>> {
    const ids = new Set<string>()
    if (!codes.size) {
      return ids
    }
    const valueList = Array.from(codes)
    const placeholders = valueList.map(() => "?").join(", ")
    const bindings = [...valueList, ...valueList]
    const result = await this.pg.raw<{ rows: { id: string }[] }>(
      `select id from "customer_group"
       where deleted_at is null
       and (
         metadata ->> 'erp_code' in (${placeholders})
         or metadata ->> 'code' in (${placeholders})
       )`,
      bindings
    )
    for (const row of result.rows ?? []) {
      ids.add(row.id)
    }
    return ids
  }

  private buildCreatePayload(customer: CustomerInput) {
    return {
      company_name: customer.company_name,
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email?.toLowerCase(),
      phone: customer.phone,
      metadata: this.buildMetadata(null, customer),
    }
  }

  private buildUpdatePayload(
    existing: ExistingCustomer,
    customer: CustomerInput
  ) {
    return {
      company_name: customer.company_name,
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email?.toLowerCase(),
      phone: customer.phone,
      metadata: this.buildMetadata(existing.metadata, customer),
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

  private buildAddressPayload(address: CustomerAddressInput) {
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
}
