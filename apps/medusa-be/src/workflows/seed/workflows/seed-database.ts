import {
  createWorkflow,
  transform,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk"
import { buildInventoryItemsInput } from "../helpers/build-inventory-items-input"
// biome-ignore lint/performance/noNamespaceImport: Existing seed workflow groups many step helpers through this barrel.
import * as Steps from "../steps"

const SeedDatabaseWorkflowId = "seed-database-workflow"

export type SeedDatabaseWorkflowInput = {
  workflowDefaults: {
    fulfillmentProviderId: string
    shippingOptionPriceAmount: number
    unconfiguredCurrencyPricePolicy?: "fallback" | "omit"
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

const resolveStorefrontRegionMapping = (
  regionInput: Steps.CreateRegionsStepInput[number]
) => {
  const hasMapping = Boolean(
    regionInput.storefrontNamespace ||
      regionInput.marketCode ||
      regionInput.salesChannelName
  )

  if (!hasMapping) {
    return null
  }

  const { marketCode, salesChannelName, storefrontNamespace } = regionInput

  if (!(storefrontNamespace && marketCode && salesChannelName)) {
    throw new Error(
      `Region "${regionInput.name}" must define storefrontNamespace, marketCode, and salesChannelName together`
    )
  }

  return { marketCode, salesChannelName, storefrontNamespace }
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

  const linkRegionsSalesChannelsInput: Steps.LinkRegionsSalesChannelsStepInput =
    transform({ createRegionsResult, input, salesChannelsResult }, (data) => ({
      regions: data.input.regions.flatMap((regionInput) => {
        const mapping = resolveStorefrontRegionMapping(regionInput)
        if (!mapping) {
          return []
        }

        const region = data.createRegionsResult.result.find(
          (candidateRegion) => candidateRegion.name === regionInput.name
        )
        const salesChannel = data.salesChannelsResult.result.find(
          (candidateSalesChannel) =>
            candidateSalesChannel.name === mapping.salesChannelName
        )

        if (!(region && salesChannel)) {
          throw new Error(
            `Could not link region "${regionInput.name}" to sales channel "${mapping.salesChannelName}"`
          )
        }

        return [
          {
            id: region.id,
            marketCode: mapping.marketCode,
            metadata: region.metadata,
            salesChannelId: salesChannel.id,
            storefrontNamespace: mapping.storefrontNamespace,
          },
        ]
      }),
    }))

  const linkRegionsSalesChannelsResult = Steps.linkRegionsSalesChannelsStep(
    linkRegionsSalesChannelsInput
  )

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
      (data) => ({
        stockLocations: data.createStockLocationResult.result,
        fulfillmentSet: data.createFulfillmentSetsResult.fulfillmentSet,
      })
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
      (data) =>
        data.input.shippingOptions.map((option) => ({
          name: option.name,
          providerId:
            option.providerId ??
            data.input.workflowDefaults.fulfillmentProviderId,
          serviceZoneId: data.createFulfillmentSetsResult.serviceZone.id,
          shippingProfileId:
            data.createDefaultShippingProfileResult.shippingProfile.id,
          regions: data.createRegionsResult.result.flatMap((region) => {
            const configuredPrice = option.prices.find(
              (price) =>
                price.currencyCode?.toLowerCase() ===
                region.currency_code?.toLowerCase()
            )?.amount

            if (
              configuredPrice === undefined &&
              data.input.workflowDefaults.unconfiguredCurrencyPricePolicy ===
                "omit"
            ) {
              return []
            }

            return [
              {
                ...region,
                amount:
                  configuredPrice ??
                  data.input.workflowDefaults.shippingOptionPriceAmount,
              },
            ]
          }),
          type: option.type,
          prices: option.prices,
          rules: option.rules,
          data: option.data,
        }))
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
        input,
        salesChannelsResult,
      },
      (data) => ({
        salesChannels: data.salesChannelsResult.result,
        publishableApiKey: data.createPublishableKeyResult.publishableApiKey,
        salesChannelNames: data.input.publishableKey.salesChannelNames,
      })
    )

  const linkSalesChannelsApiKeyStepInputResult =
    Steps.linkSalesChannelsApiKeyStep(linkSalesChannelsApiKeyStepInput)

  const createProductCategoriesResult = Steps.createProductCategoriesStep(
    input.productCategories
  )

  const productSeedInput: Steps.CreateProductsStepInput = transform(
    {
      input,
      createProductCategoriesResult,
      salesChannelsResult,
      createDefaultShippingProfileResult,
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
        attributeNames: data.input.legacyBrandAttributeNames,
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
      priceLists: data.input.priceLists,
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
        countries: data.input.taxRates?.countries,
        config: data.input.taxRates?.config,
        productIds: data.createProductsResult.result,
      })
    )

    return Steps.createTaxRatesStep(createTaxRatesStepInput)
  })

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
    linkRegionsSalesChannelsResult,
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
    reconcileProductVariantEansResult,
    createProductsResult,
    reconcileProductAttributesResult,
    reconcileProductMeasurementsResult,
    cleanupProductBrandAttributesResult,
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
