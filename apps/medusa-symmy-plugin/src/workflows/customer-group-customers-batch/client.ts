import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { linkCustomerGroupsToCustomerWorkflow } from "@medusajs/medusa/core-flows"

import { SYMMY_CUSTOMER_GROUP_CODE_MODULE } from "../../modules/customer-group-code"
import type { SymmyCustomerGroupCodeModuleService } from "../../modules/customer-group-code"
import type {
  CustomerGroupCustomerIdentifier,
  CustomerGroupCustomerIdentifierType,
} from "./types"

interface ExistingCustomer {
  id: string
  email: string | null
  metadata: object | null
  groups: { id: string }[]
}

interface CustomerIndex {
  byId: Map<string, ExistingCustomer>
  byEmail: Map<string, ExistingCustomer>
  byErpId: Map<string, ExistingCustomer>
}

const CUSTOMER_FIELDS = ["id", "email", "metadata", "groups.id"] as const

const stringMetadataValue = (
  metadata: object | null | undefined,
  key: string,
) => {
  const value: unknown =
    metadata === null || metadata === undefined
      ? undefined
      : Reflect.get(metadata, key)
  return typeof value === "string" && value.length > 0 ? value : null
}

const getIdentifierFieldValue = (
  identifier: CustomerGroupCustomerIdentifier,
  type: CustomerGroupCustomerIdentifierType,
) => {
  const value = identifier[type]
  return typeof value === "string" && value.length > 0 ? value : null
}

const findCustomerInIndex = (
  identifier: CustomerGroupCustomerIdentifier,
  index: CustomerIndex,
): ExistingCustomer | null => {
  const value = getIdentifierFieldValue(identifier, identifier.identifier_type)
  if (value === null) {
    return null
  }
  if (identifier.identifier_type === "customer_id") {
    return index.byId.get(value) ?? null
  }
  if (identifier.identifier_type === "email") {
    return index.byEmail.get(value.toLowerCase()) ?? null
  }
  return index.byErpId.get(value) ?? null
}

const decodeCustomer = (value: unknown): ExistingCustomer | null => {
  if (typeof value !== "object" || value === null) {
    return null
  }
  if (!("id" in value) || typeof value.id !== "string") {
    return null
  }
  const email = "email" in value ? value.email : null
  if (email !== null && typeof email !== "string") {
    return null
  }
  const metadata = "metadata" in value ? value.metadata : null
  if (
    metadata !== null &&
    (typeof metadata !== "object" || Array.isArray(metadata))
  ) {
    return null
  }
  if (!("groups" in value) || !Array.isArray(value.groups)) {
    return null
  }
  const candidates: unknown[] = value.groups
  const groups: { id: string }[] = []
  for (const group of candidates) {
    if (
      typeof group !== "object" ||
      group === null ||
      !("id" in group) ||
      typeof group.id !== "string"
    ) {
      return null
    }
    groups.push({ id: group.id })
  }
  return { email, groups, id: value.id, metadata }
}

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
        SYMMY_CUSTOMER_GROUP_CODE_MODULE,
      )
    this.query = getQuery(container)
  }

  async resolveCustomerGroupId(code: string): Promise<string | null> {
    const [mapping] = await this.customerGroupCodeService.listByCodes(
      new Set([code]),
    )
    if (mapping !== undefined) {
      return mapping.customer_group_id
    }

    const { data } = await this.query.graph({
      entity: "customer_group",
      fields: ["id"],
      filters: { name: [code] },
    })

    const row: unknown = data[0]
    if (typeof row !== "object" || row === null) {
      return null
    }
    if (!("id" in row) || typeof row.id !== "string") {
      return null
    }
    return row.id
  }

  async preloadCustomers(
    identifiers: CustomerGroupCustomerIdentifier[],
  ): Promise<CustomerIndex> {
    const ids = new Set<string>()
    const emails = new Set<string>()
    const erpIds = new Set<string>()

    for (const identifier of identifiers) {
      if (
        identifier.identifier_type === "customer_id" &&
        identifier.customer_id !== undefined
      ) {
        ids.add(identifier.customer_id)
      }
      if (
        identifier.identifier_type === "email" &&
        identifier.email !== undefined
      ) {
        emails.add(identifier.email.toLowerCase())
      }
      if (
        identifier.identifier_type === "erp_id" &&
        identifier.erp_id !== undefined
      ) {
        erpIds.add(identifier.erp_id)
      }
    }

    const erpCustomerIds = await this.queryCustomerIdsByErpId(erpIds)
    const [byId, byEmail, byErpId] = await Promise.all([
      this.queryCustomers({ id: [...ids] }),
      this.queryCustomers({ email: [...emails] }),
      this.queryCustomers({ id: [...erpCustomerIds] }),
    ])

    return CustomerGroupCustomersBatchClient.buildCustomerIndex([
      ...byId,
      ...byEmail,
      ...byErpId,
    ])
  }

  static findCustomer(
    identifier: CustomerGroupCustomerIdentifier,
    index: CustomerIndex,
  ): ExistingCustomer | null {
    return findCustomerInIndex(identifier, index)
  }

  async assignCustomerToGroup(customer: ExistingCustomer, groupId: string) {
    if (customer.groups.some((group) => group.id === groupId)) {
      return
    }

    await linkCustomerGroupsToCustomerWorkflow(this.container).run({
      input: {
        add: [groupId],
        id: customer.id,
        remove: [],
      },
    })
  }

  static getIdentifierValue(
    identifier: CustomerGroupCustomerIdentifier,
  ): string {
    return getIdentifierFieldValue(identifier, identifier.identifier_type) ?? ""
  }

  private async queryCustomers(filters: Record<string, string[]>) {
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

  private async queryCustomerIdsByErpId(
    erpIds: Set<string>,
  ): Promise<Set<string>> {
    if (erpIds.size === 0) {
      return new Set()
    }

    const { data } = await this.query.graph({
      entity: "customer",
      fields: ["id"],
      filters: {
        metadata: {
          erp_id: [...erpIds],
        },
      },
    })

    const ids = new Set<string>()
    const rows: unknown[] = data ?? []
    for (const row of rows) {
      if (
        typeof row === "object" &&
        row !== null &&
        "id" in row &&
        typeof row.id === "string"
      ) {
        ids.add(row.id)
      }
    }
    return ids
  }

  private static buildCustomerIndex(
    customers: ExistingCustomer[],
  ): CustomerIndex {
    const byId = new Map<string, ExistingCustomer>()
    const byEmail = new Map<string, ExistingCustomer>()
    const byErpId = new Map<string, ExistingCustomer>()

    for (const customer of customers) {
      byId.set(customer.id, customer)
      if (customer.email !== null) {
        byEmail.set(customer.email.toLowerCase(), customer)
      }
      const erpId = stringMetadataValue(customer.metadata, "erp_id")
      if (erpId !== null) {
        byErpId.set(erpId, customer)
      }
    }

    return { byEmail, byErpId, byId }
  }
}
