import type { MedusaContainer } from "@medusajs/framework/types"

import { BRAND_MODULE } from "../../modules/brand"
import type BrandModuleService from "../../modules/brand/service"

interface BrandIdRecord {
  id: string
}

const ACTIVE_BRAND_QUERY_CHUNK_SIZE = 500

export const getActiveBrandIds = async (
  container: MedusaContainer,
  brandIds: string[],
) => {
  const ids = [...new Set(brandIds)]

  if (!ids.length) {
    return new Set<string>()
  }

  const service = container.resolve<BrandModuleService>(BRAND_MODULE)
  const brands: BrandIdRecord[] = []

  const collectChunk = async (index: number): Promise<void> => {
    if (index >= ids.length) {
      return
    }

    const chunkBrands = await service.listBrands(
      {
        id: {
          $in: ids.slice(index, index + ACTIVE_BRAND_QUERY_CHUNK_SIZE),
        },
      },
      {
        select: ["id"],
        withDeleted: false,
      },
    )
    brands.push(...chunkBrands)
    await collectChunk(index + ACTIVE_BRAND_QUERY_CHUNK_SIZE)
  }

  await collectChunk(0)

  return new Set(brands.map((brand) => brand.id))
}
