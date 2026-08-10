import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { toCreateProductsStepInput } from "../../../utils/products"
import { buildInventoryItemsInput } from "../helpers/build-inventory-items-input"
import { createFulfillmentSetStep } from "../steps/create-fulfillment-set"
import type { CreateFulfillmentSetStepInput } from "../steps/create-fulfillment-set"
import { createInventoryLevelsStep } from "../steps/create-inventory-levels"
import type { CreateInventoryLevelsStepInput } from "../steps/create-inventory-levels"
import { createProductsStep } from "../steps/create-products"
import type { CreateProductsStepInput } from "../steps/create-products"
import { createPublishableKeyStep } from "../steps/create-publishable-key"
import type { CreatePublishableKeyStepInput } from "../steps/create-publishable-key"
import { createRegionsStep } from "../steps/create-regions"
import type { CreateRegionsStepInput } from "../steps/create-regions"
import { createSalesChannelsStep } from "../steps/create-sales-channels"
import type { CreateSalesChannelsStepInput } from "../steps/create-sales-channels"
import { createShippingOptionsStep } from "../steps/create-shipping-options"
import type {
  CreateShippingOptionsStepInput,
  CreateShippingOptionsStepSeedInput,
} from "../steps/create-shipping-options"
import { createDefaultShippingProfileStep } from "../steps/create-shipping-profile"
import type { CreateDefaultShippingProfileStepInput } from "../steps/create-shipping-profile"
import { createStockLocationSeedStep } from "../steps/create-stock-location"
import type { CreateStockLocationStepInput } from "../steps/create-stock-location"
import { createTaxRegionsStep } from "../steps/create-tax-regions"
import type { CreateTaxRegionsStepInput } from "../steps/create-tax-regions"
import { linkSalesChannelsApiKeyStep } from "../steps/link-sales-channels-api-key"
import type { LinkSalesChannelsApiKeyStepInput } from "../steps/link-sales-channels-api-key"
import { linkSalesChannelsStockLocationStep } from "../steps/link-sales-channels-stock-location"
import type { LinkSalesChannelsStockLocationStepInput } from "../steps/link-sales-channels-stock-location"
import { linkStockLocationFulfillmentProviderSeedStep } from "../steps/link-stock-location-fulfillment-provider"
import type { LinkStockLocationFulfillmentProviderStepInput } from "../steps/link-stock-location-fulfillment-provider"
import { linkStockLocationFulfillmentSetStep } from "../steps/link-stock-location-fulfillment-set"
import type { LinkStockLocationFulfillmentSetStepInput } from "../steps/link-stock-location-fulfillment-set"
import { updateStoreCurrenciesStep } from "../steps/update-store-currencies"
import type { UpdateStoreCurrenciesStepCurrenciesInput } from "../steps/update-store-currencies"
import seedCategoriesWorkflow from "./seed-categories"
import type { CategoryRaw } from "./seed-categories"

const seedN1WorkflowId = "seed-n1-workflow"

const getShippingOptionAmount = (
  prices: CreateShippingOptionsStepSeedInput[number]["prices"],
  currencyCode: string | undefined,
  fallbackAmount: number,
) =>
  prices.find(
    (price) =>
      price.currencyCode?.toLowerCase() === currencyCode?.toLowerCase(),
  )?.amount ?? fallbackAmount
/** Raw product record from database - contains JSON strings for nested data */
interface RawProductRecord {
  title: string
  handle: string
  description?: string
  thumbnail?: string
  images: string
  variants: string
  options: string
  categories: string
  brand: string
}

