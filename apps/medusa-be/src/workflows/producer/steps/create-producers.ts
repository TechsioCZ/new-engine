import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { CreateProducersWorkflowInput } from "../types"
import {
  getProducerService,
  setProducerAttributes,
  withProducerTransaction,
} from "./helpers"

export const createProducersStep = createStep(
  "create-producers",
  async (input: CreateProducersWorkflowInput, { container }) => {
    const service = getProducerService(container)

    const producers = await withProducerTransaction(
      service,
      async (context) => {
        const createdProducers = (await service.createProducers(
          input.producers.map((producer) => ({
            handle: producer.handle,
            title: producer.title,
          })),
          context
        )) as Array<{ id: string }>

        await Promise.all(
          createdProducers.map((producer, index) =>
            setProducerAttributes(
              service,
              producer.id,
              input.producers[index]?.attributes,
              context
            )
          )
        )

        return createdProducers
      }
    )
    const createdIds = producers.map((producer) => producer.id)

    return new StepResponse(producers, createdIds)
  },
  async (createdIds, { container }) => {
    if (!createdIds?.length) {
      return
    }

    await getProducerService(container).deleteProducers(createdIds)
  }
)
