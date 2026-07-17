import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { UpdateBrandsWorkflowInput } from "../types"
import {
  asArray,
  buildBrandWriteInput,
  getBrandService,
  normalizeBrandWriteInput,
  setBrandAttributes,
  snapshotBrand,
  validateBrandGpsrState,
  withBrandTransaction,
} from "./helpers"

export const updateBrandsStep = createStep(
  "update-brands",
  async (input: UpdateBrandsWorkflowInput, { container }) => {
    const service = getBrandService(container)
    const previous = await snapshotBrand(service, input.selector.id)
    const normalizedUpdate = normalizeBrandWriteInput(input.update)
    const effectiveState = {
      ...previous,
      ...normalizedUpdate,
    }

    if (!(effectiveState.title && effectiveState.handle)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Brand title and handle must not be empty"
      )
    }

    validateBrandGpsrState(effectiveState, effectiveState.handle)

    if (effectiveState.handle !== previous.handle) {
      const collisions = await service.listBrands(
        {
          handle: effectiveState.handle,
        },
        {
          take: 2,
          withDeleted: true,
        }
      )
      const collision = collisions.find(
        (brand) => brand.id !== input.selector.id
      )

      if (collision) {
        const suffix = collision.deleted_at ? " as a deleted record" : ""

        throw new MedusaError(
          MedusaError.Types.DUPLICATE_ERROR,
          `Brand with handle "${effectiveState.handle}" already exists${suffix}.`
        )
      }
    }

    const brands = await withBrandTransaction(service, async (context) => {
      const updatedBrands = asArray(
        await service.updateBrands(
          {
            id: input.selector.id,
            ...buildBrandWriteInput(normalizedUpdate),
          },
          context
        )
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
