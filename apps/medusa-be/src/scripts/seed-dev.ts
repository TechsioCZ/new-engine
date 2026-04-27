import type { ExecArgs, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  type SeedDevWorkflowInput,
  seedDevWorkflow,
} from "../workflows/seed/workflows"

export default async function seedDev({ container }: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

  logger.info("Starting dev seed from seed-products.json...")

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
  const input: SeedDevWorkflowInput = {
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
        countries: countries.filter((country) => country !== "cz"),
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
          geoZones: countries.map((country) => ({
            countryCode: country,
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
  }

  const { result } = await seedDevWorkflow(container).run({
    input,
  })

  logger.info("Dev seed completed successfully")
  logger.info(`Result: ${JSON.stringify(result, null, 2)}`)
}
