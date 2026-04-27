import type { ApiKeyDTO } from "@medusajs/framework/types"
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import seedProductsJson from "../../../scripts/seed-files/seed-products.json"
import * as Steps from "../steps"

const seedDevWorkflowId = "seed-dev-workflow"

type DevSeedProduct = {
  id: number
  title: string
  description?: string
  category: string
  price: number
  discountPercentage?: number
  rating?: number
  stock: number
  tags?: string[]
  brand?: string
  sku: string
  weight?: number
  dimensions?: {
    width?: number
    height?: number
    depth?: number
  }
  warrantyInformation?: string
  shippingInformation?: string
  availabilityStatus?: string
  reviews?: {
    rating?: number
    comment?: string
    date?: string
    reviewerName?: string
    reviewerEmail?: string
  }[]
  returnPolicy?: string
  minimumOrderQuantity?: number
  meta?: {
    createdAt?: string
    updatedAt?: string
    barcode?: string
    qrCode?: string
  }
  images?: string[]
  thumbnail?: string
}

export type SeedDevWorkflowInput = {
  salesChannels: Steps.CreateSalesChannelsStepInput
  currencies: Steps.UpdateStoreCurrenciesStepCurrenciesInput
  regions: Steps.CreateRegionsStepInput
  taxRegions: Steps.CreateTaxRegionsStepInput
  stockLocations: Steps.CreateStockLocationStepInput
  defaultShippingProfile: Steps.CreateDefaultShippingProfileStepInput
  fulfillmentSets: Steps.CreateFulfillmentSetStepInput
  shippingOptions: Steps.CreateShippingOptionsStepSeedInput
  publishableKey: Steps.CreatePublishableKeyStepInput
}

const products = seedProductsJson.products as DevSeedProduct[]

function toTitleCase(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ")
}

function toHandle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function toPriceAmount(
  price: number,
  currencyCode: string,
  currencyMultipliers: Record<string, number>
) {
  const multiplier = currencyMultipliers[currencyCode.toLowerCase()] ?? 1
  return Number((price * multiplier).toFixed(2))
}

function toProductCategories(
  inputProducts: DevSeedProduct[]
): Steps.CreateProductCategoriesStepInput {
  return [...new Set(inputProducts.map((product) => product.category))]
    .sort()
    .map((category) => ({
      name: toTitleCase(category),
      handle: category,
      isActive: true,
    }))
}

function toProductTags(tags: string[] | undefined) {
  return tags
    ?.map((tag) => tag.trim())
    .filter(Boolean)
    .map((value) => ({ value }))
}

function toProductsStepInput(
  inputProducts: DevSeedProduct[],
  currencies: Steps.UpdateStoreCurrenciesStepCurrenciesInput
): Steps.CreateProductsStepInput {
  const currencyMultipliers = {
    czk: 25,
  }
  const currencyCodes = currencies.map((currency) => currency.code)

  return inputProducts.map((product) => {
    const handle = `dev-${product.id}-${toHandle(product.title)}`

    return {
      title: product.title,
      categories: [
        {
          name: toTitleCase(product.category),
          handle: product.category,
        },
      ],
      description: product.description ?? "",
      handle,
      externalId: `dummyjson:${product.id}`,
      weight: product.weight,
      width: product.dimensions?.width,
      height: product.dimensions?.height,
      length: product.dimensions?.depth,
      tags: toProductTags(product.tags),
      metadata: {
        seed: {
          dev: {
            source: "seed-products.json",
            discountPercentage: product.discountPercentage,
            rating: product.rating,
            warrantyInformation: product.warrantyInformation,
            shippingInformation: product.shippingInformation,
            availabilityStatus: product.availabilityStatus,
            reviews: product.reviews,
            returnPolicy: product.returnPolicy,
            minimumOrderQuantity: product.minimumOrderQuantity,
            meta: {
              createdAt: product.meta?.createdAt,
              updatedAt: product.meta?.updatedAt,
              qrCode: product.meta?.qrCode,
            },
          },
        },
      },
      producer: product.brand
        ? {
            title: product.brand,
            attributes: [],
          }
        : null,
      shippingProfileName: "Default Shipping Profile",
      thumbnail: product.thumbnail,
      images: (product.images ?? []).map((url) => ({ url })),
      options: [
        {
          title: "Default",
          values: ["Default"],
        },
      ],
      variants: [
        {
          title: product.title,
          sku: product.sku,
          barcode: product.meta?.barcode,
          weight: product.weight,
          width: product.dimensions?.width,
          height: product.dimensions?.height,
          length: product.dimensions?.depth,
          options: {
            Default: "Default",
          },
          quantities: {
            quantity: product.stock,
          },
          prices: currencyCodes.map((currencyCode) => ({
            amount: toPriceAmount(
              product.price,
              currencyCode,
              currencyMultipliers
            ),
            currency_code: currencyCode,
          })),
        },
      ],
      salesChannelNames: ["Default Sales Channel"],
    }
  })
}

