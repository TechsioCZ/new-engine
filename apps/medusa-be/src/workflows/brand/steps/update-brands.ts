import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { UpdateBrandsWorkflowInput } from "../types"
import {
  asArray,
  buildBrandWriteInput,
  getBrandService,
  setBrandAttributes,
  snapshotBrand,
  withBrandTransaction,
} from "./helpers"

export const updateBrandsStep = createStep(
  "update-brands",
  async (input: UpdateBrandsWorkflowInput, { container }) => {
    const service = getBrandService(container)
    const previous = await snapshotBrand(service, input.selector.id)

    const brands = await withBrandTransaction(service, async (context) => {
      const updatedBrands = asArray(
        (await service.updateBrands(
          {
            id: input.selector.id,
            ...buildBrandWriteInput(input.update),
          },
          context
        )) as { id: string } | Array<{ id: string }>
      )

      if (input.update.attributes !== undefined) {
        await setBrandAttributes(
          service,
          input.selector.id,
          input.update.attributes,
          context
        )
      }

      return updatedBrands
    })

    return new StepResponse(brands, previous)
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }

    const service = getBrandService(container)

    await withBrandTransaction(service, async (context) => {
      await service.updateBrands(
        {
          ...buildBrandWriteInput(previous),
          id: previous.id,
        },
        context
      )
      await setBrandAttributes(
        service,
        previous.id,
        previous.attributes,
        context
      )
    })
  }
)
