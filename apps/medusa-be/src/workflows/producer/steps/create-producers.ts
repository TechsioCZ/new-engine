import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { CreateProducersWorkflowInput } from "../types"
import { getProducerService, setProducerAttributes } from "./helpers"

export const createProducersStep = createStep(
  "create-producers",
  async (input: CreateProducersWorkflowInput, { container }) => {
    const service = getProducerService(container)

    const producers = (await service.createProducers(
      input.producers.map((producer) => ({
        handle: producer.handle,
        title: producer.title,
      }))
    )) as Array<{ id: string }>
    const createdIds = producers.map((producer) => producer.id)

    try {
      await Promise.all(
        producers.map((producer, index) =>
          setProducerAttributes(
            service,
            producer.id,
            input.producers[index]?.attributes
          )
        )
      )
    } catch (error) {
      if (createdIds.length) {
        await service.deleteProducers(createdIds)
      }

      throw error
    }

    return new StepResponse(producers, createdIds)
  },
  async (createdIds, { container }) => {
    if (!createdIds?.length) {
      return
    }

    await getProducerService(container).deleteProducers(createdIds)
  }
)
