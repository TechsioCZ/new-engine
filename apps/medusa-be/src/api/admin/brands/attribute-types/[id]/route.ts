import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { deleteBrandAttributeTypesWorkflow } from "../../../../../workflows/brand/workflows/delete-brand-attribute-types"
import { restoreBrandAttributeTypesWorkflow } from "../../../../../workflows/brand/workflows/restore-brand-attribute-types"
import {
  escapeLikePattern,
  getBrandActiveProductCounts,
  getBrandAttributeTypeUsageCounts,
  getBrandService,
  toBrandAttributeTypeBrandResponse,
  toBrandAttributeTypeResponse,
} from "../../utils"
import type { AdminGetBrandAttributeTypesSchemaType } from "../../validators"

const ORDER_FIELDS = new Set([
  "attribute_value",
  "handle",
  "title",
  "created_at",
  "updated_at",
])
const LEADING_DASH_REGEX = /^-/u

const parseOrder = (value = "title") => {
  const direction = value.startsWith("-") ? "DESC" : "ASC"
  const field = value.replace(LEADING_DASH_REGEX, "")

  if (!ORDER_FIELDS.has(field)) {
    return { direction: "ASC", field: "title" }
  }

  return { direction, field }
}

const toAttributeOrder = ({
  direction,
  field,
}: ReturnType<typeof parseOrder>) =>
  field === "attribute_value"
    ? { value: direction }
    : { brand: { [field]: direction } }

const retrieveAttributeType = async (req: AuthenticatedMedusaRequest) => {
  const [attributeType] = await getBrandService(
    req.scope,
  ).listBrandAttributeTypes(
    { id: req.params["id"] ?? "" },
    {
      take: 1,
      withDeleted: true,
    },
  )

  if (!attributeType) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Brand attribute type with id "${req.params["id"]}" was not found`,
    )
  }

  return attributeType
}

const deleteBrandAttributeType = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const id = req.params["id"] ?? ""
  await deleteBrandAttributeTypesWorkflow(req.scope).run({
    input: {
      ids: [id],
    },
  })
  const [attributeType, usageCounts] = await Promise.all([
    retrieveAttributeType(req),
    getBrandAttributeTypeUsageCounts(req.scope, [id]),
  ])

  res.status(200).json({
    attribute_type: toBrandAttributeTypeResponse(
      attributeType,
      usageCounts.get(id) ?? 0,
    ),
    deleted: true,
    id,
    object: "brand_attribute_type",
  })
}

const getBrandAttributeType = async (
  req: AuthenticatedMedusaRequest<
    unknown,
    AdminGetBrandAttributeTypesSchemaType
  >,
  res: MedusaResponse,
) => {
  const service = getBrandService(req.scope)
  const attributeType = await retrieveAttributeType(req)
  const { include_deleted, limit, offset, q } = req.validatedQuery
  const order = parseOrder(
    req.validatedQuery.order_by ?? req.validatedQuery.order,
  )
  const usageCounts = await getBrandAttributeTypeUsageCounts(req.scope, [
    attributeType.id,
  ])
  const escapedQuery =
    q === undefined || q.length === 0 ? undefined : escapeLikePattern(q)
  const queryFilters =
    escapedQuery === undefined
      ? {}
      : {
          $or: [
            { value: { $ilike: `%${escapedQuery}%` } },
            { brand: { handle: { $ilike: `%${escapedQuery}%` } } },
            { brand: { title: { $ilike: `%${escapedQuery}%` } } },
          ],
        }
  const [page, count] = await service.listAndCountBrandAttributes(
    {
      attribute_type_id: attributeType.id,
      ...queryFilters,
      ...(include_deleted ? {} : { brand: { deleted_at: null } }),
    },
    {
      order: toAttributeOrder(order),
      relations: ["brand"],
      skip: offset,
      take: limit,
      withDeleted: true,
    },
  )
  const brandIds = page
    .map((attribute) => attribute.brand?.id)
    .filter(
      (brandId): brandId is string =>
        brandId !== undefined && brandId.length > 0,
    )
  const activeProductCounts = await getBrandActiveProductCounts(
    req.scope,
    brandIds,
  )

  res.status(200).json({
    attribute_type: toBrandAttributeTypeResponse(
      attributeType,
      usageCounts.get(attributeType.id) ?? 0,
    ),
    brands: page.flatMap((attribute) => {
      const activeProductCount =
        attribute.brand?.id === undefined || attribute.brand.id.length === 0
          ? 0
          : (activeProductCounts.get(attribute.brand.id) ?? 0)
      const brand = toBrandAttributeTypeBrandResponse(
        attribute,
        activeProductCount,
      )

      return brand === undefined || brand === null ? [] : [brand]
    }),
    count,
    limit,
    offset,
  })
}

const restoreBrandAttributeType = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const id = req.params["id"] ?? ""
  await restoreBrandAttributeTypesWorkflow(req.scope).run({
    input: {
      ids: [id],
    },
  })
  const [attributeType, usageCounts] = await Promise.all([
    retrieveAttributeType(req),
    getBrandAttributeTypeUsageCounts(req.scope, [id]),
  ])

  res.status(200).json({
    attribute_type: toBrandAttributeTypeResponse(
      attributeType,
      usageCounts.get(id) ?? 0,
    ),
  })
}

export { deleteBrandAttributeType as DELETE }
export { getBrandAttributeType as GET }
export { restoreBrandAttributeType as POST }
