import type {
  ExistingCustomerGroup,
  ExistingCustomerGroupIndex,
} from "./client"
import type { CustomerGroupInput } from "./types"

type Metadata = Record<string, unknown>

export type CustomerGroupLookupKeys = {
  ids: Set<string>
  names: Set<string>
  codes: Set<string>
  erpCodes: Set<string>
}

export class CustomerGroupsBatchClientMapperHelper {
  collectLookupKeys(groups: CustomerGroupInput[]): CustomerGroupLookupKeys {
    const ids = new Set<string>()
    const names = new Set<string>()
    const codes = new Set<string>()
    const erpCodes = new Set<string>()

    for (const group of groups) {
      if (
        group.identifier_type === "customer_group_id" &&
        group.customer_group_id
      ) {
        ids.add(group.customer_group_id)
      }
      if (group.identifier_type === "name") {
        names.add(group.name)
      }
      if (group.identifier_type === "code" && group.code) {
        codes.add(group.code)
      }
      if (group.identifier_type === "erp_code" && group.erp_code) {
        erpCodes.add(group.erp_code)
      }
    }

    return { ids, names, codes, erpCodes }
  }

  buildCustomerGroupIndex(
    groups: ExistingCustomerGroup[]
  ): ExistingCustomerGroupIndex {
    const index: ExistingCustomerGroupIndex = {
      byId: new Map(),
      byName: new Map(),
      byCode: new Map(),
      byErpCode: new Map(),
    }

    for (const group of groups) {
      this.addCustomerGroupToIndex(index, group)
    }

    return index
  }

  addCreatedCustomerGroupToIndex(
    index: ExistingCustomerGroupIndex,
    input: CustomerGroupInput,
    groupId: string
  ): void {
    this.addCustomerGroupToIndex(index, {
      id: groupId,
      name: input.name,
      code: input.code ?? null,
      erp_code: input.erp_code ?? null,
      metadata: this.buildMetadata(null, input),
    })
  }

  findExistingCustomerGroup(
    group: CustomerGroupInput,
    index: ExistingCustomerGroupIndex
  ): ExistingCustomerGroup | null {
    if (
      group.identifier_type === "customer_group_id" &&
      group.customer_group_id
    ) {
      return index.byId.get(group.customer_group_id) ?? null
    }
    if (group.identifier_type === "name") {
      return index.byName.get(group.name) ?? null
    }
    if (group.identifier_type === "code" && group.code) {
      return index.byCode.get(group.code) ?? null
    }
    if (group.identifier_type === "erp_code" && group.erp_code) {
      return index.byErpCode.get(group.erp_code) ?? null
    }
    return null
  }

  buildCreatePayload(group: CustomerGroupInput, createdBy?: string) {
    return {
      name: group.name,
      metadata: this.buildMetadata(null, group),
      created_by: createdBy,
    }
  }

  buildUpdatePayload(
    existing: ExistingCustomerGroup,
    group: CustomerGroupInput
  ) {
    return {
      name: group.name,
      metadata: this.buildMetadata(existing.metadata, group),
    }
  }

  buildResultEcho(group: CustomerGroupInput) {
    return {
      identifier_type: group.identifier_type,
      customer_group_id: group.customer_group_id,
      name: group.name,
      code: group.code,
      erp_code: group.erp_code,
    }
  }

  private addCustomerGroupToIndex(
    index: ExistingCustomerGroupIndex,
    group: ExistingCustomerGroup
  ): void {
    index.byId.set(group.id, group)
    index.byName.set(group.name, group)
    const code = group.code
    if (code) {
      index.byCode.set(code, group)
    }
    const erpCode = group.erp_code
    if (erpCode) {
      index.byErpCode.set(erpCode, group)
    }
  }

  private buildMetadata(
    existingMetadata: Metadata | null | undefined,
    group: CustomerGroupInput
  ) {
    const {
      code: _code,
      erp_code: _erpCode,
      ...metadata
    } = {
      ...(existingMetadata ?? {}),
      ...(group.metadata ?? {}),
    }
    return {
      ...metadata,
    }
  }

  applyCodeMappings(
    groups: ExistingCustomerGroup[],
    mappings: {
      code: string | null
      erp_code: string | null
      customer_group_id: string
    }[]
  ): ExistingCustomerGroup[] {
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
}

export const customerGroupsBatchClientMapperHelper =
  new CustomerGroupsBatchClientMapperHelper()
