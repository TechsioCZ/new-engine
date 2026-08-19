import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

export type ProductListCartMarketContextInput = {
  country_code?: string
  region_id: string
  sales_channel_id: string
}

type RegionRecord = {
  countries?: Array<{ iso_2?: string | null }> | null
  id: string
  metadata?: Record<string, unknown> | null
}

export const assertProductListCartMarketContextStep = createStep(
  "assert-product-list-cart-market-context",
  async (input: ProductListCartMarketContextInput, { container }) => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "region",
      fields: ["id", "countries.iso_2", "metadata"],
      filters: { id: input.region_id },
      pagination: { take: 1 },
    })
    const region = data[0] as RegionRecord | undefined

    if (!region) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "The selected region was not found"
      )
    }

    const configuredSalesChannelId =
      typeof region.metadata?.storefront_sales_channel_id === "string"
        ? region.metadata.storefront_sales_channel_id.trim()
        : ""

    if (configuredSalesChannelId !== input.sales_channel_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The selected sales channel does not belong to the selected region"
      )
    }

    if (input.country_code) {
      const normalizedCountryCode = input.country_code.trim().toLowerCase()
      const regionCountryCodes =
        region.countries?.flatMap((country) =>
          typeof country.iso_2 === "string"
            ? [country.iso_2.trim().toLowerCase()]
            : []
        ) ?? []

      if (!regionCountryCodes.includes(normalizedCountryCode)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "The selected country does not belong to the selected region"
        )
      }
    }

    return new StepResponse({
      region_id: region.id,
      sales_channel_id: input.sales_channel_id,
    })
  }
)
