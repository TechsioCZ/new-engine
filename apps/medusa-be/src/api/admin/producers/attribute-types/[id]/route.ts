import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  deleteProducerAttributeTypesWorkflow,
  restoreProducerAttributeTypesWorkflow,
} from "../../../../../workflows/producer"
import {
  getProducerActiveProductCounts,
  getProducerAttributeTypeUsageCounts,
  getProducerService,
  type ProducerAttributeRecord,
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

const getProducerOrderValue = (
  attribute: ProducerAttributeRecord,
  field: string
) => {
  if (field === "attribute_value") {
    return attribute.value
  }

  if (!attribute.producer) {
    return ""
  }

  switch (field) {
    case "handle":
      return attribute.producer.handle
    case "title":
      return attribute.producer.title
    case "created_at":
      return attribute.producer.created_at
    case "updated_at":
      return attribute.producer.updated_at
    default:
      return ""
  }
}

const toComparableTimestamp = (value: unknown) => {
  if (value instanceof Date) {
    return value.getTime()
  }

  if (typeof value !== "string") {
    return Number.NaN
  }

  return Date.parse(value)
}

const compareOrderValues = (left: unknown, right: unknown) => {
  if (left == null && right == null) {
    return 0
  }

  if (left == null) {
    return -1
  }

  if (right == null) {
    return 1
  }

  if (typeof left === "number" && typeof right === "number") {
    return left - right
  }

  const leftTimestamp = toComparableTimestamp(left)
  const rightTimestamp = toComparableTimestamp(right)

  if (Number.isFinite(leftTimestamp) && Number.isFinite(rightTimestamp)) {
    return leftTimestamp - rightTimestamp
  }

  return String(left).localeCompare(String(right))
}

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
  const attributes = await service.listProducerAttributes(
    {
      attribute_type_id: attributeType.id,
    },
    {
      relations: ["producer"],
      withDeleted: true,
    }
  )
  const query = q?.toLocaleLowerCase()
  const filteredAttributes = attributes.filter((attribute) => {
    if (!(include_deleted || !attribute.producer?.deleted_at)) {
      return false
    }

    if (!query) {
      return true
    }

    return [
      attribute.value,
      attribute.producer?.handle,
      attribute.producer?.title,
    ].some((value) => value?.toLocaleLowerCase().includes(query))
  })

  filteredAttributes.sort((left, right) => {
    const result = compareOrderValues(
      getProducerOrderValue(left, order.field),
      getProducerOrderValue(right, order.field)
    )

    return order.direction === "DESC" ? -result : result
  })

  const page = filteredAttributes.slice(offset, offset + limit)
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
    count: filteredAttributes.length,
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
