import {
  createStep,
  createWorkflow,
  StepResponse,
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
  legacySharedPublishableKey?: Steps.CreatePublishableKeyStepInput
  publishableKeys?: Steps.CreatePublishableKeysStepInput
  productCategories: Steps.CreateProductCategoriesStepInput
  products: Steps.CreateProductsStepInput
  legacyBrandAttributeNames?: string[]
  priceLists?: Steps.SyncPriceListsStepInput["priceLists"]
  priceListSync?: Steps.SyncPriceListsStepInput["config"]
}

type SeedPublishableKeysInput = Pick<
  SeedDatabaseWorkflowInput,
  "legacySharedPublishableKey" | "publishableKeys" | "salesChannels"
>

export function resolveSeedPublishableKeysInput({
  legacySharedPublishableKey,
  publishableKeys,
  salesChannels,
}: SeedPublishableKeysInput): Steps.CreatePublishableKeysStepInput {
  if (legacySharedPublishableKey && publishableKeys) {
    throw new Error(
      "Seed input must define legacySharedPublishableKey or publishableKeys, not both"
    )
  }
  return (
    publishableKeys ??
    (legacySharedPublishableKey
      ? [
          {
            ...legacySharedPublishableKey,
            associationMode: "legacy-shared" as const,
            salesChannelNames: salesChannels.map(({ name }) => name),
          },
        ]
      : [])
  )
}

const resolveSeedPublishableKeysStep = createStep(
  "resolve-seed-publishable-keys",
  async (input: SeedPublishableKeysInput) =>
    new StepResponse(resolveSeedPublishableKeysInput(input))
)

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

  const resolveRegionSalesChannelBindingsInput: Steps.ResolveRegionSalesChannelBindingsStepInput =
    transform(
      {
        input,
        salesChannelsResult,
      },
      (data) => ({
        regions: data.input.regions,
        salesChannels: data.salesChannelsResult.result,
      })
    )
  const resolvedRegions = Steps.resolveRegionSalesChannelBindingsStep(
    resolveRegionSalesChannelBindingsInput
  )
  const createRegionsResult = Steps.createRegionsStep(resolvedRegions)

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
          seedIdentity: option.seedIdentity,
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
              )?.amount ??
              data.input.workflowDefaults.shippingOptionPriceAmount,
          })),
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

  const publishableKeysInput = resolveSeedPublishableKeysStep(input)
  const createPublishableKeysResult =
    Steps.createPublishableKeysStep(publishableKeysInput)
  const linkSalesChannelsApiKeysStepInput: Steps.LinkSalesChannelsApiKeysStepInput =
    transform(
      {
        createPublishableKeysResult,
        salesChannelsResult,
      },
      (data) => ({
        salesChannels: data.salesChannelsResult.result,
        publishableKeys: data.createPublishableKeysResult.result,
      })
    )
  const linkSalesChannelsApiKeysResult = Steps.linkSalesChannelsApiKeysStep(
    linkSalesChannelsApiKeysStepInput
  )

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
    ensurePricePreferencesResult,
    createTaxRegionsResult,
    createStockLocationResult,
    linkStockLocationsFulfillmentProviderResult,
    createDefaultShippingProfileResult,
    createFulfillmentSetsResult,
    linkStockLocationsFulfillmentSetResult,
    createShippingOptionsResult,
    linkSalesChannelsToStockLocationResult,
    createPublishableKeysResult,
    linkSalesChannelsApiKeysResult,
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
