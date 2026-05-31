import { MedusaService } from "@medusajs/framework/utils"
import SymmyPriceListCode from "./models/symmy-price-list-code"

export type SymmyPriceListCodeDTO = {
  code: string
  erp_code: string
  price_list_id: string
  created_at?: Date | string
  updated_at?: Date | string
}

export type UpsertSymmyPriceListCodeInput = {
  erpCode: string
  priceListId: string
}

export type ListSymmyPriceListCodesInput = {
  erpCode?: string
  limit: number
  offset: number
}

export class SymmyPriceListCodeModuleService extends MedusaService({
  SymmyPriceListCode,
}) {
  async listByErpCodes(codes: Set<string>): Promise<SymmyPriceListCodeDTO[]> {
    if (!codes.size) {
      return []
    }

    return (await this.listSymmyPriceListCodes({
      erp_code: Array.from(codes),
    })) as unknown as SymmyPriceListCodeDTO[]
  }

  async listPage({
    erpCode,
    limit,
    offset,
  }: ListSymmyPriceListCodesInput): Promise<{
    mappings: SymmyPriceListCodeDTO[]
    count: number
  }> {
    const filters = erpCode ? { erp_code: erpCode } : {}
    const [mappings, count] = await this.listAndCountSymmyPriceListCodes(
      filters,
      {
        skip: offset,
        take: limit,
        order: { erp_code: "ASC" },
      }
    )

    return {
      mappings: mappings as unknown as SymmyPriceListCodeDTO[],
      count,
    }
  }

  async upsertCode({
    erpCode,
    priceListId,
  }: UpsertSymmyPriceListCodeInput): Promise<SymmyPriceListCodeDTO> {
    const existingByCode = (
      await this.listSymmyPriceListCodes({ erp_code: erpCode }, { take: 1 })
    )[0] as unknown as SymmyPriceListCodeDTO | undefined

    if (existingByCode) {
      if (existingByCode.price_list_id === priceListId) {
        return existingByCode
      }
      return (await this.updateSymmyPriceListCodes({
        code: existingByCode.code,
        price_list_id: priceListId,
      })) as unknown as SymmyPriceListCodeDTO
    }

    const existingByPriceList = (
      await this.listSymmyPriceListCodes(
        { price_list_id: priceListId },
        { take: 1 }
      )
    )[0] as unknown as SymmyPriceListCodeDTO | undefined

    if (existingByPriceList) {
      return (await this.updateSymmyPriceListCodes({
        code: existingByPriceList.code,
        erp_code: erpCode,
      })) as unknown as SymmyPriceListCodeDTO
    }

    return (await this.createSymmyPriceListCodes({
      erp_code: erpCode,
      price_list_id: priceListId,
    })) as unknown as SymmyPriceListCodeDTO
  }
}
