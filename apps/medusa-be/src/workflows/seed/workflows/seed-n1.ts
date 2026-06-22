import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { toCreateProductsStepInput } from "../../../utils/products"
import { buildInventoryItemsInput } from "../helpers/build-inventory-items-input"
import {
  type CreateFulfillmentSetStepInput,
  createFulfillmentSetStep,
} from "../steps/create-fulfillment-set"
import {
  type CreateInventoryLevelsStepInput,
  createInventoryLevelsStep,
} from "../steps/create-inventory-levels"
import {
  type CreateProductsStepInput,
  createProductsStep,
} from "../steps/create-products"
import {
  type CreatePublishableKeyStepInput,
  createPublishableKeyStep,
} from "../steps/create-publishable-key"
import {
  type CreateRegionsStepInput,
  createRegionsStep,
} from "../steps/create-regions"
import {
  type CreateSalesChannelsStepInput,
  createSalesChannelsStep,
} from "../steps/create-sales-channels"
import {
  type CreateShippingOptionsStepInput,
  type CreateShippingOptionsStepSeedInput,
  createShippingOptionsStep,
} from "../steps/create-shipping-options"
import {
  type CreateDefaultShippingProfileStepInput,
  createDefaultShippingProfileStep,
} from "../steps/create-shipping-profile"
import {
  type CreateStockLocationStepInput,
  createStockLocationSeedStep,
} from "../steps/create-stock-location"
import {
  type CreateTaxRegionsStepInput,
  createTaxRegionsStep,
} from "../steps/create-tax-regions"
import {
  type LinkSalesChannelsApiKeyStepInput,
  linkSalesChannelsApiKeyStep,
} from "../steps/link-sales-channels-api-key"
import {
  type LinkSalesChannelsStockLocationStepInput,
  linkSalesChannelsStockLocationStep,
} from "../steps/link-sales-channels-stock-location"
import {
  type LinkStockLocationFulfillmentProviderStepInput,
  linkStockLocationFulfillmentProviderSeedStep,
} from "../steps/link-stock-location-fulfillment-provider"
import {
  type LinkStockLocationFulfillmentSetStepInput,
  linkStockLocationFulfillmentSetStep,
} from "../steps/link-stock-location-fulfillment-set"
import {
  type UpdateStoreCurrenciesStepCurrenciesInput,
  updateStoreCurrenciesStep,
} from "../steps/update-store-currencies"
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
  workflowDefaults: {
    fulfillmentProviderId: string
    shippingOptionPriceAmount: number
  }
  categories: CategoryRaw[]
  products: RawProductRecord[]
  salesChannels: CreateSalesChannelsStepInput
  currencies: UpdateStoreCurrenciesStepCurrenciesInput
  regions: CreateRegionsStepInput
  taxRegions: CreateTaxRegionsStepInput
  stockLocations: CreateStockLocationStepInput
  defaultShippingProfile: CreateDefaultShippingProfileStepInput
  fulfillmentSets: CreateFulfillmentSetStepInput
  shippingOptions: CreateShippingOptionsStepSeedInput
  publishableKey: CreatePublishableKeyStepInput
}

