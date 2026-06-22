import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  deleteBrandAttributeTypesWorkflow,
  restoreBrandAttributeTypesWorkflow,
} from "../../../../../workflows/brand"
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
const LEADING_DASH_REGEX = /^-/

const parseOrder = (input?: string) => {
  const value = input ?? "title"
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

const retrieveAttributeType = async (req: MedusaRequest) => {
  const [attributeType] = await getBrandService(
    req.scope
  ).listBrandAttributeTypes(
    { id: req.params.id ?? "" },
    {
      take: 1,
      withDeleted: true,
    }
  )

  if (!attributeType) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Brand attribute type with id "${req.params.id}" was not found`
    )
  }

  return attributeType
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const attributeType = await retrieveAttributeType(req)

  await deleteBrandAttributeTypesWorkflow(req.scope).run({
    input: {
      ids: [attributeType.id],
    },
  })

  const usageCounts = await getBrandAttributeTypeUsageCounts(req.scope, [
    attributeType.id,
  ])

  res.status(200).json({
    attribute_type: toBrandAttributeTypeResponse(
      {
        ...attributeType,
        deleted_at: new Date(),
      },
      usageCounts.get(attributeType.id) ?? 0
    ),
    deleted: true,
    id: attributeType.id,
    object: "brand_attribute_type",
  })
}

export async function GET(
  req: MedusaRequest<unknown, AdminGetBrandAttributeTypesSchemaType>,
  res: MedusaResponse
) {
  const service = getBrandService(req.scope)
  const attributeType = await retrieveAttributeType(req)
  const { include_deleted, limit, offset, q } = req.validatedQuery
  const order = parseOrder(
    req.validatedQuery.order_by ?? req.validatedQuery.order
  )
  const usageCounts = await getBrandAttributeTypeUsageCounts(req.scope, [
    attributeType.id,
  ])
  const escapedQuery = q ? escapeLikePattern(q) : undefined
  const queryFilters = escapedQuery
    ? {
        $or: [
          { value: { $ilike: `%${escapedQuery}%` } },
          { brand: { handle: { $ilike: `%${escapedQuery}%` } } },
          { brand: { title: { $ilike: `%${escapedQuery}%` } } },
        ],
      }
    : {}
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
    }
  )
  const brandIds = page
    .map((attribute) => attribute.brand?.id)
    .filter((brandId): brandId is string => !!brandId)
  const activeProductCounts = await getBrandActiveProductCounts(
    req.scope,
    brandIds
  )

  res.status(200).json({
    attribute_type: toBrandAttributeTypeResponse(
      attributeType,
      usageCounts.get(attributeType.id) ?? 0
    ),
    count,
    limit,
    offset,
    brands: page.flatMap((attribute) => {
      const activeProductCount = attribute.brand?.id
        ? (activeProductCounts.get(attribute.brand.id) ?? 0)
        : 0
      const brand = toBrandAttributeTypeBrandResponse(
        attribute,
        activeProductCount
      )

      return brand ? [brand] : []
    }),
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const attributeType = await retrieveAttributeType(req)

  await restoreBrandAttributeTypesWorkflow(req.scope).run({
    input: {
      ids: [attributeType.id],
    },
  })

  const usageCounts = await getBrandAttributeTypeUsageCounts(req.scope, [
    attributeType.id,
  ])

  res.status(200).json({
    attribute_type: toBrandAttributeTypeResponse(
      {
        ...attributeType,
        deleted_at: null,
      },
      usageCounts.get(attributeType.id) ?? 0
    ),
  })
}
