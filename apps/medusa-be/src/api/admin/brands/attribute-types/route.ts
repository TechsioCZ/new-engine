import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { createBrandAttributeTypesWorkflow } from "../../../../workflows/brand"
import {
  escapeLikePattern,
  getBrandAttributeTypeUsageCounts,
  getBrandService,
  toBrandAttributeTypeResponse,
} from "../utils"
import type {
  AdminCreateBrandAttributeTypeSchemaType,
  AdminGetBrandAttributeTypesSchemaType,
} from "../validators"

const ORDER_FIELDS = new Set(["name", "created_at", "updated_at"])
const LEADING_DASH_REGEX = /^-/

const parseOrder = (input?: string) => {
  const value = input ?? "name"
  const direction = value.startsWith("-") ? "DESC" : "ASC"
  const field = value.replace(LEADING_DASH_REGEX, "")

  if (!ORDER_FIELDS.has(field)) {
    return { name: "ASC" }
  }

  return {
    [field]: direction,
  }
}

export async function GET(
  req: AuthenticatedMedusaRequest<
    unknown,
    AdminGetBrandAttributeTypesSchemaType
  >,
  res: MedusaResponse
) {
  const service = getBrandService(req.scope)
  const { include_deleted, limit, name, offset, q } = req.validatedQuery
  const escapedQuery = q ? escapeLikePattern(q) : undefined
  let filters = {}

  if (name) {
    filters = { name }
  } else if (escapedQuery) {
    filters = {
      name: { $ilike: `%${escapedQuery}%` },
    }
  }

  const [attributeTypes, count] = await service.listAndCountBrandAttributeTypes(
    filters,
    {
      order: parseOrder(
        req.validatedQuery.order_by ?? req.validatedQuery.order
      ),
      skip: offset,
      take: limit,
      withDeleted: include_deleted,
    }
  )
  const usageCounts = await getBrandAttributeTypeUsageCounts(
    req.scope,
    attributeTypes.map((attributeType) => attributeType.id)
  )

  res.json({
    attribute_types: attributeTypes.map((attributeType) =>
      toBrandAttributeTypeResponse(
        attributeType,
        usageCounts.get(attributeType.id) ?? 0
      )
    ),
    count,
    limit,
    offset,
  })
}

export async function POST(
  req: AuthenticatedMedusaRequest<AdminCreateBrandAttributeTypeSchemaType>,
  res: MedusaResponse
) {
  const name = req.validatedBody.name
  const { result } = await createBrandAttributeTypesWorkflow(req.scope).run({
    input: {
      attribute_types: [{ name }],
    },
  })
  const ensured = result[0]

  if (!ensured) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Brand attribute type "${name}" was not returned by its workflow`
    )
  }

  const usageCounts = await getBrandAttributeTypeUsageCounts(req.scope, [
    ensured.attribute_type.id,
  ])

  res.status(200).json({
    action: ensured.action,
    attribute_type: toBrandAttributeTypeResponse(
      ensured.attribute_type,
      usageCounts.get(ensured.attribute_type.id) ?? 0
    ),
  })
}
