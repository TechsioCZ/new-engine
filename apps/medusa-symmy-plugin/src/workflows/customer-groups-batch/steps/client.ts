import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createCustomerGroupsWorkflow,
  updateCustomerGroupsWorkflow,
} from "@medusajs/medusa/core-flows"
import type { CustomerGroupInput } from "../types"
import {
  type CustomerGroupLookupKeys,
  customerGroupsBatchClientMapperHelper,
} from "./client-mapper-helper"

type Metadata = Record<string, unknown>

export type ExistingCustomerGroup = {
  id: string
  name: string
  metadata: Metadata | null
}

export type ExistingCustomerGroupIndex = {
  byId: Map<string, ExistingCustomerGroup>
  byName: Map<string, ExistingCustomerGroup>
  byCode: Map<string, ExistingCustomerGroup>
  byErpCode: Map<string, ExistingCustomerGroup>
}

const CUSTOMER_GROUP_FIELDS = ["id", "name", "metadata"] as const

const getQuery = (container: MedusaContainer) =>
  container.resolve(ContainerRegistrationKeys.QUERY)

export type Query = ReturnType<typeof getQuery>

export class CustomerGroupsBatchClient {
  private readonly container: MedusaContainer
  private readonly query: Query
  private readonly mapper = customerGroupsBatchClientMapperHelper

  constructor(container: MedusaContainer) {
    this.container = container
    this.query = getQuery(container)
  }

  async preload(
    groups: CustomerGroupInput[]
  ): Promise<ExistingCustomerGroupIndex> {
    const { ids, names, codes, erpCodes } =
      this.mapper.collectLookupKeys(groups)
    const metadataGroupIds = await this.queryGroupIdsByMetadata({
      codes,
      erpCodes,
    })
    const [byIdGroups, byNameGroups, byMetadataGroups] = await Promise.all([
      this.queryCustomerGroups({ id: Array.from(ids) }),
      this.queryCustomerGroups({ name: Array.from(names) }),
      this.queryCustomerGroups({ id: Array.from(metadataGroupIds) }),
    ])

    return this.mapper.buildCustomerGroupIndex([
      ...byIdGroups,
      ...byNameGroups,
      ...byMetadataGroups,
    ])
  }

  findExistingCustomerGroup(
    group: CustomerGroupInput,
    index: ExistingCustomerGroupIndex
  ): ExistingCustomerGroup | null {
    return this.mapper.findExistingCustomerGroup(group, index)
  }

  cacheCustomerGroup(
    index: ExistingCustomerGroupIndex,
    group: CustomerGroupInput,
    groupId: string
  ): void {
    this.mapper.addCreatedCustomerGroupToIndex(index, group, groupId)
  }

  async createCustomerGroup(
    group: CustomerGroupInput,
    createdBy?: string
  ): Promise<ExistingCustomerGroup> {
    const { result } = await createCustomerGroupsWorkflow(this.container).run({
      input: {
        customersData: [
          this.mapper.buildCreatePayload(group, createdBy),
        ] as never,
      },
    })
    const created = result?.[0] as unknown as ExistingCustomerGroup | undefined
    if (!created) {
      throw new Error("createCustomerGroupsWorkflow returned empty result")
    }
    return created
  }

  async updateCustomerGroup(
    groupId: string,
    existing: ExistingCustomerGroup,
    group: CustomerGroupInput
  ): Promise<void> {
    await updateCustomerGroupsWorkflow(this.container).run({
      input: {
        selector: { id: groupId },
        update: this.mapper.buildUpdatePayload(existing, group) as never,
      },
    })
  }

  private async queryCustomerGroups(
    filters: Record<string, string[]>
  ): Promise<ExistingCustomerGroup[]> {
    if (Object.values(filters).every((values) => values.length === 0)) {
      return []
    }
    const { data } = await this.query.graph({
      entity: "customer_group",
      fields: CUSTOMER_GROUP_FIELDS as unknown as string[],
      filters,
    })
    return (data ?? []) as ExistingCustomerGroup[]
  }

  private async queryGroupIdsByMetadata(
    identifiers: Pick<CustomerGroupLookupKeys, "codes" | "erpCodes">
  ): Promise<Set<string>> {
    const ids = new Set<string>()
    const metadataLookups: [string, Set<string>][] = [
      ["code", identifiers.codes],
      ["erp_code", identifiers.erpCodes],
    ]
    for (const [key, values] of metadataLookups) {
      if (!values.size) {
        continue
      }
      const { data } = await this.query.graph({
        entity: "customer_group",
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
