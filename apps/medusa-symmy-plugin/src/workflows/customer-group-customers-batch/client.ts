import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { linkCustomerGroupsToCustomerWorkflow } from "@medusajs/medusa/core-flows"
import {
  SYMMY_CUSTOMER_GROUP_CODE_MODULE,
  type SymmyCustomerGroupCodeModuleService,
} from "../../modules/customer-group-code"
import type {
  CustomerGroupCustomerIdentifier,
  CustomerGroupCustomerIdentifierType,
} from "./types"

type ExistingCustomer = {
  id: string
  email: string | null
  metadata: Record<string, unknown> | null
  groups: { id: string }[]
}

type CustomerIndex = {
  byId: Map<string, ExistingCustomer>
  byEmail: Map<string, ExistingCustomer>
  byErpId: Map<string, ExistingCustomer>
}

const CUSTOMER_FIELDS = ["id", "email", "metadata", "groups.id"] as const

const getQuery = (container: MedusaContainer) =>
  container.resolve(ContainerRegistrationKeys.QUERY)

export type Query = ReturnType<typeof getQuery>

export class CustomerGroupCustomersBatchClient {
  private readonly container: MedusaContainer
  private readonly customerGroupCodeService: SymmyCustomerGroupCodeModuleService
  private readonly query: Query

  constructor(container: MedusaContainer) {
    this.container = container
    this.customerGroupCodeService =
      container.resolve<SymmyCustomerGroupCodeModuleService>(
        SYMMY_CUSTOMER_GROUP_CODE_MODULE
      )
    this.query = getQuery(container)
  }

  async resolveCustomerGroupId(code: string): Promise<string | null> {
    const [mapping] = await this.customerGroupCodeService.listByCodes(
      new Set([code])
    )
    if (mapping) {
      return mapping.customer_group_id
    }

    const { data } = await this.query.graph({
      entity: "customer_group",
      fields: ["id"],
      filters: { name: [code] },
    })

    return ((data ?? []) as { id: string }[])[0]?.id ?? null
  }

  async preloadCustomers(
    identifiers: CustomerGroupCustomerIdentifier[]
  ): Promise<CustomerIndex> {
    const ids = new Set<string>()
    const emails = new Set<string>()
    const erpIds = new Set<string>()

    for (const identifier of identifiers) {
      if (
        identifier.identifier_type === "customer_id" &&
        identifier.customer_id
      ) {
        ids.add(identifier.customer_id)
      }
      if (identifier.identifier_type === "email" && identifier.email) {
        emails.add(identifier.email.toLowerCase())
      }
      if (identifier.identifier_type === "erp_id" && identifier.erp_id) {
        erpIds.add(identifier.erp_id)
      }
    }

    const erpCustomerIds = await this.queryCustomerIdsByErpId(erpIds)
    const [byId, byEmail, byErpId] = await Promise.all([
      this.queryCustomers({ id: Array.from(ids) }),
      this.queryCustomers({ email: Array.from(emails) }),
      this.queryCustomers({ id: Array.from(erpCustomerIds) }),
    ])

    return this.buildCustomerIndex([...byId, ...byEmail, ...byErpId])
  }

  findCustomer(
    identifier: CustomerGroupCustomerIdentifier,
    index: CustomerIndex
  ): ExistingCustomer | null {
    if (identifier.identifier_type === "customer_id") {
      return identifier.customer_id
        ? (index.byId.get(identifier.customer_id) ?? null)
        : null
    }
    if (identifier.identifier_type === "email") {
      return identifier.email
        ? (index.byEmail.get(identifier.email.toLowerCase()) ?? null)
        : null
    }
    if (identifier.identifier_type === "erp_id") {
      return identifier.erp_id
        ? (index.byErpId.get(identifier.erp_id) ?? null)
        : null
    }

    return null
  }

  async assignCustomerToGroup(customer: ExistingCustomer, groupId: string) {
    if (customer.groups.some((group) => group.id === groupId)) {
      return
    }

    await linkCustomerGroupsToCustomerWorkflow(this.container).run({
      input: {
        id: customer.id,
        add: [groupId],
        remove: [],
      },
    })
  }

  getIdentifierValue(identifier: CustomerGroupCustomerIdentifier): string {
    return (
      this.getIdentifierFieldValue(identifier, identifier.identifier_type) ?? ""
    )
  }

  private async queryCustomers(filters: Record<string, string[]>) {
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

  private async queryCustomerIdsByErpId(
    erpIds: Set<string>
  ): Promise<Set<string>> {
    if (!erpIds.size) {
      return new Set()
    }

    const { data } = await this.query.graph({
      entity: "customer",
      fields: ["id"],
      filters: {
        metadata: {
          erp_id: Array.from(erpIds),
        },
      },
    })

    return new Set(((data ?? []) as { id: string }[]).map((row) => row.id))
  }

  private buildCustomerIndex(customers: ExistingCustomer[]): CustomerIndex {
    const byId = new Map<string, ExistingCustomer>()
    const byEmail = new Map<string, ExistingCustomer>()
    const byErpId = new Map<string, ExistingCustomer>()

    for (const customer of customers) {
      byId.set(customer.id, customer)
      if (customer.email) {
        byEmail.set(customer.email.toLowerCase(), customer)
      }
      const erpId = this.stringMetadataValue(customer.metadata, "erp_id")
      if (erpId) {
        byErpId.set(erpId, customer)
      }
    }

    return { byId, byEmail, byErpId }
  }

  private getIdentifierFieldValue(
    identifier: CustomerGroupCustomerIdentifier,
    type: CustomerGroupCustomerIdentifierType
  ) {
    const value = identifier[type]
    return typeof value === "string" && value.length ? value : null
  }

  private stringMetadataValue(
    metadata: Record<string, unknown> | null | undefined,
    key: string
  ) {
    const value = metadata?.[key]
    return typeof value === "string" && value.length ? value : null
  }
}
