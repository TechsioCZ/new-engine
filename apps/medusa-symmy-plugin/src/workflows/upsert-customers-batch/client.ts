import type { MedusaContainer, MetadataType } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import {
  createCustomerAddressesWorkflow,
  createCustomersWorkflow,
  linkCustomerGroupsToCustomerWorkflow,
  updateCustomerAddressesWorkflow,
  updateCustomersWorkflow,
} from "@medusajs/medusa/core-flows"

import { SYMMY_CUSTOMER_GROUP_CODE_MODULE } from "../../modules/customer-group-code"
import type { SymmyCustomerGroupCodeModuleService } from "../../modules/customer-group-code"
import { customerBatchClientMapperHelper } from "./client-mapper-helper"
import type { CustomerLookupKeys } from "./client-mapper-helper"
import type { CustomerAddressInput, CustomerInput } from "./types"

export interface ExistingAddress {
  id: string
  customer_id: string
}

export interface ExistingGroup {
  id: string
  name: string
  code?: string | null
  erp_code?: string | null
  metadata: MetadataType
}

export interface ExistingCustomer {
  id: string
  email: string | null
  metadata: MetadataType
  groups: ExistingGroup[]
  addresses: ExistingAddress[]
}

export interface ExistingCustomerIndex {
  byId: Map<string, ExistingCustomer>
  byEmail: Map<string, ExistingCustomer>
  byErpId: Map<string, ExistingCustomer>
  byVatId: Map<string, ExistingCustomer>
  byCompanyRegistrationNumber: Map<string, ExistingCustomer>
}

export interface CustomerGroupIndex {
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
const metadataSchema = z.record(z.string(), z.json()).nullable()

const decodeGroup = (value: unknown): ExistingGroup | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null
  }
  const id: unknown = Reflect.get(value, "id")
  const name: unknown = Reflect.get(value, "name")
  if (typeof id !== "string" || typeof name !== "string") {
    return null
  }
  const metadata = metadataSchema.safeParse(
    Reflect.get(value, "metadata") ?? null,
  )
  if (!metadata.success) {
    return null
  }
  return { id, metadata: metadata.data, name }
}

const decodeGroups = (candidates: unknown[]): ExistingGroup[] | null => {
  const groups: ExistingGroup[] = []
  for (const raw of candidates) {
    const group = decodeGroup(raw)
    if (group === null) {
      return null
    }
    groups.push(group)
  }
  return groups
}

const decodeAddresses = (candidates: unknown[]): ExistingAddress[] | null => {
  const addresses: ExistingAddress[] = []
  for (const address of candidates) {
    if (
      typeof address !== "object" ||
      address === null ||
      Array.isArray(address)
    ) {
      return null
    }
    const addressId: unknown = Reflect.get(address, "id")
    const customerId: unknown = Reflect.get(address, "customer_id")
    if (typeof addressId !== "string" || typeof customerId !== "string") {
      return null
    }
    addresses.push({ customer_id: customerId, id: addressId })
  }
  return addresses
}

const decodeCustomer = (value: unknown): ExistingCustomer | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null
  }
  const id: unknown = Reflect.get(value, "id")
  if (typeof id !== "string") {
    return null
  }
  const email: unknown = Reflect.get(value, "email") ?? null
  const metadata = metadataSchema.safeParse(
    Reflect.get(value, "metadata") ?? null,
  )
  if (email !== null && typeof email !== "string") {
    return null
  }
  if (!metadata.success) {
    return null
  }
  const rawGroups: unknown = Reflect.get(value, "groups")
  const rawAddresses: unknown = Reflect.get(value, "addresses")
  if (!Array.isArray(rawGroups) || !Array.isArray(rawAddresses)) {
    return null
  }
  const groups = decodeGroups(rawGroups)
  const addresses = decodeAddresses(rawAddresses)
  if (groups === null || addresses === null) {
    return null
  }
  return { addresses, email, groups, id, metadata: metadata.data }
}

