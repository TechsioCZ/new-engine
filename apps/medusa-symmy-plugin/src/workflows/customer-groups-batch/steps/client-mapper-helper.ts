import type { CustomerGroupInput } from "../types"
import type {
  ExistingCustomerGroup,
  ExistingCustomerGroupIndex,
} from "./client"

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
    const code = this.stringMetadataValue(group.metadata, "code")
    if (code) {
      index.byCode.set(code, group)
    }
    const erpCode = this.stringMetadataValue(group.metadata, "erp_code")
    if (erpCode) {
      index.byErpCode.set(erpCode, group)
    }
  }

  private buildMetadata(
    existingMetadata: Metadata | null | undefined,
    group: CustomerGroupInput
  ) {
    return {
      ...(existingMetadata ?? {}),
      ...(group.metadata ?? {}),
      ...(group.code ? { code: group.code } : {}),
      ...(group.erp_code ? { erp_code: group.erp_code } : {}),
    }
  }

  private stringMetadataValue(
    metadata: Metadata | null | undefined,
    key: string
  ) {
    const value = metadata?.[key]
    return typeof value === "string" && value.length ? value : null
  }
}

export const customerGroupsBatchClientMapperHelper =
  new CustomerGroupsBatchClientMapperHelper()
