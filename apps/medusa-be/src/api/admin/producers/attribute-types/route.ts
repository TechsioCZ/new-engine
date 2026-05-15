import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  createProducerAttributeTypesWorkflow,
  restoreProducerAttributeTypesWorkflow,
} from "../../../../workflows/producer"
import {
  getProducerAttributeTypeUsageCounts,
  getProducerService,
  toProducerAttributeTypeResponse,
} from "../utils"
import type {
  AdminCreateProducerAttributeTypeSchemaType,
  AdminGetProducerAttributeTypesSchemaType,
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
  req: MedusaRequest<unknown, AdminGetProducerAttributeTypesSchemaType>,
  res: MedusaResponse
) {
  const service = getProducerService(req.scope)
  const { include_deleted, limit, name, offset, q } = req.validatedQuery
  let filters = {}

  if (name) {
    filters = { name }
  } else if (q) {
    filters = {
      name: { $ilike: `%${q}%` },
    }
  }

  const [attributeTypes, count] =
    await service.listAndCountProducerAttributeTypes(filters, {
      order: parseOrder(
        req.validatedQuery.order_by ?? req.validatedQuery.order
      ),
      skip: offset,
      take: limit,
      withDeleted: include_deleted,
    })
  const usageCounts = await getProducerAttributeTypeUsageCounts(
    req.scope,
    attributeTypes.map((attributeType) => attributeType.id)
  )

  res.json({
    attribute_types: attributeTypes.map((attributeType) =>
      toProducerAttributeTypeResponse(
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
  req: MedusaRequest<AdminCreateProducerAttributeTypeSchemaType>,
  res: MedusaResponse
) {
  const service = getProducerService(req.scope)
  const name = req.validatedBody.name
  let action: "created" | "existing" | "restored" = "existing"
  const existing = (
    await service.listProducerAttributeTypes(
      { name },
      {
        take: 1,
        withDeleted: true,
      }
    )
  )[0]

  if (existing?.deleted_at) {
    await restoreProducerAttributeTypesWorkflow(req.scope).run({
      input: {
        ids: [existing.id],
      },
    })
    action = "restored"
  } else if (!existing) {
    await createProducerAttributeTypesWorkflow(req.scope).run({
      input: {
        attribute_types: [{ name }],
      },
    })
    action = "created"
  }

  const [attributeType] = await service.listProducerAttributeTypes(
    { name },
    {
      take: 1,
      withDeleted: true,
    }
  )

  if (!attributeType) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Producer attribute type "${name}" was not found`
    )
  }

  const usageCounts = await getProducerAttributeTypeUsageCounts(req.scope, [
    attributeType.id,
  ])

  res.status(200).json({
    action,
    attribute_type: toProducerAttributeTypeResponse(
      attributeType,
      usageCounts.get(attributeType.id) ?? 0
    ),
  })
}
