import type { ExecArgs, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import seedDatabaseWorkflow, {
  type SeedDatabaseWorkflowInput,
} from "../workflows/seed/workflows/seed-database"

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
    workflowDefaults: {
      fulfillmentProviderId: "manual_manual",
      shippingOptionPriceAmount: 10,
    },
    salesChannels: [
      {
        name: "Default Sales Channel",
        default: true,
      },
    ],
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
    regions: [
      {
        name: "Czechia",
        currencyCode: "czk",
        countries: ["cz"],
        paymentProviders: undefined,
      },
      {
        name: "Europe",
        currencyCode: "eur",
        countries: countries.filter((c) => c !== "cz"),
        paymentProviders: undefined,
      },
    ],
    taxRegions: {
      countries,
      taxProviderId: undefined,
    },
    stockLocations: {
      locations: [
        {
          name: "European Warehouse",
          address: {
            city: "Copenhagen",
            country_code: "DK",
            address_1: "",
          },
        },
      ],
    },
    defaultShippingProfile: {
      name: "Default Shipping Profile",
    },
    fulfillmentSets: {
      name: "European Warehouse delivery",
      type: "shipping",
      serviceZones: [
        {
          name: "Europe",
          geoZones: countries.map((c) => ({
            countryCode: c,
          })),
        },
      ],
    },
    shippingOptions: [
      {
        name: "Standard Shipping",
        providerId: "manual_manual",
        type: {
          label: "Standard",
          description: "Ship in 2-3 days.",
          code: "standard",
        },
        prices: [
          {
            currencyCode: "usd",
            amount: 10,
          },
          {
            currencyCode: "eur",
            amount: 10,
          },
          {
            currencyCode: "czk",
            amount: 250,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
      {
        name: "Express Shipping",
        providerId: "manual_manual",
        type: {
          label: "Express",
          description: "Ship in 24 hours.",
          code: "express",
        },
        prices: [
          {
            currencyCode: "usd",
            amount: 10,
          },
          {
            currencyCode: "eur",
            amount: 10,
          },
          {
            currencyCode: "czk",
            amount: 250,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    ],
    publishableKey: {
      title: "Webshop",
    },
    productCategories: [
      {
        name: "Shirts",
        isActive: true,
      },
      {
        name: "Sweatshirts",
        isActive: true,
      },
      {
        name: "Pants",
        isActive: true,
      },
      {
        name: "Merch",
        isActive: true,
      },
    ],
    products: [
      {
        title: "Medusa T-Shirt",
        categories: [{ name: "Shirts", handle: "shirts" }],
        description:
          "Reimagine the feeling of a classic T-shirt. With our cotton T-shirts, everyday essentials no longer have to be ordinary.",
        handle: "t-shirt",
        weight: 400,
        shippingProfileName: "Default Shipping Profile",
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
        variants: [
          {
            title: "S / Black",
            sku: "SHIRT-S-BLACK",
            options: {
              Size: "S",
              Color: "Black",
            },
            quantities: {
              quantity: 100,
            },
            prices: [
              {
                amount: 10,
                currency_code: "eur",
              },
              {
                amount: 15,
                currency_code: "usd",
              },
              {
                currency_code: "czk",
                amount: 250,
              },
            ],
          },
          {
            title: "S / White",
            sku: "SHIRT-S-WHITE",
            options: {
              Size: "S",
              Color: "White",
            },
            quantities: {
              quantity: 100,
            },
            prices: [
              {
                amount: 10,
                currency_code: "eur",
              },
              {
                amount: 15,
                currency_code: "usd",
              },
              {
                currency_code: "czk",
                amount: 250,
              },
            ],
          },
          {
            title: "M / Black",
            sku: "SHIRT-M-BLACK",
            options: {
              Size: "M",
              Color: "Black",
            },
            quantities: {
              quantity: 100,
            },
            prices: [
              {
                amount: 10,
                currency_code: "eur",
              },
              {
                amount: 15,
                currency_code: "usd",
              },
              {
                currency_code: "czk",
                amount: 250,
              },
            ],
          },
          {
            title: "M / White",
            sku: "SHIRT-M-WHITE",
            options: {
              Size: "M",
              Color: "White",
            },
            quantities: {
              quantity: 100,
            },
            prices: [
              {
                amount: 10,
                currency_code: "eur",
              },
              {
                amount: 15,
                currency_code: "usd",
              },
              {
                currency_code: "czk",
                amount: 250,
              },
            ],
          },
          {
            title: "L / Black",
            sku: "SHIRT-L-BLACK",
            options: {
              Size: "L",
              Color: "Black",
            },
            quantities: {
              quantity: 100,
            },
            prices: [
              {
                amount: 10,
                currency_code: "eur",
              },
              {
                amount: 15,
                currency_code: "usd",
              },
              {
                currency_code: "czk",
                amount: 250,
              },
            ],
          },
          {
            title: "L / White",
            sku: "SHIRT-L-WHITE",
            options: {
              Size: "L",
              Color: "White",
            },
            quantities: {
              quantity: 100,
            },
            prices: [
              {
                amount: 10,
                currency_code: "eur",
              },
              {
                amount: 15,
                currency_code: "usd",
              },
              {
                currency_code: "czk",
                amount: 250,
              },
            ],
          },
          {
            title: "XL / Black",
            sku: "SHIRT-XL-BLACK",
            options: {
              Size: "XL",
              Color: "Black",
            },
            quantities: {
              quantity: 100,
            },
            prices: [
              {
                amount: 10,
                currency_code: "eur",
              },
              {
                amount: 15,
                currency_code: "usd",
              },
              {
                currency_code: "czk",
                amount: 250,
              },
            ],
          },
          {
            title: "XL / White",
            sku: "SHIRT-XL-WHITE",
            options: {
              Size: "XL",
              Color: "White",
            },
            quantities: {
              quantity: 100,
            },
            prices: [
              {
                amount: 10,
                currency_code: "eur",
              },
              {
                amount: 15,
                currency_code: "usd",
              },
              {
                currency_code: "czk",
                amount: 250,
              },
            ],
          },
        ],
        salesChannelNames: ["Default Sales Channel"],
      },
      {
        title: "Medusa Sweatshirt",
        categories: [{ name: "Sweatshirts", handle: "sweatshirts" }],
        description:
          "Reimagine the feeling of a classic sweatshirt. With our cotton sweatshirt, everyday essentials no longer have to be ordinary.",
        handle: "sweatshirt",
        weight: 400,
        shippingProfileName: "Default Shipping Profile",
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
        variants: [
          {
            title: "S",
            sku: "SWEATSHIRT-S",
            options: {
              Size: "S",
            },
            quantities: {
              quantity: 100,
            },
            prices: [
              {
                amount: 10,
                currency_code: "eur",
              },
              {
                amount: 15,
                currency_code: "usd",
              },
              {
                currency_code: "czk",
                amount: 250,
              },
            ],
          },
          {
            title: "M",
            sku: "SWEATSHIRT-M",
            options: {
              Size: "M",
            },
            quantities: {
              quantity: 100,
            },
            prices: [
              {
                amount: 10,
                currency_code: "eur",
              },
              {
                amount: 15,
                currency_code: "usd",
              },
              {
                currency_code: "czk",
                amount: 250,
              },
            ],
          },
          {
            title: "L",
            sku: "SWEATSHIRT-L",
            options: {
              Size: "L",
            },
            quantities: {
              quantity: 100,
            },
            prices: [
              {
                amount: 10,
                currency_code: "eur",
              },
              {
                amount: 15,
                currency_code: "usd",
              },
              {
                currency_code: "czk",
                amount: 250,
              },
            ],
          },
          {
            title: "XL",
            sku: "SWEATSHIRT-XL",
            options: {
              Size: "XL",
            },
            quantities: {
              quantity: 100,
            },
            prices: [
              {
                amount: 10,
                currency_code: "eur",
              },
              {
                amount: 15,
                currency_code: "usd",
              },
              {
                currency_code: "czk",
                amount: 250,
              },
            ],
          },
        ],
        salesChannelNames: ["Default Sales Channel"],
      },
      {
        title: "Medusa Sweatpants",
        categories: [{ name: "Pants", handle: "pants" }],
        description:
          "Reimagine the feeling of classic sweatpants. With our cotton sweatpants, everyday essentials no longer have to be ordinary.",
        handle: "sweatpants",
        weight: 400,
        shippingProfileName: "Default Shipping Profile",
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
        variants: [
          {
            title: "S",
            sku: "SWEATPANTS-S",
            options: {
              Size: "S",
            },
            quantities: {
              quantity: 100,
            },
            prices: [
              {
                amount: 10,
                currency_code: "eur",
              },
              {
                amount: 15,
                currency_code: "usd",
              },
              {
                currency_code: "czk",
                amount: 250,
              },
            ],
          },
          {
            title: "M",
            sku: "SWEATPANTS-M",
            options: {
              Size: "M",
            },
            quantities: {
              quantity: 100,
            },
            prices: [
              {
                amount: 10,
                currency_code: "eur",
              },
              {
                amount: 15,
                currency_code: "usd",
              },
              {
                currency_code: "czk",
                amount: 250,
              },
            ],
          },
          {
            title: "L",
            sku: "SWEATPANTS-L",
            options: {
              Size: "L",
            },
            quantities: {
              quantity: 100,
            },
            prices: [
              {
                amount: 10,
                currency_code: "eur",
              },
              {
                amount: 15,
                currency_code: "usd",
              },
              {
                currency_code: "czk",
                amount: 250,
              },
            ],
          },
          {
            title: "XL",
            sku: "SWEATPANTS-XL",
            options: {
              Size: "XL",
            },
            quantities: {
              quantity: 100,
            },
            prices: [
              {
                amount: 10,
                currency_code: "eur",
              },
              {
                amount: 15,
                currency_code: "usd",
              },
              {
                currency_code: "czk",
                amount: 250,
              },
            ],
          },
        ],
        salesChannelNames: ["Default Sales Channel"],
      },
      {
        title: "Medusa Shorts",
        categories: [{ name: "Merch", handle: "merch" }],
        description:
          "Reimagine the feeling of classic shorts. With our cotton shorts, everyday essentials no longer have to be ordinary.",
        handle: "shorts",
        weight: 400,
        shippingProfileName: "Default Shipping Profile",
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
        variants: [
          {
            title: "S",
            sku: "SHORTS-S",
            options: {
              Size: "S",
            },
            quantities: {
              quantity: 100,
            },
            prices: [
              {
                amount: 10,
                currency_code: "eur",
              },
              {
                amount: 15,
                currency_code: "usd",
              },
              {
                currency_code: "czk",
                amount: 250,
              },
            ],
          },
          {
            title: "M",
            sku: "SHORTS-M",
            options: {
              Size: "M",
            },
            quantities: {
              quantity: 100,
            },
            prices: [
              {
                amount: 10,
                currency_code: "eur",
              },
              {
                amount: 15,
                currency_code: "usd",
              },
              {
                currency_code: "czk",
                amount: 250,
              },
            ],
          },
          {
            title: "L",
            sku: "SHORTS-L",
            options: {
              Size: "L",
            },
            quantities: {
              quantity: 100,
            },
            prices: [
              {
                amount: 10,
                currency_code: "eur",
              },
              {
                amount: 15,
                currency_code: "usd",
              },
              {
                currency_code: "czk",
                amount: 250,
              },
            ],
          },
          {
            title: "XL",
            sku: "SHORTS-XL",
            options: {
              Size: "XL",
            },
            quantities: {
              quantity: 100,
            },
            prices: [
              {
                amount: 10,
                currency_code: "eur",
              },
              {
                amount: 15,
                currency_code: "usd",
              },
              {
                currency_code: "czk",
                amount: 250,
              },
            ],
          },
        ],
        salesChannelNames: ["Default Sales Channel"],
      },
    ],
  }

  const { result } = await seedDatabaseWorkflow(container).run({
    input,
  })

  logger.info("Database seed completed successfully")
  logger.info(`Result: ${JSON.stringify(result, null, 2)}`)
}
