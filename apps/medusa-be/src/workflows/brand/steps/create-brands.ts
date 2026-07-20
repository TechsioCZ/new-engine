import { kebabCase, MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { CreateBrandsWorkflowInput } from "../types"
import {
  buildBrandWriteInput,
  getBrandService,
  setBrandAttributes,
  withBrandTransaction,
} from "./helpers"
import {
  getBrandHandleCollisionMessage,
  validateBrandGpsrState,
} from "./validation"

export const createBrandsStep = createStep(
  "create-brands",
  async (input: CreateBrandsWorkflowInput, { container }) => {
    const service = getBrandService(container)
    const normalizedBrands = input.brands.map((brand) => {
      const title = brand.title.trim()
      const handle = brand.handle?.trim() || kebabCase(title)

      if (!(title && handle)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Brand title and handle must not be empty"
        )
      }

      return {
        ...brand,
        ...validateBrandGpsrState(
          {
            ...brand,
            handle,
            title,
          },
          handle
        ),
        handle,
        title,
      }
    })
    const handles = normalizedBrands.map((brand) => brand.handle)

    if (new Set(handles).size !== handles.length) {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        "The create request contains duplicate brand handles"
      )
    }

    const existingBrands = await service.listBrands(
      {
        handle: { $in: handles },
      },
      {
        take: Math.max(handles.length * 2, 1),
        withDeleted: true,
      }
    )

    if (existingBrands.length) {
      const existing = existingBrands[0]
      if (!existing) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "Brand lookup returned an empty record"
        )
      }
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        getBrandHandleCollisionMessage(existing)
      )
    }

    const brands = await withBrandTransaction(service, async (context) => {
      const createdBrands = (await service.createBrands(
        normalizedBrands.map((brand) =>
          buildBrandWriteInput({
            gpsr_contact_email: brand.gpsr_contact_email,
            gpsr_european_reseller_contact_email:
              brand.gpsr_european_reseller_contact_email,
            gpsr_european_reseller_manufacturing_company_name:
              brand.gpsr_european_reseller_manufacturing_company_name,
            gpsr_european_reseller_postal_address:
              brand.gpsr_european_reseller_postal_address,
            gpsr_manufactured_outside_eu: brand.gpsr_manufactured_outside_eu,
            gpsr_manufacturing_company_name:
              brand.gpsr_manufacturing_company_name,
            gpsr_postal_address: brand.gpsr_postal_address,
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
        normalizedBrands.map(async (brand) => {
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
