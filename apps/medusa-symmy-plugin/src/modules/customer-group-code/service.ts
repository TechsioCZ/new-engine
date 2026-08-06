import { MedusaService } from "@medusajs/framework/utils"

import SymmyCustomerGroupCode from "./models/symmy-customer-group-code"

export interface SymmyCustomerGroupCodeDTO {
  id: string
  code: string | null
  erp_code: string | null
  customer_group_id: string
  created_at?: Date | string
  updated_at?: Date | string
}

export interface UpsertSymmyCustomerGroupCodeInput {
  code?: string | undefined
  erpCode?: string | undefined
  customerGroupId: string
}

export class SymmyCustomerGroupCodeModuleService extends MedusaService({
  SymmyCustomerGroupCode,
}) {
  async listByCodes(codes: Set<string>): Promise<SymmyCustomerGroupCodeDTO[]> {
    if (codes.size === 0) {
      return []
    }

    const values = [...codes]
    const [byCode, byErpCode] = await Promise.all([
      this.listSymmyCustomerGroupCodes({ code: values }),
      this.listSymmyCustomerGroupCodes({ erp_code: values }),
    ])

    const byId = new Map<string, SymmyCustomerGroupCodeDTO>()
    for (const mapping of [...byCode, ...byErpCode]) {
      byId.set(mapping.id, mapping)
    }

    return [...byId.values()]
  }

  async upsertCode({
    code,
    erpCode,
    customerGroupId,
  }: UpsertSymmyCustomerGroupCodeInput): Promise<SymmyCustomerGroupCodeDTO> {
    const existing = await this.findExistingMapping({
      code,
      customerGroupId,
      erpCode,
    })
    const payload = {
      code: code ?? null,
      customer_group_id: customerGroupId,
      erp_code: erpCode ?? null,
    }

    if (existing !== undefined) {
      return await this.updateSymmyCustomerGroupCodes({
        id: existing.id,
        ...payload,
      })
    }

    return await this.createSymmyCustomerGroupCodes(payload)
  }

  private async findExistingMapping({
    code,
    erpCode,
    customerGroupId,
  }: UpsertSymmyCustomerGroupCodeInput): Promise<
    SymmyCustomerGroupCodeDTO | undefined
  > {
    const byGroupIdResults = await this.listSymmyCustomerGroupCodes(
      { customer_group_id: customerGroupId },
      { take: 1 },
    )
    const [byGroupId] = byGroupIdResults
    if (byGroupId !== undefined) {
      return byGroupId
    }

    if (code !== undefined) {
      const byCodeResults = await this.listSymmyCustomerGroupCodes(
        { code },
        { take: 1 },
      )
      const [byCode] = byCodeResults
      if (byCode !== undefined) {
        return byCode
      }
    }

    if (erpCode !== undefined) {
      const byErpCodeResults = await this.listSymmyCustomerGroupCodes(
        { erp_code: erpCode },
        { take: 1 },
      )
      return byErpCodeResults[0]
    }
    return undefined
  }
}
