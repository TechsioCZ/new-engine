import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { kebabCase } from "@medusajs/framework/utils"
import {
  createProducersWorkflow,
  type ProducerInput,
} from "../../../workflows/producer"
import {
  getProducerActiveProductCounts,
  getProducerService,
  toProducerResponse,
} from "./utils"
import type {
  AdminCreateProducerSchemaType,
  AdminGetProducersSchemaType,
} from "./validators"

const ORDER_FIELDS = new Set(["title", "handle", "created_at", "updated_at"])
const LEADING_DASH_REGEX = /^-/

const parseOrder = (input?: string) => {
  const value = input ?? "title"
  const direction = value.startsWith("-") ? "DESC" : "ASC"
  const field = value.replace(LEADING_DASH_REGEX, "")

  if (!ORDER_FIELDS.has(field)) {
    return { title: "ASC" }
  }

  return {
    [field]: direction,
  }
}

export async function GET(
  req: MedusaRequest<unknown, AdminGetProducersSchemaType>,
  res: MedusaResponse
) {
  const service = getProducerService(req.scope)
  const { include_deleted, limit, offset, q } = req.validatedQuery
  const order = parseOrder(
    req.validatedQuery.order_by ?? req.validatedQuery.order
  )
  const filters = q
    ? {
        $or: [
          { title: { $ilike: `%${q}%` } },
          { handle: { $ilike: `%${q}%` } },
        ],
      }
    : {}

  const [producers, count] = await service.listAndCountProducers(filters, {
    order,
    relations: ["attributes", "attributes.attributeType"],
    skip: offset,
    take: limit,
    withDeleted: include_deleted,
  })
  const activeProductCounts = await getProducerActiveProductCounts(
    req.scope,
    producers.map((producer) => producer.id)
  )

  res.json({
    count,
    limit,
    offset,
    producers: producers.map((producer) =>
      toProducerResponse(producer, activeProductCounts.get(producer.id) ?? 0)
    ),
  })
}

export async function POST(
  req: MedusaRequest<AdminCreateProducerSchemaType>,
  res: MedusaResponse
) {
  const input: ProducerInput = {
    attributes: req.validatedBody.attributes,
    handle: req.validatedBody.handle ?? kebabCase(req.validatedBody.title),
    title: req.validatedBody.title,
  }

  const { result } = await createProducersWorkflow(req.scope).run({
    input: {
      producers: [input],
    },
  })
  const created = result[0]

  const producer = await getProducerService(req.scope).retrieveProducer(
    created?.id ?? "",
    {
      relations: ["attributes", "attributes.attributeType"],
    }
  )

  res.status(200).json({ producer: toProducerResponse(producer) })
}
