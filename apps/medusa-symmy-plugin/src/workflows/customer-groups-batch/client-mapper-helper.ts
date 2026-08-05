import type {
  ExistingCustomerGroup,
  ExistingCustomerGroupIndex,
} from "./client"
import type { CustomerGroupInput } from "./types"

type Metadata = Record<string, unknown>

export interface CustomerGroupLookupKeys {
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

    return { codes, erpCodes, ids, names }
  }

  buildCustomerGroupIndex(
    groups: ExistingCustomerGroup[],
  ): ExistingCustomerGroupIndex {
    const index: ExistingCustomerGroupIndex = {
      byCode: new Map(),
      byErpCode: new Map(),
      byId: new Map(),
      byName: new Map(),
    }

    for (const group of groups) {
      this.addCustomerGroupToIndex(index, group)
    }

    return index
  }

  addCreatedCustomerGroupToIndex(
    index: ExistingCustomerGroupIndex,
    input: CustomerGroupInput,
    groupId: string,
  ): void {
    this.addCustomerGroupToIndex(index, {
      code: input.code ?? null,
      erp_code: input.erp_code ?? null,
      id: groupId,
      metadata: this.buildMetadata(null, input),
      name: input.name,
    })
  }

  findExistingCustomerGroup(
    group: CustomerGroupInput,
    index: ExistingCustomerGroupIndex,
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
      created_by: createdBy,
      metadata: this.buildMetadata(null, group),
      name: group.name,
    }
  }

  buildUpdatePayload(
    existing: ExistingCustomerGroup,
    group: CustomerGroupInput,
  ) {
    return {
      metadata: this.buildMetadata(existing.metadata, group),
      name: group.name,
    }
  }

  buildResultEcho(group: CustomerGroupInput) {
    return {
      code: group.code,
      customer_group_id: group.customer_group_id,
      erp_code: group.erp_code,
      identifier_type: group.identifier_type,
      name: group.name,
    }
  }

  private addCustomerGroupToIndex(
    index: ExistingCustomerGroupIndex,
    group: ExistingCustomerGroup,
  ): void {
    index.byId.set(group.id, group)
    index.byName.set(group.name, group)
    const { code } = group
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
    group: CustomerGroupInput,
  ) {
    const {
      code: _code,
      erp_code: _erpCode,
      ...metadata
    } = {
      ...existingMetadata,
      ...group.metadata,
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
    }[],
  ): ExistingCustomerGroup[] {
    const mappingsByGroupId = new Map(
      mappings.map((mapping) => [mapping.customer_group_id, mapping]),
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
