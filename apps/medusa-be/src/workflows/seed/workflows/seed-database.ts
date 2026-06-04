import { MedusaError } from "@medusajs/framework/utils"
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { buildInventoryItemsInput } from "../helpers/build-inventory-items-input"
import * as Steps from "../steps"

const SeedDatabaseWorkflowId = "seed-database-workflow"

export type SeedDatabaseWorkflowInput = {
  workflowDefaults: {
    fulfillmentProviderId: string
    shippingOptionPriceAmount: number
  }
  salesChannels: Steps.CreateSalesChannelsStepInput
  currencies: Steps.UpdateStoreCurrenciesStepCurrenciesInput
  regions: Steps.CreateRegionsStepInput
  taxRegions: Steps.CreateTaxRegionsStepInput
  taxRates?: Omit<Steps.CreateTaxRatesStepInput, "productIds" | "enabled">
  stockLocations: Steps.CreateStockLocationStepInput
  defaultShippingProfile: Steps.CreateDefaultShippingProfileStepInput
  fulfillmentSets: Steps.CreateFulfillmentSetStepInput
  shippingOptions: Steps.CreateShippingOptionsStepSeedInput
  publishableKey: Steps.CreatePublishableKeyStepInput
  productCategories: Steps.CreateProductCategoriesStepInput
  products: Steps.CreateProductsStepInput
  priceLists?: Steps.SyncPriceListsStepInput["priceLists"]
  priceListSync?: Steps.SyncPriceListsStepInput["config"]
}

