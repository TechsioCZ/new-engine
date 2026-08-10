import {
  createWorkflow,
  transform,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk"

import { buildInventoryItemsInput } from "../helpers/build-inventory-items-input"
import { cleanupProductBrandAttributesStep } from "../steps/cleanup-product-brand-attributes"
import type { CleanupProductBrandAttributesStepInput } from "../steps/cleanup-product-brand-attributes"
import { createFulfillmentSetStep } from "../steps/create-fulfillment-set"
import type { CreateFulfillmentSetStepInput } from "../steps/create-fulfillment-set"
import { createInventoryLevelsStep } from "../steps/create-inventory-levels"
import type { CreateInventoryLevelsStepInput } from "../steps/create-inventory-levels"
import { createProductCategoriesStep } from "../steps/create-product-categories"
import type { CreateProductCategoriesStepInput } from "../steps/create-product-categories"
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
import { createTaxRatesStep } from "../steps/create-tax-rates"
import type { CreateTaxRatesStepInput } from "../steps/create-tax-rates"
import { createTaxRegionsStep } from "../steps/create-tax-regions"
import type { CreateTaxRegionsStepInput } from "../steps/create-tax-regions"
import { ensurePricePreferencesStep } from "../steps/ensure-price-preferences"
import type { EnsurePricePreferencesStepInput } from "../steps/ensure-price-preferences"
import { linkSalesChannelsApiKeyStep } from "../steps/link-sales-channels-api-key"
import type { LinkSalesChannelsApiKeyStepInput } from "../steps/link-sales-channels-api-key"
import { linkSalesChannelsStockLocationStep } from "../steps/link-sales-channels-stock-location"
import type { LinkSalesChannelsStockLocationStepInput } from "../steps/link-sales-channels-stock-location"
import { linkStockLocationFulfillmentProviderSeedStep } from "../steps/link-stock-location-fulfillment-provider"
import type { LinkStockLocationFulfillmentProviderStepInput } from "../steps/link-stock-location-fulfillment-provider"
import { linkStockLocationFulfillmentSetStep } from "../steps/link-stock-location-fulfillment-set"
import type { LinkStockLocationFulfillmentSetStepInput } from "../steps/link-stock-location-fulfillment-set"
import { reconcileProductAttributesStep } from "../steps/reconcile-product-attributes"
import { reconcileProductMeasurementsStep } from "../steps/reconcile-product-measurements"
import { reconcileProductVariantEansStep } from "../steps/reconcile-product-variant-eans"
import { syncPriceListsStep } from "../steps/sync-price-lists"
import type { SyncPriceListsStepInput } from "../steps/sync-price-lists"
import { updateStoreCurrenciesStep } from "../steps/update-store-currencies"
import type { UpdateStoreCurrenciesStepCurrenciesInput } from "../steps/update-store-currencies"

const SeedDatabaseWorkflowId = "seed-database-workflow"

const getRegionShippingAmount = (
  prices: CreateShippingOptionsStepSeedInput[number]["prices"],
  currencyCode: string | undefined,
  fallbackAmount: number,
) =>
  prices.find(
    (price) =>
      price.currencyCode?.toLowerCase() === currencyCode?.toLowerCase(),
  )?.amount ?? fallbackAmount

export interface SeedDatabaseWorkflowInput {
  workflowDefaults: {
    fulfillmentProviderId: string
    shippingOptionPriceAmount: number
  }
  salesChannels: CreateSalesChannelsStepInput
  currencies: UpdateStoreCurrenciesStepCurrenciesInput
  regions: CreateRegionsStepInput
  taxRegions: CreateTaxRegionsStepInput
  taxRates?: Omit<CreateTaxRatesStepInput, "productIds" | "enabled">
  stockLocations: CreateStockLocationStepInput
  defaultShippingProfile: CreateDefaultShippingProfileStepInput
  fulfillmentSets: CreateFulfillmentSetStepInput
  shippingOptions: CreateShippingOptionsStepSeedInput
  publishableKey: CreatePublishableKeyStepInput
  productCategories: CreateProductCategoriesStepInput
  products: CreateProductsStepInput
  legacyBrandAttributeNames?: string[]
  priceLists?: SyncPriceListsStepInput["priceLists"]
  priceListSync?: SyncPriceListsStepInput["config"]
}

const seedDatabaseWorkflowComposer = (input: SeedDatabaseWorkflowInput) => {
  const salesChannelsResult = createSalesChannelsStep(input.salesChannels)

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
  const updateStoreCurrenciesResult = updateStoreCurrenciesStep(
    updateStoreCurrenciesStepInput,
  )

  const createRegionsResult = createRegionsStep(input.regions)

  const ensurePricePreferencesStepInput: EnsurePricePreferencesStepInput =
    transform(
      {
        createRegionsResult,
        input,
      },
      (data) => ({
        currencyCodes: data.input.currencies.map((currency) => currency.code),
        isTaxInclusive: true,
        regionIds: data.createRegionsResult.result.map((region) => region.id),
      }),
    )

  const ensurePricePreferencesResult = ensurePricePreferencesStep(
    ensurePricePreferencesStepInput,
  )

  const createTaxRegionsResult = createTaxRegionsStep(input.taxRegions)

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

  const linkStockLocationsFulfillmentProviderResult =
    linkStockLocationFulfillmentProviderSeedStep(
      linkStockLocationsFulfillmentProviderInput,
    )

  const createDefaultShippingProfileResult = createDefaultShippingProfileStep(
    input.defaultShippingProfile,
  )

  const createFulfillmentSetsResult = createFulfillmentSetStep(
    input.fulfillmentSets,
  )

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

  const linkStockLocationsFulfillmentSetResult =
    linkStockLocationFulfillmentSetStep(linkStockLocationsFulfillmentSetInput)

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
            amount: getRegionShippingAmount(
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

  const createShippingOptionsResult = createShippingOptionsStep(
    createShippingOptionsInput,
  )

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

  const linkSalesChannelsToStockLocationResult =
    linkSalesChannelsStockLocationStep(linkSalesChannelsToStockLocationInput)

  const createPublishableKeyResult = createPublishableKeyStep(
    input.publishableKey,
  )

  const linkSalesChannelsApiKeyStepInput: LinkSalesChannelsApiKeyStepInput =
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
      }),
    )

  const linkSalesChannelsApiKeyStepInputResult = linkSalesChannelsApiKeyStep(
    linkSalesChannelsApiKeyStepInput,
  )

  const createProductCategoriesResult = createProductCategoriesStep(
    input.productCategories,
  )

  const productSeedInput: CreateProductsStepInput = transform(
    {
      createDefaultShippingProfileResult,
      createProductCategoriesResult,
      input,
      salesChannelsResult,
    },
    (data) => data.input.products,
  )

  const reconcileProductVariantEansResult =
    reconcileProductVariantEansStep(productSeedInput)
  const createProductsStepInput: CreateProductsStepInput = transform(
    { reconcileProductVariantEansResult },
    (data) => data.reconcileProductVariantEansResult.products,
  )
  const createProductsResult = createProductsStep(createProductsStepInput)
  const reconcileProductAttributesInput: CreateProductsStepInput = transform(
    {
      createProductsResult,
      createProductsStepInput,
    },
    (data) => data.createProductsStepInput,
  )
  const reconcileProductAttributesResult = reconcileProductAttributesStep(
    reconcileProductAttributesInput,
  )
  const reconcileProductMeasurementsResult = reconcileProductMeasurementsStep(
    reconcileProductAttributesInput,
  )
  const cleanupProductBrandAttributesInput: CleanupProductBrandAttributesStepInput =
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
      }),
    )
  const cleanupProductBrandAttributesResult = cleanupProductBrandAttributesStep(
    cleanupProductBrandAttributesInput,
  )

  const syncPriceListsInput: SyncPriceListsStepInput = transform(
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
    }),
  )

  const syncPriceListsResult = syncPriceListsStep(syncPriceListsInput)

  const { then: createTaxRatesWhenConfigured } = when(
    { input },
    ({ input: workflowInput }) => workflowInput.taxRates !== undefined,
  )
  const createTaxRatesResult = createTaxRatesWhenConfigured(() => {
    const createTaxRatesStepInput: CreateTaxRatesStepInput = transform(
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
      }),
    )

    return createTaxRatesStep(createTaxRatesStepInput)
  })

  const createInventoryLevelsInput: CreateInventoryLevelsStepInput = transform(
    {
      createProductsResult,
      createStockLocationResult,
      input,
    },
    (data) => ({
      inventoryItems: buildInventoryItemsInput(data.input.products),
      stockLocations: data.createStockLocationResult.result,
    }),
  )

  const createInventoryLevelsResult = createInventoryLevelsStep(
    createInventoryLevelsInput,
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
  seedDatabaseWorkflowComposer,
)

export default seedDatabaseWorkflow