export interface SeedN1WorkflowInput {
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

const seedN1WorkflowComposer = (input: SeedN1WorkflowInput) => {
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
    }),
  )
  updateStoreCurrenciesStep(updateStoreCurrenciesStepInput)

  // create regions
  const createRegionsResult = createRegionsStep(input.regions)

  // create tax regions
  createTaxRegionsStep(input.taxRegions)

  // create stock locations
  const createStockLocationResult = createStockLocationSeedStep(
    input.stockLocations,
  )

  // link stock locations to fulfillment providers (derived from shipping options)
  const linkStockLocationsFulfillmentProviderInput: LinkStockLocationFulfillmentProviderStepInput =
    transform(
      {
        createStockLocationResult,
        input,
      },
      (data) => ({
        fulfillmentProviderIds: [
          ...new Set(
            data.input.shippingOptions.map(
              (opt) =>
                opt.providerId ??
                data.input.workflowDefaults.fulfillmentProviderId,
            ),
          ),
        ],
        stockLocations: data.createStockLocationResult.result,
      }),
    )

  linkStockLocationFulfillmentProviderSeedStep(
    linkStockLocationsFulfillmentProviderInput,
  )

  // create a shipping profile
  const createDefaultShippingProfileResult = createDefaultShippingProfileStep(
    input.defaultShippingProfile,
  )

  // create fulfillment sets
  const createFulfillmentSetsResult = createFulfillmentSetStep(
    input.fulfillmentSets,
  )

  // link stock locations to fulfillment set
  const linkStockLocationsFulfillmentSetInput: LinkStockLocationFulfillmentSetStepInput =
    transform(
      {
        createFulfillmentSetsResult,
        createStockLocationResult,
        input,
      },
      (data) => ({
        fulfillmentSet: data.createFulfillmentSetsResult.fulfillmentSet,
        stockLocations: data.createStockLocationResult.result,
      }),
    )

  linkStockLocationFulfillmentSetStep(linkStockLocationsFulfillmentSetInput)

  // create shipping options

  const createShippingOptionsInput: CreateShippingOptionsStepInput = transform(
    {
      createDefaultShippingProfileResult,
      createFulfillmentSetsResult,
      createRegionsResult,
      input,
    },
    (data) =>
      data.input.shippingOptions.map((option) => {
        const shippingOption: CreateShippingOptionsStepInput[number] = {
          name: option.name,
          prices: option.prices,
          providerId:
            option.providerId ??
            data.input.workflowDefaults.fulfillmentProviderId,
          regions: data.createRegionsResult.result.map((region) => ({
            ...region,
            amount: getShippingOptionAmount(
              option.prices,
              region.currency_code,
              data.input.workflowDefaults.shippingOptionPriceAmount,
            ),
          })),
          rules: option.rules,
          serviceZoneId: data.createFulfillmentSetsResult.serviceZone.id,
          shippingProfileId:
            data.createDefaultShippingProfileResult.shippingProfile.id,
          type: option.type,
        }
        if (option.data !== undefined) {
          shippingOption.data = option.data
        }
        return shippingOption
      }),
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
        salesChannels: data.salesChannelsResult.result,
        stockLocations: data.createStockLocationResult.result,
      }),
    )

  linkSalesChannelsStockLocationStep(linkSalesChannelsToStockLocationInput)

  // create publishable key

  const createPublishableKeyResult = createPublishableKeyStep(
    input.publishableKey,
  )

  // link publishable key to salesChannels
  const linkSalesChannelsApiKeyStepInput: LinkSalesChannelsApiKeyStepInput =
    transform(
      {
        createPublishableKeyResult,
        salesChannelsResult,
      },
      (data) => ({
        publishableApiKey: data.createPublishableKeyResult.publishableApiKey,
        salesChannels: data.salesChannelsResult.result,
      }),
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
    (data) => toCreateProductsStepInput(data.input.products),
  )

  const createProductsStepResult = createProductsStep(createProductsStepInput)

  // create inventory levels
  const createInventoryLevelsInput: CreateInventoryLevelsStepInput = transform(
    {
      createProductsStepInput,
      createStockLocationResult,
    },
    (data) => ({
      inventoryItems: buildInventoryItemsInput(data.createProductsStepInput),
      stockLocations: data.createStockLocationResult.result,
    }),
  )

  createInventoryLevelsStep(createInventoryLevelsInput)

  return new WorkflowResponse({
    products: createProductsStepResult.result,
    publishableKey: createPublishableKeyResult.result,
    result: "N1 seed done",
  })
}

const seedN1Workflow = createWorkflow(seedN1WorkflowId, seedN1WorkflowComposer)

export default seedN1Workflow
