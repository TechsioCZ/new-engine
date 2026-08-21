import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { CommerceLiveState } from "./collector-types"
import { canonicalPriceAmount } from "./price-amount"

type QueryService = Readonly<{
  graph: <Value>(
    input: Readonly<{
      entity: string
      fields: readonly string[]
      filters?: Readonly<Record<string, unknown>>
      pagination: Readonly<{ skip: number; take: number }>
    }>
  ) => Promise<Readonly<{ data?: Value[] }>>
}>

const PAGE_SIZE = 500

const readAll = async <Value>(
  query: QueryService,
  entity: string,
  fields: readonly string[],
  filters?: Readonly<Record<string, unknown>>
) => {
  const rows: Value[] = []
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const { data = [] } = await query.graph<Value>({
      entity,
      fields,
      filters,
      pagination: { skip, take: PAGE_SIZE },
    })
    rows.push(...data)
    if (data.length < PAGE_SIZE) {
      return rows
    }
  }
}

const stringValue = (value: unknown, label: string) => {
  if (typeof value !== "string" || value.trim() !== value || value === "") {
    throw new Error(`${label} is invalid`)
  }
  return value
}

const nullableString = (value: unknown, label: string) =>
  value === null || value === undefined ? null : stringValue(value, label)

const integerValue = (value: unknown, label: string, minimum = 0) => {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new Error(`${label} is invalid`)
  }
  return value as number
}

