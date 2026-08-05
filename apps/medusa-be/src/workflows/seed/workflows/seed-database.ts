import {
  createWorkflow,
  transform,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk"

import { buildInventoryItemsInput } from "../helpers/build-inventory-items-input"
// Existing seed workflow groups many step helpers through this barrel.
import * as Steps from "../steps"

const SeedDatabaseWorkflowId = "seed-database-workflow"

export interface SeedDatabaseWorkflowInput {
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
  legacyBrandAttributeNames?: string[]
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
    (data) => ({
      currencies: data.input.currencies,
      defaultSalesChannelId: data.salesChannelsResult.defaultSalesChannel.id,
    })
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
        currencyCodes: data.input.currencies.map((currency) => currency.code),
        isTaxInclusive: true,
        regionIds: data.createRegionsResult.result.map((region) => region.id),
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
        fulfillmentProviderIds: [
          ...new Set(
            data.input.shippingOptions.map(
              (opt) =>
                opt.providerId ??
                data.input.workflowDefaults.fulfillmentProviderId
            )
          ),
        ],
        stockLocations: data.createStockLocationResult.result,
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
        createFulfillmentSetsResult,
        createStockLocationResult,
        input,
      },
      (data) => ({
        fulfillmentSet: data.createFulfillmentSetsResult.fulfillmentSet,
        stockLocations: data.createStockLocationResult.result,
      })
    )

  const linkStockLocationsFulfillmentSetResult =
    Steps.linkStockLocationFulfillmentSetStep(
      linkStockLocationsFulfillmentSetInput
    )

  const createShippingOptionsInput: Steps.CreateShippingOptionsStepInput =
    transform(
      {
        createDefaultShippingProfileResult,
        createFulfillmentSetsResult,
        createRegionsResult,
        input,
      },
      (data) =>
        data.input.shippingOptions.map((option) => {
          const shippingOption: Steps.CreateShippingOptionsStepInput[number] = {
            name: option.name,
            prices: option.prices,
            providerId:
              option.providerId ??
              data.input.workflowDefaults.fulfillmentProviderId,
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
        })
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
        salesChannels: data.salesChannelsResult.result,
        stockLocations: data.createStockLocationResult.result,
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
        input,
        salesChannelsResult,
      },
      (data) => ({
        publishableApiKey: data.createPublishableKeyResult.publishableApiKey,
        salesChannels: data.salesChannelsResult.result,
        ...(data.input.publishableKey.salesChannelNames === undefined
          ? {}
          : {
              salesChannelNames: data.input.publishableKey.salesChannelNames,
            }),
      })
    )

  const linkSalesChannelsApiKeyStepInputResult =
    Steps.linkSalesChannelsApiKeyStep(linkSalesChannelsApiKeyStepInput)

  const createProductCategoriesResult = Steps.createProductCategoriesStep(
    input.productCategories
  )

  const productSeedInput: Steps.CreateProductsStepInput = transform(
    {
      createDefaultShippingProfileResult,
      createProductCategoriesResult,
      input,
      salesChannelsResult,
    },
    (data) => data.input.products
  )

  const reconcileProductVariantEansResult =
    Steps.reconcileProductVariantEansStep(productSeedInput)
  const createProductsStepInput: Steps.CreateProductsStepInput = transform(
    { reconcileProductVariantEansResult },
    (data) => data.reconcileProductVariantEansResult.products
  )
  const createProductsResult = Steps.createProductsStep(createProductsStepInput)
  const reconcileProductAttributesInput: Steps.CreateProductsStepInput =
    transform(
      {
        createProductsResult,
        createProductsStepInput,
      },
      (data) => data.createProductsStepInput
    )
  const reconcileProductAttributesResult = Steps.reconcileProductAttributesStep(
    reconcileProductAttributesInput
  )
  const reconcileProductMeasurementsResult =
    Steps.reconcileProductMeasurementsStep(reconcileProductAttributesInput)
  const cleanupProductBrandAttributesInput: Steps.CleanupProductBrandAttributesStepInput =
    transform(
      {
        createProductsResult,
        input,
      },
      (data) => ({
        ...(data.input.legacyBrandAttributeNames === undefined
          ? {}
          : { attributeNames: data.input.legacyBrandAttributeNames }),
        productIds: data.createProductsResult.result,
      })
    )
  const cleanupProductBrandAttributesResult =
    Steps.cleanupProductBrandAttributesStep(cleanupProductBrandAttributesInput)

  const syncPriceListsInput: Steps.SyncPriceListsStepInput = transform(
    {
      createProductsResult,
      input,
    },
    (data) => ({
      productIds: data.createProductsResult.result,
      ...(data.input.priceLists === undefined
        ? {}
        : { priceLists: data.input.priceLists }),
      config: data.input.priceListSync,
    })
  )

  const syncPriceListsResult = Steps.syncPriceListsStep(syncPriceListsInput)

  const createTaxRatesResult = when(
    { input },
    ({ input: workflowInput }) => !!workflowInput.taxRates
  ).then(() => {
    const createTaxRatesStepInput: Steps.CreateTaxRatesStepInput = transform(
      {
        createProductsResult,
        createTaxRegionsResult,
        input,
      },
      (data) => ({
        enabled: true,
        ...(data.input.taxRates?.countries === undefined
          ? {}
          : { countries: data.input.taxRates?.countries }),
        config: data.input.taxRates?.config,
        productIds: data.createProductsResult.result,
      })
    )

    return Steps.createTaxRatesStep(createTaxRatesStepInput)
  })

  const createInventoryLevelsInput: Steps.CreateInventoryLevelsStepInput =
    transform(
      {
        createProductsResult,
        createStockLocationResult,
        input,
      },
      (data) => ({
        inventoryItems: buildInventoryItemsInput(data.input.products),
        stockLocations: data.createStockLocationResult.result,
      })
    )

  const createInventoryLevelsResult = Steps.createInventoryLevelsStep(
    createInventoryLevelsInput
  )

  return new WorkflowResponse({
    cleanupProductBrandAttributesResult,
    createDefaultShippingProfileResult,
    createFulfillmentSetsResult,
    createInventoryLevelsResult,
    createProductCategoriesResult,
    createProductsResult,
    createPublishableKeyResult,
    createRegionsResult,
    createShippingOptionsResult,
    createStockLocationResult,
    createTaxRatesResult,
    createTaxRegionsResult,
    ensurePricePreferencesResult,
    linkSalesChannelsApiKeyStepInputResult,
    linkSalesChannelsToStockLocationResult,
    linkStockLocationsFulfillmentProviderResult,
    linkStockLocationsFulfillmentSetResult,
    reconcileProductAttributesResult,
    reconcileProductMeasurementsResult,
    reconcileProductVariantEansResult,
    salesChannelsResult,
    syncPriceListsResult,
    updateStoreCurrenciesResult,
  })
}

const seedDatabaseWorkflow = createWorkflow(
  SeedDatabaseWorkflowId,
  seedDatabaseWorkflowComposer
)

export default seedDatabaseWorkflow