const getQuery = (container: MedusaContainer) =>
  container.resolve(ContainerRegistrationKeys.QUERY)

export type Query = ReturnType<typeof getQuery>

export class CustomerBatchClient {
  private readonly container: MedusaContainer
  private readonly customerGroupCodeService: SymmyCustomerGroupCodeModuleService
  private readonly query: Query
  private readonly mapper = customerBatchClientMapperHelper

  constructor(container: MedusaContainer) {
    this.container = container
    this.customerGroupCodeService =
      container.resolve<SymmyCustomerGroupCodeModuleService>(
        SYMMY_CUSTOMER_GROUP_CODE_MODULE,
      )
    this.query = getQuery(container)
  }

  async preload(customers: CustomerInput[]): Promise<ExistingCustomerIndex> {
    const { ids, emails, metadataIdentifiers } =
      this.mapper.collectCustomerLookupKeys(customers)
    const metadataCustomerIds =
      await this.queryCustomerIdsByMetadata(metadataIdentifiers)
    const [byIdCustomers, byEmailCustomers, byMetadataCustomers] =
      await Promise.all([
        this.queryCustomers({ id: [...ids] }),
        this.queryCustomers({ email: [...emails] }),
        this.queryCustomers({ id: [...metadataCustomerIds] }),
      ])

    return this.mapper.buildCustomerIndex([
      ...byIdCustomers,
      ...byEmailCustomers,
      ...byMetadataCustomers,
    ])
  }

  async preloadGroups(customers: CustomerInput[]): Promise<CustomerGroupIndex> {
    const codes = this.mapper.collectGroupCodes(customers)
    if (codes.size === 0) {
      return { byCode: new Map() }
    }

    const [nameGroups, codeMappings] = await Promise.all([
      this.queryGroups({ name: [...codes] }),
      this.customerGroupCodeService.listByCodes(codes),
    ])
    const codeGroups = await this.queryGroups({
      id: codeMappings.map((mapping) => mapping.customer_group_id),
    })

    return this.mapper.buildGroupIndex(
      [
        ...nameGroups,
        ...this.mapper.applyGroupCodeMappings(codeGroups, codeMappings),
      ],
      codes,
    )
  }

  private async queryGroups(
    filters: Record<string, string[]>,
  ): Promise<ExistingGroup[]> {
    if (Object.values(filters).every((values) => values.length === 0)) {
      return []
    }
    const { data } = await this.query.graph({
      entity: "customer_group",
      fields: ["id", "name", "metadata"],
      filters,
    })
    const rows: unknown[] = data ?? []
    return rows.flatMap((row) => {
      const group = decodeGroup(row)
      return group === null ? [] : [group]
    })
  }

  cacheCustomer(
    index: ExistingCustomerIndex,
    customer: CustomerInput,
    customerId: string,
  ): void {
    this.mapper.addCreatedCustomerToIndex(index, customer, customerId)
  }

  findExistingCustomer(
    customer: CustomerInput,
    index: ExistingCustomerIndex,
  ): ExistingCustomer | null {
    return this.mapper.findExistingCustomer(customer, index)
  }

