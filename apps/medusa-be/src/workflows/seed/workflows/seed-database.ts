import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import * as Steps from "../steps"

const SeedDatabaseWorkflowId = "seed-database-workflow"

export type SeedDatabaseWorkflowInput = {
  salesChannels: Steps.CreateSalesChannelsStepInput
  currencies: Steps.UpdateStoreCurrenciesStepCurrenciesInput
  regions: Steps.CreateRegionsStepInput
  taxRegions: Steps.CreateTaxRegionsStepInput
  taxRates?: Omit<Steps.CreateTaxRatesStepInput, "productIds">
  stockLocations: Steps.CreateStockLocationStepInput
  defaultShippingProfile: Steps.CreateDefaultShippingProfileStepInput
  fulfillmentSets: Steps.CreateFulfillmentSetStepInput
  shippingOptions: Steps.CreateShippingOptionsStepSeedInput
  publishableKey: Steps.CreatePublishableKeyStepInput
  productCategories: Steps.CreateProductCategoriesStepInput
  products: Steps.CreateProductsStepInput
}

const seedDatabaseWorkflow = createWorkflow(
  SeedDatabaseWorkflowId,
  (input: SeedDatabaseWorkflowInput) => {
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
    const updateStoreCurrenciesResult = Steps.updateStoreCurrenciesStep(
      updateStoreCurrenciesStepInput
    )

    // create regions
    const createRegionsResult = Steps.createRegionsStep(input.regions)

    // create tax regions
    const createTaxRegionsResult = Steps.createTaxRegionsStep(input.taxRegions)

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

    const linkStockLocationsFulfillmentProviderResult =
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
            throw new Error("No fulfillment set found")
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
          const fulfillmentSet = data.createFulfillmentSetsResult.result[0]
          const shippingProfile =
            data.createDefaultShippingProfileResult.result[0]
          const serviceZone = fulfillmentSet?.service_zones?.[0]

          if (!serviceZone?.id) {
            throw new Error("No service zone found in fulfillment set")
          }

          if (!shippingProfile?.id) {
            throw new Error("No shipping profile found")
          }

          return data.input.shippingOptions.map((option) => ({
            name: option.name,
            providerId: option.providerId || "manual_manual",
            serviceZoneId: serviceZone.id,
            shippingProfileId: shippingProfile.id,
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

    const createShippingOptionsResult = Steps.createShippingOptionsStep(
      createShippingOptionsInput
    )

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

    const linkSalesChannelsToStockLocationResult =
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
        (data) => {
          const publishableApiKey = data.createPublishableKeyResult.result[0]

          if (!publishableApiKey) {
            throw new Error("No publishable API key found")
          }

          return {
            salesChannels: data.salesChannelsResult.result,
            publishableApiKey,
          }
        }
      )

    const linkSalesChannelsApiKeyStepInputResult =
      Steps.linkSalesChannelsApiKeyStep(linkSalesChannelsApiKeyStepInput)

    // create product categories

    const createProductCategoriesResult = Steps.createProductCategoriesStep(
      input.productCategories
    )

    // create products

    const createProductsResult = Steps.createProductsStep(input.products)

    const createTaxRatesStepInput: Steps.CreateTaxRatesStepInput | undefined =
      input.taxRates
        ? transform(
            {
              createProductsResult,
              input,
            },
            (data) => ({
              fallbackCountryCode: data.input.taxRates?.fallbackCountryCode,
              countries: data.input.taxRates?.countries,
              productIds: data.createProductsResult.result,
            })
          )
        : undefined

    const createTaxRatesResult = createTaxRatesStepInput
      ? Steps.createTaxRatesStep(createTaxRatesStepInput)
      : undefined

    // create inventory levels
    const createInventoryLevelsInput: Steps.CreateInventoryLevelsStepInput =
      transform(
        {
          createStockLocationResult,
          input,
        },
        (data) => {
          const inventoryItems: Steps.CreateInventoryLevelsStepInput["inventoryItems"] =
            []
          for (const p of data.input.products) {
            for (const v of p.variants ?? []) {
              if (v.quantities?.quantity !== undefined) {
                inventoryItems.push({
                  sku: v.sku,
                  quantity: v.quantities.quantity,
                })
              }
            }
          }

          return {
            stockLocations: data.createStockLocationResult.result,
            inventoryItems,
          }
        }
      )

    const createInventoryLevelsResult = Steps.createInventoryLevelsStep(
      createInventoryLevelsInput
    )

    return new WorkflowResponse({
      salesChannelsResult,
      updateStoreCurrenciesResult,
      createRegionsResult,
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
      createTaxRatesResult,
      createInventoryLevelsResult,
    })
  }
)

export default seedDatabaseWorkflow
