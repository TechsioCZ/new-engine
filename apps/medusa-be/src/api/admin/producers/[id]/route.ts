import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  deleteProducersWorkflow,
  restoreProducersWorkflow,
  updateProducersWorkflow,
} from "../../../../workflows/producer"
import {
  getProducerActiveProductCounts,
  retrieveProducerOrThrow,
  toProducerResponse,
} from "../utils"
import type { AdminUpdateProducerSchemaType } from "../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const producerId = req.params.id ?? ""
  const producer = await retrieveProducerOrThrow(req.scope, producerId)
  const activeProductCounts = await getProducerActiveProductCounts(req.scope, [
    producer.id,
  ])

  res.status(200).json({
    producer: toProducerResponse(
      producer,
      activeProductCounts.get(producer.id) ?? 0
    ),
  })
}

export async function POST(
  req: MedusaRequest<AdminUpdateProducerSchemaType>,
  res: MedusaResponse
) {
  const producerId = req.params.id ?? ""

  await retrieveProducerOrThrow(req.scope, producerId)

  const { result } = await updateProducersWorkflow(req.scope).run({
    input: {
      selector: {
        id: producerId,
      },
      update: req.validatedBody,
    },
  })

  const updated = result[0]
  const producer = await retrieveProducerOrThrow(
    req.scope,
    updated?.id ?? producerId
  )
  const activeProductCounts = await getProducerActiveProductCounts(req.scope, [
    producer.id,
  ])

  res.status(200).json({
    producer: toProducerResponse(
      producer,
      activeProductCounts.get(producer.id) ?? 0
    ),
  })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id ?? ""

  await retrieveProducerOrThrow(req.scope, id)
  await deleteProducersWorkflow(req.scope).run({
    input: {
      ids: [id],
    },
  })

  res.status(200).json({
    deleted: true,
    id,
    object: "producer",
  })
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id ?? ""

  await retrieveProducerOrThrow(req.scope, id)
  await restoreProducersWorkflow(req.scope).run({
    input: {
      ids: [id],
    },
  })

  const producer = await retrieveProducerOrThrow(req.scope, id)
  const activeProductCounts = await getProducerActiveProductCounts(req.scope, [
    producer.id,
  ])

  res.status(200).json({
    producer: toProducerResponse(
      producer,
      activeProductCounts.get(producer.id) ?? 0
    ),
  })
}
