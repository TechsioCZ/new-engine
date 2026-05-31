import { MedusaService } from "@medusajs/framework/utils"
import SymmyCustomerGroupCode from "./models/symmy-customer-group-code"

export type SymmyCustomerGroupCodeDTO = {
  id: string
  code: string | null
  erp_code: string | null
  customer_group_id: string
  created_at?: Date | string
  updated_at?: Date | string
}

export type UpsertSymmyCustomerGroupCodeInput = {
  code?: string
  erpCode?: string
  customerGroupId: string
}

export class SymmyCustomerGroupCodeModuleService extends MedusaService({
  SymmyCustomerGroupCode,
}) {
  async listByCodes(codes: Set<string>): Promise<SymmyCustomerGroupCodeDTO[]> {
    if (!codes.size) {
      return []
    }

    const values = Array.from(codes)
    const [byCode, byErpCode] = await Promise.all([
      this.listSymmyCustomerGroupCodes({ code: values }),
      this.listSymmyCustomerGroupCodes({ erp_code: values }),
    ])

    const byId = new Map<string, SymmyCustomerGroupCodeDTO>()
    for (const mapping of [
      ...(byCode as unknown as SymmyCustomerGroupCodeDTO[]),
      ...(byErpCode as unknown as SymmyCustomerGroupCodeDTO[]),
    ]) {
      byId.set(mapping.id, mapping)
    }

    return Array.from(byId.values())
  }

  async upsertCode({
    code,
    erpCode,
    customerGroupId,
  }: UpsertSymmyCustomerGroupCodeInput): Promise<SymmyCustomerGroupCodeDTO> {
    const existing = await this.findExistingMapping({
      code,
      erpCode,
      customerGroupId,
    })
    const payload = {
      customer_group_id: customerGroupId,
      code: code ?? null,
      erp_code: erpCode ?? null,
    }

    if (existing) {
      return (await this.updateSymmyCustomerGroupCodes({
        id: existing.id,
        ...payload,
      })) as unknown as SymmyCustomerGroupCodeDTO
    }

    return (await this.createSymmyCustomerGroupCodes(
      payload
    )) as unknown as SymmyCustomerGroupCodeDTO
  }

  private async findExistingMapping({
    code,
    erpCode,
    customerGroupId,
  }: UpsertSymmyCustomerGroupCodeInput) {
    const byGroupId = (
      await this.listSymmyCustomerGroupCodes(
        { customer_group_id: customerGroupId },
        { take: 1 }
      )
    )[0] as unknown as SymmyCustomerGroupCodeDTO | undefined
    if (byGroupId) {
      return byGroupId
    }

    if (code) {
      const byCode = (
        await this.listSymmyCustomerGroupCodes({ code }, { take: 1 })
      )[0] as unknown as SymmyCustomerGroupCodeDTO | undefined
      if (byCode) {
        return byCode
      }
    }

    if (erpCode) {
      return (
        await this.listSymmyCustomerGroupCodes(
          { erp_code: erpCode },
          { take: 1 }
        )
      )[0] as unknown as SymmyCustomerGroupCodeDTO | undefined
    }
  }
}
