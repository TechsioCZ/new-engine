import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { refetchEntities } from "@medusajs/framework/http"
import type { ProductDTO } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import {
  remapKeysForProduct,
  remapProductResponse,
} from "@medusajs/medusa/api/admin/products/helpers"

import { normalizeProductSalesChannelFilter } from "../../utils/product-filters"

const graphDateSchema = z.union([z.date(), z.string(), z.null()])
const graphRecordSchema = z.record(z.string(), z.unknown())
const adminProductSchema = z
  .object({
    collection: graphRecordSchema.nullable(),
    created_at: graphDateSchema,
    deleted_at: graphDateSchema,
    description: z.string().nullable(),
    external_id: z.string().nullable(),
    handle: z.string(),
    height: z.number().nullable(),
    hs_code: z.string().nullable(),
    id: z.string(),
    images: z.array(graphRecordSchema),
    is_giftcard: z.boolean(),
    length: z.number().nullable(),
    material: z.string().nullable(),
    mid_code: z.string().nullable(),
    options: z.array(graphRecordSchema),
    origin_country: z.string().nullable(),
    status: z.enum(["draft", "proposed", "published", "rejected"]),
    subtitle: z.string().nullable(),
    tags: z.array(graphRecordSchema),
    thumbnail: z.string().nullable(),
    title: z.string(),
    type: graphRecordSchema.nullable(),
    type_id: z.string().nullable(),
    updated_at: graphDateSchema,
    variants: z.array(graphRecordSchema),
    weight: z.number().nullable(),
    width: z.number().nullable(),
  })
  .loose()

const isAdminProduct = (value: unknown): value is ProductDTO =>
  adminProductSchema.safeParse(value).success

const get = async (req: MedusaRequest, res: MedusaResponse) => {
  const selectFields = remapKeysForProduct(req.queryConfig.fields ?? [])
  const { data, metadata } = await refetchEntities({
    entity: "product",
    fields: selectFields,
    idOrFilter: await normalizeProductSalesChannelFilter(
      req.scope.resolve(ContainerRegistrationKeys.QUERY),
      req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY),
      req.filterableFields,
    ),
    pagination: req.queryConfig.pagination,
    scope: req.scope,
    ...(req.queryConfig.withDeleted === undefined
      ? {}
      : { withDeleted: req.queryConfig.withDeleted }),
  })
  const products: unknown[] = data

  if (!products.every(isAdminProduct)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Product query returned an invalid admin product response.",
    )
  }

  res.json({
    count: metadata.count,
    limit: metadata.take,
    offset: metadata.skip,
    products: products.map((product) => remapProductResponse(product)),
  })
}

export { get as GET }
