import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createCustomerAddressesWorkflow,
  createCustomersWorkflow,
  linkCustomerGroupsToCustomerWorkflow,
  updateCustomerAddressesWorkflow,
  updateCustomersWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  SYMMY_CUSTOMER_GROUP_CODE_MODULE,
  type SymmyCustomerGroupCodeModuleService,
} from "../../modules/customer-group-code"
import {
  type CustomerLookupKeys,
  customerBatchClientMapperHelper,
} from "./client-mapper-helper"
import type { CustomerAddressInput, CustomerInput } from "./types"

type Metadata = Record<string, unknown>

export type ExistingAddress = {
  id: string
  customer_id: string
}

export type ExistingGroup = {
  id: string
  name: string
  code?: string | null
  erp_code?: string | null
  metadata: Metadata | null
}

export type ExistingCustomer = {
  id: string
  email: string | null
  metadata: Metadata | null
  groups: ExistingGroup[]
  addresses: ExistingAddress[]
}

export type ExistingCustomerIndex = {
  byId: Map<string, ExistingCustomer>
  byEmail: Map<string, ExistingCustomer>
  byErpId: Map<string, ExistingCustomer>
  byVatId: Map<string, ExistingCustomer>
  byCompanyRegistrationNumber: Map<string, ExistingCustomer>
}

export type CustomerGroupIndex = {
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

export class CustomerBatchClient {
  private readonly container: MedusaContainer
  private readonly customerGroupCodeService: SymmyCustomerGroupCodeModuleService
  private readonly query: Query
  private readonly mapper = customerBatchClientMapperHelper

  constructor(container: MedusaContainer) {
    this.container = container
    this.customerGroupCodeService =
      container.resolve<SymmyCustomerGroupCodeModuleService>(
        SYMMY_CUSTOMER_GROUP_CODE_MODULE
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
        this.queryCustomers({ id: Array.from(ids) }),
        this.queryCustomers({ email: Array.from(emails) }),
        this.queryCustomers({ id: Array.from(metadataCustomerIds) }),
      ])

    return this.mapper.buildCustomerIndex([
      ...byIdCustomers,
      ...byEmailCustomers,
      ...byMetadataCustomers,
    ])
  }

  async preloadGroups(customers: CustomerInput[]): Promise<CustomerGroupIndex> {
    const codes = this.mapper.collectGroupCodes(customers)
    if (!codes.size) {
      return { byCode: new Map() }
    }

    const [nameGroups, codeMappings] = await Promise.all([
      this.queryGroups({ name: Array.from(codes) }),
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
      codes
    )
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
    index: ExistingCustomerIndex,
    customer: CustomerInput,
    customerId: string
  ): void {
    this.mapper.addCreatedCustomerToIndex(index, customer, customerId)
  }

  findExistingCustomer(
    customer: CustomerInput,
    index: ExistingCustomerIndex
  ): ExistingCustomer | null {
    return this.mapper.findExistingCustomer(customer, index)
  }

  async createCustomer(customer: CustomerInput): Promise<ExistingCustomer> {
    const { result } = await createCustomersWorkflow(this.container).run({
      input: {
        customersData: [this.mapper.buildCreatePayload(customer)] as never,
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
        update: this.mapper.buildUpdatePayload(existing, customer) as never,
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
            update: this.mapper.buildAddressPayload(address) as never,
          },
        })
        continue
      }

      await createCustomerAddressesWorkflow(this.container).run({
        input: {
          addresses: [
            {
              ...this.mapper.buildAddressPayload(address),
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
    groupIndex: CustomerGroupIndex
  ): Promise<void> {
    if (!groupCodes) {
      return
    }

    const targetIds = new Set<string>()
    for (const code of groupCodes) {
      const group = groupIndex.byCode.get(code)
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
    identifiers: CustomerLookupKeys["metadataIdentifiers"]
  ): Promise<Set<string>> {
    const ids = new Set<string>()
    for (const [key, values] of Object.entries(identifiers)) {
      if (!values.size) {
        continue
      }
      const { data } = await this.query.graph({
        entity: "customer",
        fields: ["id"],
        filters: {
          metadata: {
            [key]: Array.from(values),
          },
        },
      })
      for (const row of (data ?? []) as { id: string }[]) {
        ids.add(row.id)
      }
    }
    return ids
  }
}
