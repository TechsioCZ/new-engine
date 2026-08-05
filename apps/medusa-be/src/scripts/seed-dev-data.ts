import type { ExecArgs, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import seedDatabaseWorkflow from "../workflows/seed/workflows/seed-database"
import type { SeedDatabaseWorkflowInput } from "../workflows/seed/workflows/seed-database"

type SeedProduct = SeedDatabaseWorkflowInput["products"][number]
type SeedProductVariant = NonNullable<SeedProduct["variants"]>[number]

const defaultSalesChannelName = "Default Sales Channel"
const defaultShippingProfileName = "Default Shipping Profile"

const createProductPrices = (): SeedProductVariant["prices"] => [
  {
    amount: 10,
    currency_code: "eur",
  },
  {
    amount: 15,
    currency_code: "usd",
  },
  {
    amount: 250,
    currency_code: "czk",
  },
]

const createSizedVariants = (skuPrefix: string): SeedProductVariant[] =>
  ["S", "M", "L", "XL"].map((size) => ({
    options: {
      Size: size,
    },
    prices: createProductPrices(),
    quantities: {
      quantity: 100,
    },
    sku: `${skuPrefix}-${size}`,
    title: size,
  }))

const createShirtVariants = (): SeedProductVariant[] =>
  ["S", "M", "L", "XL"].flatMap((size) =>
    ["Black", "White"].map((color) => ({
      options: {
        Color: color,
        Size: size,
      },
      prices: createProductPrices(),
      quantities: {
        quantity: 100,
      },
      sku: `SHIRT-${size}-${color.toUpperCase()}`,
      title: `${size} / ${color}`,
    })),
  )

const createProducts = (): SeedDatabaseWorkflowInput["products"] => [
  {
    categories: [{ handle: "shirts", name: "Shirts" }],
    description:
      "Reimagine the feeling of a classic T-shirt. With our cotton T-shirts, everyday essentials no longer have to be ordinary.",
    handle: "t-shirt",
    images: [
      {
        url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png",
      },
      {
        url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-back.png",
      },
      {
        url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-front.png",
      },
      {
        url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-back.png",
      },
    ],
    options: [
      {
        title: "Size",
        values: ["S", "M", "L", "XL"],
      },
      {
        title: "Color",
        values: ["Black", "White"],
      },
    ],
    salesChannelNames: [defaultSalesChannelName],
    shippingProfileName: defaultShippingProfileName,
    title: "Medusa T-Shirt",
    variants: createShirtVariants(),
    weight: 400,
  },
  {
    categories: [{ handle: "sweatshirts", name: "Sweatshirts" }],
    description:
      "Reimagine the feeling of a classic sweatshirt. With our cotton sweatshirt, everyday essentials no longer have to be ordinary.",
    handle: "sweatshirt",
    images: [
      {
        url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-front.png",
      },
      {
        url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-back.png",
      },
    ],
    options: [
      {
        title: "Size",
        values: ["S", "M", "L", "XL"],
      },
    ],
    salesChannelNames: [defaultSalesChannelName],
    shippingProfileName: defaultShippingProfileName,
    title: "Medusa Sweatshirt",
    variants: createSizedVariants("SWEATSHIRT"),
    weight: 400,
  },
  {
    categories: [{ handle: "pants", name: "Pants" }],
    description:
      "Reimagine the feeling of classic sweatpants. With our cotton sweatpants, everyday essentials no longer have to be ordinary.",
    handle: "sweatpants",
    images: [
      {
        url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-front.png",
      },
      {
        url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-back.png",
      },
    ],
    options: [
      {
        title: "Size",
        values: ["S", "M", "L", "XL"],
      },
    ],
    salesChannelNames: [defaultSalesChannelName],
    shippingProfileName: defaultShippingProfileName,
    title: "Medusa Sweatpants",
    variants: createSizedVariants("SWEATPANTS"),
    weight: 400,
  },
  {
    categories: [{ handle: "merch", name: "Merch" }],
    description:
      "Reimagine the feeling of classic shorts. With our cotton shorts, everyday essentials no longer have to be ordinary.",
    handle: "shorts",
    images: [
      {
        url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-front.png",
      },
      {
        url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-back.png",
      },
    ],
    options: [
      {
        title: "Size",
        values: ["S", "M", "L", "XL"],
      },
    ],
    salesChannelNames: [defaultSalesChannelName],
    shippingProfileName: defaultShippingProfileName,
    title: "Medusa Shorts",
    variants: createSizedVariants("SHORTS"),
    weight: 400,
  },
]

export default async function seedDevData({ container }: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

  logger.info("Starting dev data seed...")

  const countries = [
    "cz",
    "gb",
    "de",
    "dk",
    "se",
    "fr",
    "es",
    "it",
    "pl",
    "at",
    "sk",
  ]
  const input: SeedDatabaseWorkflowInput = {
    currencies: [
      {
        code: "czk",
        default: true,
      },
      {
        code: "eur",
        default: false,
      },
      {
        code: "usd",
        default: false,
      },
    ],
    defaultShippingProfile: {
      name: defaultShippingProfileName,
    },
    fulfillmentSets: {
      name: "European Warehouse delivery",
      serviceZones: [
        {
          geoZones: countries.map((countryCode) => ({ countryCode })),
          name: "Europe",
        },
      ],
      type: "shipping",
    },
    productCategories: [
      {
        isActive: true,
        name: "Shirts",
      },
      {
        isActive: true,
        name: "Sweatshirts",
      },
      {
        isActive: true,
        name: "Pants",
      },
      {
        isActive: true,
        name: "Merch",
      },
    ],
    products: createProducts(),
    publishableKey: {
      title: "Webshop",
    },
    regions: [
      {
        countries: ["cz"],
        currencyCode: "czk",
        name: "Czechia",
      },
      {
        countries: countries.filter((countryCode) => countryCode !== "cz"),
        currencyCode: "eur",
        name: "Europe",
      },
    ],
    salesChannels: [
      {
        default: true,
        name: defaultSalesChannelName,
      },
    ],
    shippingOptions: [
      {
        name: "Standard Shipping",
        prices: [
          {
            amount: 10,
            currencyCode: "usd",
          },
          {
            amount: 10,
            currencyCode: "eur",
          },
          {
            amount: 250,
            currencyCode: "czk",
          },
        ],
        providerId: "manual_manual",
        rules: [
          {
            attribute: "enabled_in_store",
            operator: "eq",
            value: "true",
          },
          {
            attribute: "is_return",
            operator: "eq",
            value: "false",
          },
        ],
        type: {
          code: "standard",
          description: "Ship in 2-3 days.",
          label: "Standard",
        },
      },
      {
        name: "Express Shipping",
        prices: [
          {
            amount: 10,
            currencyCode: "usd",
          },
          {
            amount: 10,
            currencyCode: "eur",
          },
          {
            amount: 250,
            currencyCode: "czk",
          },
        ],
        providerId: "manual_manual",
        rules: [
          {
            attribute: "enabled_in_store",
            operator: "eq",
            value: "true",
          },
          {
            attribute: "is_return",
            operator: "eq",
            value: "false",
          },
        ],
        type: {
          code: "express",
          description: "Ship in 24 hours.",
          label: "Express",
        },
      },
    ],
    stockLocations: {
      locations: [
        {
          address: {
            address_1: "",
            city: "Copenhagen",
            country_code: "DK",
          },
          name: "European Warehouse",
        },
      ],
    },
    taxRegions: {
      countries,
    },
    workflowDefaults: {
      fulfillmentProviderId: "manual_manual",
      shippingOptionPriceAmount: 10,
    },
  }

  const { result } = await seedDatabaseWorkflow(container).run({
    input,
  })

  logger.info("Database seed completed successfully")
  logger.info(`Result: ${JSON.stringify(result, null, 2)}`)
}