export const seedDevWorkflow = createWorkflow(
  seedDevWorkflowId,
  (input: SeedDevWorkflowInput) => {
    const salesChannelsResult = Steps.createSalesChannelsStep(
      input.salesChannels
    )

    const updateStoreCurrenciesStepInput = transform(
      {
        input,
        salesChannelsResult,
      },
      (data) => {
        const defaultSalesChannel = data.salesChannelsResult.result.find(
          (i) => i.isDefault
        )
        if (!defaultSalesChannel) {
          throw new Error("No default sales channel found")
        }
        return {
          currencies: data.input.currencies,
          defaultSalesChannelId: defaultSalesChannel.id,
        }
      }
    )
    Steps.updateStoreCurrenciesStep(updateStoreCurrenciesStepInput)

    const createRegionsResult = Steps.createRegionsStep(input.regions)

    Steps.createTaxRegionsStep(input.taxRegions)

    const createStockLocationResult = Steps.createStockLocationSeedStep(
      input.stockLocations
    )

    const linkStockLocationsFulfillmentProviderInput: Steps.LinkStockLocationFulfillmentProviderStepInput =
      transform(
        {
          createStockLocationResult,
          input,
        },
        (data) => ({
          stockLocations: data.createStockLocationResult.result,
          fulfillmentProviderIds: [
            ...new Set(
              data.input.shippingOptions.map(
                (opt) => opt.providerId || "manual_manual"
              )
            ),
          ],
        })
      )

    Steps.linkStockLocationFulfillmentProviderSeedStep(
      linkStockLocationsFulfillmentProviderInput
    )

    const createDefaultShippingProfileResult =
      Steps.createDefaultShippingProfileStep(input.defaultShippingProfile)

    const createFulfillmentSetsResult = Steps.createFulfillmentSetStep(
      input.fulfillmentSets
    )

    const linkStockLocationsFulfillmentSetInput: Steps.LinkStockLocationFulfillmentSetStepInput =
      transform(
        {
          createStockLocationResult,
          createFulfillmentSetsResult,
        },
        (data) => {
          const fulfillmentSet = data.createFulfillmentSetsResult.result[0]
          if (!fulfillmentSet) {
            throw new Error(
              "No fulfillment sets created - cannot link stock locations"
            )
          }
          return {
            stockLocations: data.createStockLocationResult.result,
            fulfillmentSet,
          }
        }
      )

    Steps.linkStockLocationFulfillmentSetStep(
      linkStockLocationsFulfillmentSetInput
    )

    const createShippingOptionsInput: Steps.CreateShippingOptionsStepInput =
      transform(
        {
          input,
          createFulfillmentSetsResult,
          createDefaultShippingProfileResult,
          createRegionsResult,
        },
        (data) => {
          const serviceZoneId =
            data.createFulfillmentSetsResult.result[0]?.service_zones[0]?.id
          if (!serviceZoneId) {
            throw new Error(
              "No service zone found - cannot create shipping options"
            )
          }

          const shippingProfileId =
            data.createDefaultShippingProfileResult.result[0]?.id
          if (!shippingProfileId) {
            throw new Error(
              "No shipping profile found - cannot create shipping options"
            )
          }

          return data.input.shippingOptions.map((option) => ({
            name: option.name,
            providerId: option.providerId || "manual_manual",
            serviceZoneId,
            shippingProfileId,
            regions: data.createRegionsResult.result.map((region) => ({
              ...region,
              amount:
                option.prices.find(
                  (p) =>
                    p.currencyCode?.toLowerCase() ===
                    region.currency_code?.toLowerCase()
                )?.amount ?? 10,
            })),
            type: option.type,
            prices: option.prices,
            rules: option.rules,
            data: option.data,
          }))
        }
      )

    Steps.createShippingOptionsStep(createShippingOptionsInput)

    const linkSalesChannelsToStockLocationInput: Steps.LinkSalesChannelsStockLocationStepInput =
      transform(
        {
          createStockLocationResult,
          salesChannelsResult,
        },
        (data) => ({
          stockLocations: data.createStockLocationResult.result,
          salesChannels: data.salesChannelsResult.result,
        })
      )

    Steps.linkSalesChannelsStockLocationStep(
      linkSalesChannelsToStockLocationInput
    )

    const createPublishableKeyResult = Steps.createPublishableKeyStep(
      input.publishableKey
    )

    const linkSalesChannelsApiKeyStepInput: Steps.LinkSalesChannelsApiKeyStepInput =
      transform(
        {
          createPublishableKeyResult,
          salesChannelsResult,
        },
        (data) => ({
          salesChannels: data.salesChannelsResult.result,
          publishableApiKey: data.createPublishableKeyResult
            .result[0] as ApiKeyDTO,
        })
      )

    Steps.linkSalesChannelsApiKeyStep(linkSalesChannelsApiKeyStepInput)

    const productCategories = toProductCategories(products)

    const createProductCategoriesResult =
      Steps.createProductCategoriesStep(productCategories)

    const createProductsStepInput: Steps.CreateProductsStepInput = transform(
      {
        input,
        createProductCategoriesResult,
      },
      (data) => toProductsStepInput(products, data.input.currencies)
    )

    const createProductsStepResult = Steps.createProductsStep(
      createProductsStepInput
    )

    const createInventoryLevelsInput: Steps.CreateInventoryLevelsStepInput =
      transform(
        {
          createStockLocationResult,
          createProductsStepInput,
          createProductsStepResult,
        },
        (data) => {
          const inventoryItems: Steps.CreateInventoryLevelsStepInput["inventoryItems"] =
            []
          for (const product of data.createProductsStepInput) {
            for (const variant of product.variants ?? []) {
              if (!variant.sku || variant.quantities?.quantity === undefined) {
                continue
              }
              inventoryItems.push({
                sku: variant.sku,
                quantity: variant.quantities.quantity,
              })
            }
          }

          return {
            stockLocations: data.createStockLocationResult.result,
            inventoryItems,
          }
        }
      )

    Steps.createInventoryLevelsStep(createInventoryLevelsInput)

    return new WorkflowResponse({
      publishableKey: createPublishableKeyResult.result,
      products: createProductsStepResult.result,
      result: "Dev seed done",
    })
  }
)

export default seedDevWorkflow
