import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  deleteProducerAttributeTypesWorkflow,
  restoreProducerAttributeTypesWorkflow,
} from "../../../../../workflows/producer"
import {
  escapeLikePattern,
  getProducerActiveProductCounts,
  getProducerAttributeTypeUsageCounts,
  getProducerService,
  toProducerAttributeTypeProducerResponse,
  toProducerAttributeTypeResponse,
} from "../../utils"
import type { AdminGetProducerAttributeTypesSchemaType } from "../../validators"

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
    : { producer: { [field]: direction } }

const retrieveAttributeType = async (req: MedusaRequest) => {
  const [attributeType] = await getProducerService(
    req.scope
  ).listProducerAttributeTypes(
    { id: req.params.id ?? "" },
    {
      take: 1,
      withDeleted: true,
    }
  )

  if (!attributeType) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Producer attribute type with id "${req.params.id}" was not found`
    )
  }

  return attributeType
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const attributeType = await retrieveAttributeType(req)

  await deleteProducerAttributeTypesWorkflow(req.scope).run({
    input: {
      ids: [attributeType.id],
    },
  })

  const usageCounts = await getProducerAttributeTypeUsageCounts(req.scope, [
    attributeType.id,
  ])

  res.status(200).json({
    attribute_type: toProducerAttributeTypeResponse(
      {
        ...attributeType,
        deleted_at: new Date(),
      },
      usageCounts.get(attributeType.id) ?? 0
    ),
    deleted: true,
    id: attributeType.id,
    object: "producer_attribute_type",
  })
}

export async function GET(
  req: MedusaRequest<unknown, AdminGetProducerAttributeTypesSchemaType>,
  res: MedusaResponse
) {
  const service = getProducerService(req.scope)
  const attributeType = await retrieveAttributeType(req)
  const { include_deleted, limit, offset, q } = req.validatedQuery
  const order = parseOrder(
    req.validatedQuery.order_by ?? req.validatedQuery.order
  )
  const usageCounts = await getProducerAttributeTypeUsageCounts(req.scope, [
    attributeType.id,
  ])
  const escapedQuery = q ? escapeLikePattern(q) : undefined
  const queryFilters = escapedQuery
    ? {
        $or: [
          { value: { $ilike: `%${escapedQuery}%` } },
          { producer: { handle: { $ilike: `%${escapedQuery}%` } } },
          { producer: { title: { $ilike: `%${escapedQuery}%` } } },
        ],
      }
    : {}
  const [page, count] = await service.listAndCountProducerAttributes(
    {
      attribute_type_id: attributeType.id,
      ...queryFilters,
      ...(include_deleted ? {} : { producer: { deleted_at: null } }),
    },
    {
      order: toAttributeOrder(order),
      relations: ["producer"],
      skip: offset,
      take: limit,
      withDeleted: true,
    }
  )
  const producerIds = page
    .map((attribute) => attribute.producer?.id)
    .filter((producerId): producerId is string => !!producerId)
  const activeProductCounts = await getProducerActiveProductCounts(
    req.scope,
    producerIds
  )

  res.status(200).json({
    attribute_type: toProducerAttributeTypeResponse(
      attributeType,
      usageCounts.get(attributeType.id) ?? 0
    ),
    count,
    limit,
    offset,
    producers: page.flatMap((attribute) => {
      const activeProductCount = attribute.producer?.id
        ? (activeProductCounts.get(attribute.producer.id) ?? 0)
        : 0
      const producer = toProducerAttributeTypeProducerResponse(
        attribute,
        activeProductCount
      )

      return producer ? [producer] : []
    }),
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const attributeType = await retrieveAttributeType(req)

  await restoreProducerAttributeTypesWorkflow(req.scope).run({
    input: {
      ids: [attributeType.id],
    },
  })

  const usageCounts = await getProducerAttributeTypeUsageCounts(req.scope, [
    attributeType.id,
  ])

  res.status(200).json({
    attribute_type: toProducerAttributeTypeResponse(
      {
        ...attributeType,
        deleted_at: null,
      },
      usageCounts.get(attributeType.id) ?? 0
    ),
  })
}