function seedN1WorkflowComposer(input: SeedN1WorkflowInput) {
  // create sales channels
  const salesChannelsResult = createSalesChannelsStep(input.salesChannels)

  // update store currencies
  const updateStoreCurrenciesStepInput = transform(
    {
      input,
      salesChannelsResult,
    },
    (data) => ({
      currencies: data.input.currencies,
      defaultSalesChannelId: data.salesChannelsResult.defaultSalesChannel.id,
    })
  )
  updateStoreCurrenciesStep(updateStoreCurrenciesStepInput)

  // create regions
  const createRegionsResult = createRegionsStep(input.regions)

  // create tax regions
  createTaxRegionsStep(input.taxRegions)

  // create stock locations
  const createStockLocationResult = createStockLocationSeedStep(
    input.stockLocations
  )

  // link stock locations to fulfillment providers (derived from shipping options)
  const linkStockLocationsFulfillmentProviderInput: LinkStockLocationFulfillmentProviderStepInput =
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
              (opt) =>
                opt.providerId ??
                data.input.workflowDefaults.fulfillmentProviderId
            )
          ),
        ],
      })
    )

  linkStockLocationFulfillmentProviderSeedStep(
    linkStockLocationsFulfillmentProviderInput
  )

  // create a shipping profile
  const createDefaultShippingProfileResult = createDefaultShippingProfileStep(
    input.defaultShippingProfile
  )

  // create fulfillment sets
  const createFulfillmentSetsResult = createFulfillmentSetStep(
    input.fulfillmentSets
  )

  // link stock locations to fulfillment set
  const linkStockLocationsFulfillmentSetInput: LinkStockLocationFulfillmentSetStepInput =
    transform(
      {
        createStockLocationResult,
        input,
        createFulfillmentSetsResult,
      },
      (data) => ({
        stockLocations: data.createStockLocationResult.result,
        fulfillmentSet: data.createFulfillmentSetsResult.fulfillmentSet,
      })
    )

  linkStockLocationFulfillmentSetStep(linkStockLocationsFulfillmentSetInput)

  // create shipping options

  const createShippingOptionsInput: CreateShippingOptionsStepInput = transform(
    {
      input,
      createFulfillmentSetsResult,
      createDefaultShippingProfileResult,
      createRegionsResult,
    },
    (data) =>
      data.input.shippingOptions.map((option) => ({
        name: option.name,
        providerId:
          option.providerId ??
          data.input.workflowDefaults.fulfillmentProviderId,
        serviceZoneId: data.createFulfillmentSetsResult.serviceZone.id,
        shippingProfileId:
          data.createDefaultShippingProfileResult.shippingProfile.id,
        regions: data.createRegionsResult.result.map((region) => ({
          ...region,
          amount:
            option.prices.find(
              (p) =>
                p.currencyCode?.toLowerCase() ===
                region.currency_code?.toLowerCase()
            )?.amount ?? data.input.workflowDefaults.shippingOptionPriceAmount,
        })),
        type: option.type,
        prices: option.prices,
        rules: option.rules,
        data: option.data,
      }))
  )

  createShippingOptionsStep(createShippingOptionsInput)

  // link sales channels to stock location
  const linkSalesChannelsToStockLocationInput: LinkSalesChannelsStockLocationStepInput =
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

  linkSalesChannelsStockLocationStep(linkSalesChannelsToStockLocationInput)

  // create publishable key

  const createPublishableKeyResult = createPublishableKeyStep(
    input.publishableKey
  )

  // link publishable key to salesChannels
  const linkSalesChannelsApiKeyStepInput: LinkSalesChannelsApiKeyStepInput =
    transform(
      {
        createPublishableKeyResult,
        salesChannelsResult,
      },
      (data) => ({
        salesChannels: data.salesChannelsResult.result,
        publishableApiKey: data.createPublishableKeyResult.publishableApiKey,
      })
    )

  linkSalesChannelsApiKeyStep(linkSalesChannelsApiKeyStepInput)

  // create categories
  seedCategoriesWorkflow.runAsStep({
    input: input.categories,
  })

  // create products
  const createProductsStepInput: CreateProductsStepInput = transform(
    {
      input,
    },
    (data) => toCreateProductsStepInput(data.input.products)
  )

  const createProductsStepResult = createProductsStep(createProductsStepInput)

  // create inventory levels
  const createInventoryLevelsInput: CreateInventoryLevelsStepInput = transform(
    {
      createStockLocationResult,
      createProductsStepInput,
    },
    (data) => ({
      stockLocations: data.createStockLocationResult.result,
      inventoryItems: buildInventoryItemsInput(data.createProductsStepInput),
    })
  )

  createInventoryLevelsStep(createInventoryLevelsInput)

  return new WorkflowResponse({
    publishableKey: createPublishableKeyResult.result,
    products: createProductsStepResult.result,
    result: "N1 seed done",
  })
}

const seedN1Workflow = createWorkflow(seedN1WorkflowId, seedN1WorkflowComposer)

export default seedN1Workflow
