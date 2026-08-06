import { MedusaService } from "@medusajs/framework/utils"

import SymmyPriceListCode from "./models/symmy-price-list-code"

export interface SymmyPriceListCodeDTO {
  code: string
  erp_code: string
  price_list_id: string
  created_at?: Date | string
  updated_at?: Date | string
}

export interface UpsertSymmyPriceListCodeInput {
  erpCode: string
  priceListId: string
}

export interface ListSymmyPriceListCodesInput {
  erpCode?: string
  limit: number
  offset: number
}

export class SymmyPriceListCodeModuleService extends MedusaService({
  SymmyPriceListCode,
}) {
  async listByErpCodes(codes: Set<string>): Promise<SymmyPriceListCodeDTO[]> {
    if (codes.size === 0) {
      return []
    }

    return await this.listSymmyPriceListCodes({
      erp_code: [...codes],
    })
  }

  async listPage({
    erpCode,
    limit,
    offset,
  }: ListSymmyPriceListCodesInput): Promise<{
    mappings: SymmyPriceListCodeDTO[]
    count: number
  }> {
    const filters = erpCode === undefined ? {} : { erp_code: erpCode }
    const [mappings, count] = await this.listAndCountSymmyPriceListCodes(
      filters,
      {
        order: { erp_code: "ASC" },
        skip: offset,
        take: limit,
      },
    )

    return {
      count,
      mappings,
    }
  }

  async upsertCode({
    erpCode,
    priceListId,
  }: UpsertSymmyPriceListCodeInput): Promise<SymmyPriceListCodeDTO> {
    const existingByCodeResults = await this.listSymmyPriceListCodes(
      { erp_code: erpCode },
      { take: 1 },
    )
    const [existingByCode] = existingByCodeResults

    if (existingByCode !== undefined) {
      if (existingByCode.price_list_id === priceListId) {
        return existingByCode
      }
      return await this.updateSymmyPriceListCodes({
        code: existingByCode.code,
        price_list_id: priceListId,
      })
    }

    const existingByPriceListResults = await this.listSymmyPriceListCodes(
      { price_list_id: priceListId },
      { take: 1 },
    )
    const [existingByPriceList] = existingByPriceListResults

    if (existingByPriceList !== undefined) {
      return await this.updateSymmyPriceListCodes({
        code: existingByPriceList.code,
        erp_code: erpCode,
      })
    }

    return await this.createSymmyPriceListCodes({
      erp_code: erpCode,
      price_list_id: priceListId,
    })
  }
}
