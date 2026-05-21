import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createCustomerGroupsWorkflow,
  updateCustomerGroupsWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  SYMMY_CUSTOMER_GROUP_CODE_MODULE,
  type SymmyCustomerGroupCodeDTO,
  type SymmyCustomerGroupCodeModuleService,
} from "../../modules/customer-group-code"
import {
  type CustomerGroupLookupKeys,
  customerGroupsBatchClientMapperHelper,
} from "./client-mapper-helper"
import type { CustomerGroupInput } from "./types"

type Metadata = Record<string, unknown>

export type ExistingCustomerGroup = {
  id: string
  name: string
  code?: string | null
  erp_code?: string | null
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
  private readonly customerGroupCodeService: SymmyCustomerGroupCodeModuleService
  private readonly query: Query
  private readonly mapper = customerGroupsBatchClientMapperHelper

  constructor(container: MedusaContainer) {
    this.container = container
    this.customerGroupCodeService =
      container.resolve<SymmyCustomerGroupCodeModuleService>(
        SYMMY_CUSTOMER_GROUP_CODE_MODULE
      )
    this.query = getQuery(container)
  }

  async preload(
    groups: CustomerGroupInput[]
  ): Promise<ExistingCustomerGroupIndex> {
    const { ids, names, codes, erpCodes } =
      this.mapper.collectLookupKeys(groups)
    const codeMappings = await this.queryGroupCodeMappings({
      codes,
      erpCodes,
    })
    const [byIdGroups, byNameGroups, byCodeGroups] = await Promise.all([
      this.queryCustomerGroups({ id: Array.from(ids) }),
      this.queryCustomerGroups({ name: Array.from(names) }),
      this.queryCustomerGroups({
        id: codeMappings.map((mapping) => mapping.customer_group_id),
      }),
    ])

    return this.mapper.buildCustomerGroupIndex([
      ...byIdGroups,
      ...byNameGroups,
      ...this.mapper.applyCodeMappings(byCodeGroups, codeMappings),
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
    await this.customerGroupCodeService.upsertCode({
      code: group.code,
      erpCode: group.erp_code,
      customerGroupId: created.id,
    })
    return {
      ...created,
      code: group.code ?? null,
      erp_code: group.erp_code ?? null,
    }
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
    await this.customerGroupCodeService.upsertCode({
      code: group.code,
      erpCode: group.erp_code,
      customerGroupId: groupId,
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

  private queryGroupCodeMappings(
    identifiers: Pick<CustomerGroupLookupKeys, "codes" | "erpCodes">
  ): Promise<SymmyCustomerGroupCodeDTO[]> {
    const codes = new Set([...identifiers.codes, ...identifiers.erpCodes])
    return this.customerGroupCodeService.listByCodes(codes)
  }
}
