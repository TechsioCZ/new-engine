import type { MedusaContainer } from "@medusajs/framework/types"

import { BRAND_MODULE } from "../../modules/brand"
import type BrandModuleService from "../../modules/brand/service"

type BrandIdRecord = {
  id: string
}

const ACTIVE_BRAND_QUERY_CHUNK_SIZE = 500

export const getActiveBrandIds = async (
  container: MedusaContainer,
  brandIds: string[]
) => {
  const ids = [...new Set(brandIds)]

  if (!ids.length) {
    return new Set<string>()
  }

  const service = container.resolve<BrandModuleService>(BRAND_MODULE)
  const brands: BrandIdRecord[] = []

  for (
    let index = 0;
    index < ids.length;
    index += ACTIVE_BRAND_QUERY_CHUNK_SIZE
  ) {
    const chunkBrands = await service.listBrands(
      {
        id: {
          $in: ids.slice(index, index + ACTIVE_BRAND_QUERY_CHUNK_SIZE),
        },
      },
      {
        select: ["id"],
        withDeleted: false,
      }
    )
    brands.push(...(chunkBrands as BrandIdRecord[]))
  }

  return new Set(brands.map((brand) => brand.id))
}