const numberValue = (value: unknown, label: string) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} is invalid`)
  }
  return value
}

const sortedUnique = (values: readonly string[]) =>
  [...new Set(values)].sort((left, right) => left.localeCompare(right))

type ProductRow = Readonly<{
  id?: unknown
  sales_channels?: readonly Readonly<{ id?: unknown }>[]
  variants?: readonly Readonly<{
    ean?: unknown
    id?: unknown
    prices?: readonly Readonly<{
      amount?: unknown
      currency_code?: unknown
    }>[]
    sku?: unknown
  }>[]
}>

type InventoryLinkRow = Readonly<{
  inventory_item_id?: unknown
  required_quantity?: unknown
  variant_id?: unknown
}>

type InventoryLevelRow = Readonly<{
  incoming_quantity?: unknown
  inventory_item_id?: unknown
  location_id?: unknown
  reserved_quantity?: unknown
  stocked_quantity?: unknown
}>

type ShippingOptionRow = Readonly<{
  id?: unknown
  service_zone?: Readonly<{
    geo_zones?: readonly Readonly<{ country_code?: unknown }>[]
  }>
}>

type ShippingPriceSetRow = Readonly<{
  price_set?: Readonly<{
    prices?: readonly Readonly<{ currency_code?: unknown }>[]
  }>
  shipping_option_id?: unknown
}>

export const collectMedusaCommerceLiveState = async (
  container: ExecArgs["container"]
): Promise<CommerceLiveState> => {
  const query = container.resolve<QueryService>(ContainerRegistrationKeys.QUERY)
  const [
    products,
    inventoryLinks,
    inventoryLevels,
    regions,
    paymentProviders,
    regionPaymentProviderLinks,
    shippingOptions,
    shippingPriceSets,
    taxRegions,
    taxRates,
  ] = await Promise.all([
    readAll<ProductRow>(
      query,
      "product",
      [
        "id",
        "sales_channels.id",
        "variants.id",
        "variants.sku",
        "variants.ean",
        "variants.prices.amount",
        "variants.prices.currency_code",
      ],
      { status: "published" }
    ),
    readAll<InventoryLinkRow>(query, "product_variant_inventory_item", [
      "variant_id",
      "inventory_item_id",
      "required_quantity",
    ]),
    readAll<InventoryLevelRow>(query, "inventory_level", [
      "inventory_item_id",
      "location_id",
      "incoming_quantity",
      "reserved_quantity",
      "stocked_quantity",
    ]),
    readAll<{
      countries?: readonly Readonly<{ iso_2?: unknown }>[]
      currency_code?: unknown
      id?: unknown
    }>(query, "region", ["id", "currency_code", "countries.iso_2"]),
    readAll<{ id?: unknown; is_enabled?: unknown }>(query, "payment_provider", [
      "id",
      "is_enabled",
    ]),
    readAll<{ payment_provider_id?: unknown; region_id?: unknown }>(
      query,
      "region_payment_provider",
      ["region_id", "payment_provider_id"]
    ),
    readAll<ShippingOptionRow>(query, "shipping_option", [
      "id",
      "service_zone.geo_zones.country_code",
    ]),
    readAll<ShippingPriceSetRow>(query, "shipping_option_price_set", [
      "shipping_option_id",
      "price_set.prices.currency_code",
    ]),
    readAll<{ country_code?: unknown; id?: unknown }>(query, "tax_region", [
      "id",
      "country_code",
    ]),
    readAll<{ id?: unknown; rate?: unknown; tax_region_id?: unknown }>(
      query,
      "tax_rate",
      ["id", "rate", "tax_region_id"]
    ),
  ])

  const shippingCurrencies = new Map<string, string[]>()
  shippingPriceSets.forEach((row, index) => {
    const optionId = stringValue(
      row.shipping_option_id,
      `shipping price set ${index}.shipping_option_id`
    )
    const currencies =
      row.price_set?.prices?.map((price, priceIndex) =>
        stringValue(
          price.currency_code,
          `shipping price set ${index}.prices[${priceIndex}].currency_code`
        ).toLowerCase()
      ) ?? []
    shippingCurrencies.set(optionId, [
      ...(shippingCurrencies.get(optionId) ?? []),
      ...currencies,
    ])
  })

  return {
    inventoryLevels: inventoryLevels.map((level, index) => ({
      incomingQuantity: integerValue(
        level.incoming_quantity ?? 0,
        `inventory level ${index}.incoming_quantity`
      ),
      inventoryItemId: stringValue(
        level.inventory_item_id,
        `inventory level ${index}.inventory_item_id`
      ),
      locationId: stringValue(
        level.location_id,
        `inventory level ${index}.location_id`
      ),
      reservedQuantity: integerValue(
        level.reserved_quantity,
        `inventory level ${index}.reserved_quantity`
      ),
      stockedQuantity: integerValue(
        level.stocked_quantity,
        `inventory level ${index}.stocked_quantity`
      ),
    })),
    inventoryLinks: inventoryLinks.map((link, index) => ({
      inventoryItemId: stringValue(
        link.inventory_item_id,
        `inventory link ${index}.inventory_item_id`
      ),
      requiredQuantity: integerValue(
        link.required_quantity,
        `inventory link ${index}.required_quantity`,
        1
      ),
      variantId: stringValue(
        link.variant_id,
        `inventory link ${index}.variant_id`
      ),
    })),
    paymentProviders: paymentProviders.map((provider, index) => ({
      enabled: provider.is_enabled === true,
      id: stringValue(provider.id, `payment provider ${index}.id`),
    })),
    products: products.map((product, productIndex) => ({
      id: stringValue(product.id, `product ${productIndex}.id`),
      salesChannelIds: sortedUnique(
        (product.sales_channels ?? []).map((channel, channelIndex) =>
          stringValue(
            channel.id,
            `product ${productIndex}.sales_channels[${channelIndex}].id`
          )
        )
      ),
      variants: (product.variants ?? []).map((variant, variantIndex) => ({
        ean: nullableString(
          variant.ean,
          `product ${productIndex}.variants[${variantIndex}].ean`
        ),
        id: stringValue(
          variant.id,
          `product ${productIndex}.variants[${variantIndex}].id`
        ),
        prices: (variant.prices ?? []).map((price, priceIndex) => ({
          amount: canonicalPriceAmount(
            price.amount,
            `product ${productIndex}.variants[${variantIndex}].prices[${priceIndex}].amount`
          ),
          currencyCode: stringValue(
            price.currency_code,
            `product ${productIndex}.variants[${variantIndex}].prices[${priceIndex}].currency_code`
          ).toLowerCase(),
        })),
        sku: nullableString(
          variant.sku,
          `product ${productIndex}.variants[${variantIndex}].sku`
        ),
      })),
    })),
    regionPaymentProviderLinks: regionPaymentProviderLinks.map(
      (link, index) => ({
        paymentProviderId: stringValue(
          link.payment_provider_id,
          `region payment provider ${index}.payment_provider_id`
        ),
        regionId: stringValue(
          link.region_id,
          `region payment provider ${index}.region_id`
        ),
      })
    ),
    regions: regions.map((region, index) => ({
      countryCodes: sortedUnique(
        (region.countries ?? []).map((country, countryIndex) =>
          stringValue(
            country.iso_2,
            `region ${index}.countries[${countryIndex}].iso_2`
          ).toLowerCase()
        )
      ),
      currencyCode: stringValue(
        region.currency_code,
        `region ${index}.currency_code`
      ).toLowerCase(),
      id: stringValue(region.id, `region ${index}.id`),
    })),
    shippingOptions: shippingOptions.map((option, index) => {
      const id = stringValue(option.id, `shipping option ${index}.id`)
      return {
        countryCodes: sortedUnique(
          (option.service_zone?.geo_zones ?? []).map((zone, zoneIndex) =>
            stringValue(
              zone.country_code,
              `shipping option ${index}.geo_zones[${zoneIndex}].country_code`
            ).toLowerCase()
          )
        ),
        currencyCodes: sortedUnique(shippingCurrencies.get(id) ?? []),
        id,
      }
    }),
    taxRates: taxRates.map((rate, index) => ({
      enabled: true,
      id: stringValue(rate.id, `tax rate ${index}.id`),
      rate: numberValue(rate.rate, `tax rate ${index}.rate`),
      taxRegionId: stringValue(
        rate.tax_region_id,
        `tax rate ${index}.tax_region_id`
      ),
    })),
    taxRegions: taxRegions.map((region, index) => ({
      countryCode: stringValue(
        region.country_code,
        `tax region ${index}.country_code`
      ).toLowerCase(),
      id: stringValue(region.id, `tax region ${index}.id`),
    })),
  }
}
