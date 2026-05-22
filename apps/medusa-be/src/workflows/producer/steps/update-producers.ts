import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { UpdateProducersWorkflowInput } from "../types"
import {
  asArray,
  getProducerService,
  setProducerAttributes,
  snapshotProducer,
  withProducerTransaction,
} from "./helpers"

export const updateProducersStep = createStep(
  "update-producers",
  async (input: UpdateProducersWorkflowInput, { container }) => {
    const service = getProducerService(container)
    const previous = await snapshotProducer(service, input.selector.id)

    const producers = await withProducerTransaction(
      service,
      async (context) => {
        const updatedProducers = asArray(
          (await service.updateProducers(
            {
              id: input.selector.id,
              ...(input.update.title !== undefined
                ? { title: input.update.title }
                : {}),
              ...(input.update.handle !== undefined
                ? { handle: input.update.handle }
                : {}),
            },
            context
          )) as { id: string } | Array<{ id: string }>
        )

        if (input.update.attributes !== undefined) {
          await setProducerAttributes(
            service,
            input.selector.id,
            input.update.attributes,
            context
          )
        }

        return updatedProducers
      }
    )

    return new StepResponse(producers, previous)
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }

    const service = getProducerService(container)

    await withProducerTransaction(service, async (context) => {
      await service.updateProducers(
        {
          handle: previous.handle,
          id: previous.id,
          title: previous.title,
        },
        context
      )
      await setProducerAttributes(
        service,
        previous.id,
        previous.attributes,
        context
      )
    })
  }
)
