import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { CreateBrandsWorkflowInput } from "../types"
import {
  buildBrandWriteInput,
  getBrandService,
  setBrandAttributes,
  withBrandTransaction,
} from "./helpers"

export const createBrandsStep = createStep(
  "create-brands",
  async (input: CreateBrandsWorkflowInput, { container }) => {
    const service = getBrandService(container)

    const brands = await withBrandTransaction(service, async (context) => {
      const createdBrands = (await service.createBrands(
        input.brands.map((brand) =>
          buildBrandWriteInput({
            gpsrContactEmail: brand.gpsrContactEmail,
            gpsrEuropeanResellerContactEmail:
              brand.gpsrEuropeanResellerContactEmail,
            gpsrEuropeanResellerManufacturingCompanyName:
              brand.gpsrEuropeanResellerManufacturingCompanyName,
            gpsrEuropeanResellerPostalAddress:
              brand.gpsrEuropeanResellerPostalAddress,
            gpsrManufacturedOutsideEu: brand.gpsrManufacturedOutsideEu,
            gpsrManufacturingCompanyName: brand.gpsrManufacturingCompanyName,
            gpsrPostalAddress: brand.gpsrPostalAddress,
            handle: brand.handle,
            title: brand.title,
          })
        ),
        context
      )) as Array<{ id: string; handle: string }>

      const createdBrandsByHandle = new Map(
        createdBrands.map((brand) => [brand.handle, brand])
      )

      await Promise.all(
        input.brands.map(async (brand) => {
          const createdBrand = createdBrandsByHandle.get(brand.handle)

          if (!createdBrand) {
            throw new Error(`Created brand "${brand.handle}" was not found`)
          }

          await setBrandAttributes(
            service,
            createdBrand.id,
            brand.attributes,
            context
          )
        })
      )

      return createdBrands
    })
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