  async createCustomer(customer: CustomerInput): Promise<{ id: string }> {
    const { result } = await createCustomersWorkflow(this.container).run({
      input: {
        customersData: [this.mapper.buildCreatePayload(customer)],
      },
    })
    const workflowResult: unknown = result
    const created: unknown = Array.isArray(workflowResult)
      ? workflowResult[0]
      : undefined
    if (
      typeof created !== "object" ||
      created === null ||
      Array.isArray(created)
    ) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "createCustomersWorkflow returned empty result",
      )
    }
    const createdId: unknown = Reflect.get(created, "id")
    if (typeof createdId !== "string") {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "createCustomersWorkflow returned empty result",
      )
    }
    return { id: createdId }
  }

  async updateCustomer(
    customerId: string,
    existing: ExistingCustomer,
    customer: CustomerInput,
  ): Promise<void> {
    await updateCustomersWorkflow(this.container).run({
      input: {
        selector: { id: customerId },
        update: this.mapper.buildUpdatePayload(existing, customer),
      },
    })
  }

  async upsertAddresses(
    customerId: string,
    existing: ExistingCustomer | null,
    addresses: CustomerAddressInput[] | undefined,
  ): Promise<void> {
    if (addresses === undefined || addresses.length === 0) {
      return
    }

    if (
      existing === null &&
      addresses.some((address) => address.address_id !== undefined)
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "address_id can only be used when updating a customer",
      )
    }

    const existingAddressIds = new Set(
      (existing?.addresses ?? []).map((address) => address.id),
    )
    const processAddressAt = async (index: number): Promise<void> => {
      const address = addresses[index]
      if (address === undefined) {
        return
      }
      if (address.address_id === undefined) {
        await createCustomerAddressesWorkflow(this.container).run({
          input: {
            addresses: [
              {
                ...this.mapper.buildAddressPayload(address),
                customer_id: customerId,
              },
            ],
          },
        })
      } else {
        const ownsAddress =
          existing === null || existingAddressIds.has(address.address_id)
        if (ownsAddress) {
          await updateCustomerAddressesWorkflow(this.container).run({
            input: {
              selector: { customer_id: customerId, id: address.address_id },
              update: this.mapper.buildAddressPayload(address),
            },
          })
        } else {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Address '${address.address_id}' does not belong to customer '${customerId}'`,
          )
        }
      }
      await processAddressAt(index + 1)
    }
    await processAddressAt(0)
  }

  async syncGroups(
    customerId: string,
    existing: ExistingCustomer | null,
    groupCodes: string[] | undefined,
    groupIndex: CustomerGroupIndex,
  ): Promise<void> {
    if (groupCodes === undefined) {
      return
    }

    const targetIds = new Set<string>()
    for (const code of groupCodes) {
      const group = groupIndex.byCode.get(code)
      if (group === undefined) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Customer group code '${code}' was not found`,
        )
      }
      targetIds.add(group.id)
    }

    const currentIds = new Set(
      (existing?.groups ?? []).map((group) => group.id),
    )
    const add = [...targetIds].filter((id) => !currentIds.has(id))
    const remove = [...currentIds].filter((id) => !targetIds.has(id))

    if (add.length === 0 && remove.length === 0) {
      return
    }

    await linkCustomerGroupsToCustomerWorkflow(this.container).run({
      input: {
        add,
        id: customerId,
        remove,
      },
    })
  }

  private async queryCustomers(
    filters: Record<string, string[]>,
  ): Promise<ExistingCustomer[]> {
    if (Object.values(filters).every((values) => values.length === 0)) {
      return []
    }
    const { data } = await this.query.graph({
      entity: "customer",
      fields: [...CUSTOMER_FIELDS],
      filters,
    })
    const rows: unknown[] = data ?? []
    return rows.flatMap((row) => {
      const customer = decodeCustomer(row)
      return customer === null ? [] : [customer]
    })
  }

  private async queryCustomerIdsByMetadata(
    identifiers: CustomerLookupKeys["metadataIdentifiers"],
  ): Promise<Set<string>> {
    const queries = Object.entries(identifiers).flatMap(([key, values]) =>
      values.size === 0
        ? []
        : [
            this.query.graph({
              entity: "customer",
              fields: ["id"],
              filters: { metadata: { [key]: [...values] } },
            }),
          ],
    )
    const queryResults = await Promise.all(queries)
    const ids = new Set<string>()
    for (const { data } of queryResults) {
      const rows: unknown[] = data ?? []
      for (const row of rows) {
        if (typeof row !== "object" || row === null || Array.isArray(row)) {
          continue
        }
        const id: unknown = Reflect.get(row, "id")
        if (typeof id === "string") {
          ids.add(id)
        }
      }
    }
    return ids
  }
}
