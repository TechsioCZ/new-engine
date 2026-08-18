import type { InferTypeOf, MedusaContainer } from "@medusajs/framework/types"
import { PRODUCT_CONTENT_MODULE } from "../modules/product-content"
import type ProductContent from "../modules/product-content/models/product-content"
import type ProductContentModuleService from "../modules/product-content/service"
import {
  emptyProductContent,
  getLegacyProductContent,
  type ProductContentValues,
} from "./product-content"

export type ProductContentRecord = InferTypeOf<typeof ProductContent>

export const getProductContentService = (container: MedusaContainer) =>
  container.resolve<ProductContentModuleService>(PRODUCT_CONTENT_MODULE)

export const toProductContentValues = (
  record?: Partial<ProductContentRecord> | null
): ProductContentValues => {
  if (!record) {
    return emptyProductContent()
  }

  return {
    composition: record.composition ?? "",
    other: record.other ?? "",
    usage: record.usage ?? "",
    warning: record.warning ?? "",
  }
}

export const findProductContent = async (
  container: MedusaContainer,
  productId: string
) => {
  const records = (await getProductContentService(
    container
  ).listProductContents(
    { product_id: productId },
    { take: 1 }
  )) as ProductContentRecord[]

  return records[0] ?? null
}

export const resolveOriginalProductContent = ({
  metadata,
  record,
}: {
  metadata: unknown
  record?: Partial<ProductContentRecord> | null
}) =>
  record ? toProductContentValues(record) : getLegacyProductContent(metadata)
