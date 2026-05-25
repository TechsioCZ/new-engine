import type { ApiKeyDTO } from "@medusajs/framework/types"
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { toCreateProductsStepInput } from "../../../utils/products"
import * as Steps from "../steps"
import seedCategoriesWorkflow, { type CategoryRaw } from "./seed-categories"

const seedN1WorkflowId = "seed-n1-workflow"
/** Raw product record from database - contains JSON strings for nested data */
type RawProductRecord = {
  title: string
  handle: string
  description?: string
  thumbnail?: string
  images: string
  variants: string
  options: string
  categories: string
  producer: string
}

export type SeedN1WorkflowInput = {
  categories: CategoryRaw[]
  products: RawProductRecord[]
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

function buildInventoryItemsInput(
  products: Steps.CreateProductsStepInput
): Steps.CreateInventoryLevelsStepInput["inventoryItems"] {
  const inventoryItems: Steps.CreateInventoryLevelsStepInput["inventoryItems"] =
    []

  for (const product of products) {
    for (const variant of product.variants ?? []) {
      if (!variant.sku) {
        continue
      }

      if (variant.quantities?.locations?.length) {
        inventoryItems.push({
          sku: variant.sku,
          locations: variant.quantities.locations,
        })
        continue
      }

      if (variant.quantities?.quantity !== undefined) {
        inventoryItems.push({
          sku: variant.sku,
          quantity: variant.quantities.quantity,
        })
      }
    }
  }

  return inventoryItems
}

const seedN1Workflow = createWorkflow(
  seedN1WorkflowId,
  (input: SeedN1WorkflowInput) => {
    // create sales channels
    const salesChannelsResult = Steps.createSalesChannelsStep(
      input.salesChannels
    )

    // update store currencies
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

    // create regions
    const createRegionsResult = Steps.createRegionsStep(input.regions)

    // create tax regions
    Steps.createTaxRegionsStep(input.taxRegions)

    // create stock locations
    const createStockLocationResult = Steps.createStockLocationSeedStep(
      input.stockLocations
    )

    // link stock locations to fulfillment providers (derived from shipping options)
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

    // create a shipping profile
    const createDefaultShippingProfileResult =
      Steps.createDefaultShippingProfileStep(input.defaultShippingProfile)

    // create fulfillment sets
    const createFulfillmentSetsResult = Steps.createFulfillmentSetStep(
      input.fulfillmentSets
    )

    // link stock locations to fulfillment set
    const linkStockLocationsFulfillmentSetInput: Steps.LinkStockLocationFulfillmentSetStepInput =
      transform(
        {
          createStockLocationResult,
          input,
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

    // create shipping options

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

    // link sales channels to stock location
    const linkSalesChannelsToStockLocationInput: Steps.LinkSalesChannelsStockLocationStepInput =
      transform(
        {
          createStockLocationResult,
          input,
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

    // create publishable key

    const createPublishableKeyResult = Steps.createPublishableKeyStep(
      input.publishableKey
    )

    // link publishable key to salesChannels
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

    // create categories
    seedCategoriesWorkflow.runAsStep({
      input: input.categories,
    })

    // create products
    const createProductsStepInput: Steps.CreateProductsStepInput = transform(
      {
        input,
      },
      (data) => toCreateProductsStepInput(data.input.products)
    )

    const createProductsStepResult = Steps.createProductsStep(
      createProductsStepInput
    )

    // create inventory levels
    const createInventoryLevelsInput: Steps.CreateInventoryLevelsStepInput =
      transform(
        {
          createStockLocationResult,
          createProductsStepInput,
        },
        (data) => ({
          stockLocations: data.createStockLocationResult.result,
          inventoryItems: buildInventoryItemsInput(
            data.createProductsStepInput
          ),
        })
      )

    Steps.createInventoryLevelsStep(createInventoryLevelsInput)

    return new WorkflowResponse({
      publishableKey: createPublishableKeyResult.result,
      products: createProductsStepResult.result,
      result: "N1 seed done",
    })
  }
)

export default seedN1Workflow