function seedDatabaseWorkflowComposer(input: SeedDatabaseWorkflowInput) {
  const salesChannelsResult = Steps.createSalesChannelsStep(input.salesChannels)

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
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          "No default sales channel found"
        )
      }
      return {
        currencies: data.input.currencies,
        defaultSalesChannelId: defaultSalesChannel.id,
      }
    }
  )
  const updateStoreCurrenciesResult = Steps.updateStoreCurrenciesStep(
    updateStoreCurrenciesStepInput
  )

  const createRegionsResult = Steps.createRegionsStep(input.regions)

  const ensurePricePreferencesStepInput: Steps.EnsurePricePreferencesStepInput =
    transform(
      {
        createRegionsResult,
        input,
      },
      (data) => ({
        regionIds: data.createRegionsResult.result.map((region) => region.id),
        currencyCodes: data.input.currencies.map((currency) => currency.code),
        isTaxInclusive: true,
      })
    )

  const ensurePricePreferencesResult = Steps.ensurePricePreferencesStep(
    ensurePricePreferencesStepInput
  )

  const createTaxRegionsResult = Steps.createTaxRegionsStep(input.taxRegions)

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
              (opt) =>
                opt.providerId ??
                data.input.workflowDefaults.fulfillmentProviderId
            )
          ),
        ],
      })
    )

  const linkStockLocationsFulfillmentProviderResult =
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
        input,
        createFulfillmentSetsResult,
      },
      (data) => {
        const fulfillmentSet = data.createFulfillmentSetsResult.result[0]

        if (!fulfillmentSet) {
          throw new MedusaError(
            MedusaError.Types.NOT_FOUND,
            "No fulfillment set found"
          )
        }

        return {
          stockLocations: data.createStockLocationResult.result,
          fulfillmentSet,
        }
      }
    )

  const linkStockLocationsFulfillmentSetResult =
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
        const fulfillmentSet = data.createFulfillmentSetsResult.result[0]
        const shippingProfile =
          data.createDefaultShippingProfileResult.result[0]
        const serviceZone = fulfillmentSet?.service_zones?.[0]

        if (!serviceZone?.id) {
          throw new MedusaError(
            MedusaError.Types.NOT_FOUND,
            "No service zone found in fulfillment set"
          )
        }

        if (!shippingProfile?.id) {
          throw new MedusaError(
            MedusaError.Types.NOT_FOUND,
            "No shipping profile found"
          )
        }

        return data.input.shippingOptions.map((option) => ({
          name: option.name,
          providerId:
            option.providerId ??
            data.input.workflowDefaults.fulfillmentProviderId,
          serviceZoneId: serviceZone.id,
          shippingProfileId: shippingProfile.id,
          regions: data.createRegionsResult.result.map((region) => ({
            ...region,
            amount:
              option.prices.find(
                (p) =>
                  p.currencyCode?.toLowerCase() ===
                  region.currency_code?.toLowerCase()
              )?.amount ??
              data.input.workflowDefaults.shippingOptionPriceAmount,
          })),
          type: option.type,
          prices: option.prices,
          rules: option.rules,
          data: option.data,
        }))
      }
    )

  const createShippingOptionsResult = Steps.createShippingOptionsStep(
    createShippingOptionsInput
  )

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

  const linkSalesChannelsToStockLocationResult =
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
      (data) => {
        const publishableApiKey = data.createPublishableKeyResult.result[0]

        if (!publishableApiKey) {
          throw new MedusaError(
            MedusaError.Types.NOT_FOUND,
            "No publishable API key found"
          )
        }

        return {
          salesChannels: data.salesChannelsResult.result,
          publishableApiKey,
        }
      }
    )

  const linkSalesChannelsApiKeyStepInputResult =
    Steps.linkSalesChannelsApiKeyStep(linkSalesChannelsApiKeyStepInput)

  const createProductCategoriesResult = Steps.createProductCategoriesStep(
    input.productCategories
  )

  const createProductsStepInput: Steps.CreateProductsStepInput = transform(
    {
      input,
      createProductCategoriesResult,
      salesChannelsResult,
      createDefaultShippingProfileResult,
    },
    (data) => data.input.products
  )

  const createProductsResult = Steps.createProductsStep(createProductsStepInput)

  const syncPriceListsInput: Steps.SyncPriceListsStepInput = transform(
    {
      createProductsResult,
      input,
    },
    (data) => ({
      productIds: data.createProductsResult.result,
      priceLists: data.input.priceLists,
      config: data.input.priceListSync,
    })
  )

  const syncPriceListsResult = Steps.syncPriceListsStep(syncPriceListsInput)

  const createTaxRatesStepInput: Steps.CreateTaxRatesStepInput = transform(
    {
      createProductsResult,
      createTaxRegionsResult,
      input,
    },
    (data) => ({
      enabled: Boolean(data.input.taxRates),
      countries: data.input.taxRates?.countries,
      config: data.input.taxRates?.config,
      productIds: data.input.taxRates ? data.createProductsResult.result : [],
    })
  )

  const createTaxRatesResult = Steps.createTaxRatesStep(createTaxRatesStepInput)

  const createInventoryLevelsInput: Steps.CreateInventoryLevelsStepInput =
    transform(
      {
        createStockLocationResult,
        createProductsResult,
        input,
      },
      (data) => ({
        stockLocations: data.createStockLocationResult.result,
        inventoryItems: buildInventoryItemsInput(data.input.products),
      })
    )

  const createInventoryLevelsResult = Steps.createInventoryLevelsStep(
    createInventoryLevelsInput
  )

  return new WorkflowResponse({
    salesChannelsResult,
    updateStoreCurrenciesResult,
    createRegionsResult,
    ensurePricePreferencesResult,
    createTaxRegionsResult,
    createStockLocationResult,
    linkStockLocationsFulfillmentProviderResult,
    createDefaultShippingProfileResult,
    createFulfillmentSetsResult,
    linkStockLocationsFulfillmentSetResult,
    createShippingOptionsResult,
    linkSalesChannelsToStockLocationResult,
    createPublishableKeyResult,
    linkSalesChannelsApiKeyStepInputResult,
    createProductCategoriesResult,
    createProductsResult,
    syncPriceListsResult,
    createTaxRatesResult,
    createInventoryLevelsResult,
  })
}

const seedDatabaseWorkflow = createWorkflow(
  SeedDatabaseWorkflowId,
  seedDatabaseWorkflowComposer
)

export default seedDatabaseWorkflow
