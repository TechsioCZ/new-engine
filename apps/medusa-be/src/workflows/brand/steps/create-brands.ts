import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { CreateBrandsWorkflowInput } from "../types"
import {
  getBrandService,
  setBrandAttributes,
  withBrandTransaction,
} from "./helpers"

export const createBrandsStep = createStep(
  "create-brands",
  async (input: CreateBrandsWorkflowInput, { container }) => {
    const service = getBrandService(container)

    const brands = await withBrandTransaction(
      service,
      async (context) => {
        const createdBrands = (await service.createBrands(
          input.brands.map((brand) => ({
            handle: brand.handle,
            title: brand.title,
          })),
          context
        )) as Array<{ id: string }>

        await Promise.all(
          createdBrands.map((brand, index) =>
            setBrandAttributes(
              service,
              brand.id,
              input.brands[index]?.attributes,
              context
            )
          )
        )

        return createdBrands
      }
    )
    const createdIds = brands.map((brand) => brand.id)

    return new StepResponse(brands, createdIds)
  },
  async (createdIds, { container }) => {
    if (!createdIds?.length) {
      return
    }

    await getBrandService(container).deleteBrands(createdIds)
  }
)
