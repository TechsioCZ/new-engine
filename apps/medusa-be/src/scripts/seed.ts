import { readFile } from "node:fs/promises"
import path from "node:path"

import type {
  CreateProductCollectionDTO,
  ExecArgs,
  FileDTO,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  batchLinkProductsToCollectionWorkflow,
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
  uploadFilesWorkflow,
} from "@medusajs/medusa/core-flows"

const IMAGE_MIME_TYPES: Readonly<Record<string, string>> = {
  ".png": "image/png",
}

const getRequiredValue = <Value>(
  value: Value | null | undefined,
  message: string,
): Value => {
  if (value === null || value === undefined) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, message)
  }
  return value
}

export default async function seedDemoData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const remoteLink = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  const storeModuleService = container.resolve(Modules.STORE)

  const countries = ["gb", "de", "dk", "se", "fr", "es", "it"]

  logger.info("Seeding store data...")
  const [store] = await storeModuleService.listStores()
  let defaultSalesChannels = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  })

  const existingStore = getRequiredValue(store, "Store not found")
  if (defaultSalesChannels.length === 0) {
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container,
    ).run({
      input: {
        salesChannelsData: [
          {
            name: "Default Sales Channel",
          },
        ],
      },
    })
    defaultSalesChannels = salesChannelResult
  }
  const [defaultSalesChannel] = defaultSalesChannels
  const defaultSalesChannelId = getRequiredValue(
    defaultSalesChannel?.id,
    "Default sales channel not found",
  )

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: existingStore.id },
      update: {
        default_sales_channel_id: defaultSalesChannelId,
        supported_currencies: [
          {
            currency_code: "eur",
            is_default: true,
          },
          {
            currency_code: "usd",
          },
        ],
      },
    },
  })

  logger.info("Seeding region data...")
  const regionService = container.resolve(Modules.REGION)
  let regions = await regionService.listRegions()

  if (regions.length === 0) {
    logger.info("No regions found, creating new ones...")
    const { result: newRegions } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            countries,
            currency_code: "eur",
            name: "Europe",
            payment_providers: ["pp_system_default"],
          },
          {
            countries: ["us"],
            currency_code: "usd",
            name: "United States",
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    })
    if (newRegions.length === 0) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Failed to create new regions.",
      )
    }
    regions = newRegions
    logger.info(`Created ${regions.length} new region(s).`)
  } else {
    logger.info(
      `Found ${regions.length} existing region(s). Using the first one.`,
    )
  }
  const [firstRegion] = regions
  const region = getRequiredValue(
    firstRegion,
    "No regions available after seeding/checking.",
  )
  logger.info("Seeding tax regions...")
  await createTaxRegionsWorkflow(container).run({
    input: countries.map((countryCode) => ({
      country_code: countryCode,
    })),
  })
  logger.info("Finished seeding tax regions.")

  logger.info("Seeding stock location data...")
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container,
  ).run({
    input: {
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
  })
  const [firstStockLocation] = stockLocationResult
  const stockLocation = getRequiredValue(
    firstStockLocation,
    "Stock location not found",
  )
  await remoteLink.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  })

  logger.info("Seeding fulfillment data...")
  const { result: shippingProfileResult } =
    await createShippingProfilesWorkflow(container).run({
      input: {
        data: [
          {
            name: "Default",
            type: "default",
          },
        ],
      },
    })
  const [firstShippingProfile] = shippingProfileResult
  const shippingProfile = getRequiredValue(
    firstShippingProfile,
    "Shipping profile not found",
  )

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "European Warehouse delivery",
    service_zones: [
      {
        geo_zones: [
          {
            country_code: "gb",
            type: "country",
          },
          {
            country_code: "de",
            type: "country",
          },
          {
            country_code: "dk",
            type: "country",
          },
          {
            country_code: "se",
            type: "country",
          },
          {
            country_code: "fr",
            type: "country",
          },
          {
            country_code: "es",
            type: "country",
          },
          {
            country_code: "it",
            type: "country",
          },
        ],
        name: "Europe",
      },
    ],
    type: "shipping",
  })
  const [firstServiceZone] = fulfillmentSet.service_zones
  const serviceZone = getRequiredValue(
    firstServiceZone,
    "Fulfillment service zone not found",
  )

  await remoteLink.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  })

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Shipping",
        price_type: "flat",
        prices: [
          {
            amount: 10,
            currency_code: "usd",
          },
          {
            amount: 10,
            currency_code: "eur",
          },
          {
            amount: 10,
            region_id: region.id,
          },
        ],
        provider_id: "manual_manual",
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
        service_zone_id: serviceZone.id,
        shipping_profile_id: shippingProfile.id,
        type: {
          code: "standard",
          description: "Ship in 2-3 days.",
          label: "Standard",
        },
      },
      {
        name: "Express Shipping",
        price_type: "flat",
        prices: [
          {
            amount: 10,
            currency_code: "usd",
          },
          {
            amount: 10,
            currency_code: "eur",
          },
          {
            amount: 10,
            region_id: region.id,
          },
        ],
        provider_id: "manual_manual",
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
        service_zone_id: serviceZone.id,
        shipping_profile_id: shippingProfile.id,
        type: {
          code: "express",
          description: "Ship in 24 hours.",
          label: "Express",
        },
      },
    ],
  })
  logger.info("Finished seeding fulfillment data.")

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      add: [defaultSalesChannelId],
      id: stockLocation.id,
    },
  })
  logger.info("Finished seeding stock location data.")

  logger.info("Seeding publishable API key data...")
  const { result: publishableApiKeyResult } = await createApiKeysWorkflow(
    container,
  ).run({
    input: {
      api_keys: [
        {
          created_by: "",
          title: "Webshop",
          type: "publishable",
        },
      ],
    },
  })
  const [firstPublishableApiKey] = publishableApiKeyResult
  const publishableApiKey = getRequiredValue(
    firstPublishableApiKey,
    "Publishable API key not found",
  )

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      add: [defaultSalesChannelId],
      id: publishableApiKey.id,
    },
  })
  logger.info("Finished seeding publishable API key data.")

  logger.info("Seeding product data...")

  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container,
  ).run({
    input: {
      product_categories: [
        {
          is_active: true,
          name: "Shirts",
        },
        {
          is_active: true,
          name: "Sweatshirts",
        },
        {
          is_active: true,
          name: "Pants",
        },
        {
          is_active: true,
          name: "Merch",
        },
      ],
    },
  })

  const PRODUCTS = {
    MedusaShorts: "Medusa Shorts",
    MedusaSweatpants: "Medusa Sweatpants",
    MedusaSweatshirt: "Medusa Sweatshirt",
    MedusaTShirt: "Medusa T-Shirt",
  } as const
  const getCategoryId = (name: string): string =>
    getRequiredValue(
      categoryResult.find((category) => category.name === name)?.id,
      `Product category not found: ${name}`,
    )

  const readLocalUploadFile = async (
    filePath: string,
    access: "private" | "public",
  ) => {
    try {
      logger.info(`Reading file: ${filePath}`)
      const buffer = await readFile(filePath)
      const filename = path.basename(filePath)
      const mimeType =
        IMAGE_MIME_TYPES[path.extname(filePath).toLowerCase()] ??
        "application/octet-stream"

      logger.info(`Successfully read file: ${filename} (${mimeType})`)
      return {
        access,
        content: buffer.toString("base64"),
        filename,
        mimeType,
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined
      logger.error(
        `Error reading file ${filePath}: ${errorMessage}\n${errorStack ?? ""}`,
      )
      return null
    }
  }

  const uploadProductFiles = async (
    productName: string,
    filePaths: string[],
    access: "private" | "public",
  ) => {
    logger.info(
      `Processing product: ${productName} with ${filePaths.length} files`,
    )

    const files = await Promise.all(
      filePaths.map(
        async (filePath) => await readLocalUploadFile(filePath, access),
      ),
    )
    const validFiles = files.filter(
      (f): f is NonNullable<typeof f> => f !== null,
    )
    logger.info(
      `Valid files for ${productName}: ${validFiles.length}/${files.length}`,
    )

    if (validFiles.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `No valid files processed for product ${productName}`,
      )
    }

    logger.info(`Uploading files for product: ${productName}`)
    const { result } = await uploadFilesWorkflow(container).run({
      input: {
        files: validFiles,
      },
    })

    logger.info(
      `Upload successful for ${productName}. Files uploaded: ${result
        .map((f) => f.url)
        .join(", ")}`,
    )

    return result
  }

  const uploadProductFilesOrThrow = async (
    productName: string,
    filePaths: string[],
    access: "private" | "public",
  ) => {
    try {
      return await uploadProductFiles(productName, filePaths, access)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined
      logger.error(
        `Error processing product ${productName}: ${errorMessage}\n${
          errorStack ?? ""
        }`,
      )
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Error processing ${productName}: ${errorMessage}`,
      )
    }
  }

  const uploadLocalFiles = async (
    productImageMap: Record<string, string[]>,
    access: "private" | "public" = "private",
  ): Promise<Record<string, FileDTO[]>> => {
    try {
      const uploadEntries = async (
        entries: readonly (readonly [string, string[]])[],
      ): Promise<readonly (readonly [string, FileDTO[]])[]> => {
        const [entry, ...remainingEntries] = entries
        if (entry === undefined) {
          return []
        }
        const [productName, filePaths] = entry
        const files = await uploadProductFilesOrThrow(
          productName,
          filePaths,
          access,
        )
        return [
          [productName, files] as const,
          ...(await uploadEntries(remainingEntries)),
        ]
      }
      const uploadedEntries = await uploadEntries(
        Object.entries(productImageMap),
      )
      const results: Record<string, FileDTO[]> =
        Object.fromEntries(uploadedEntries)

      logger.info(
        `All products processed successfully. Products: ${Object.keys(
          results,
        ).join(", ")}. Total files: ${Object.values(results).reduce(
          (acc, files) => acc + files.length,
          0,
        )}`,
      )

      return results
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined
      logger.error(
        `Fatal error in uploadLocalFiles: ${errorMessage}\n${errorStack ?? ""}`,
      )
      throw new MedusaError(MedusaError.Types.INVALID_DATA, errorMessage)
    }
  }

  const seedImages = async () => {
    const productImageMap = {
      [PRODUCTS.MedusaTShirt]: [
        "/var/www/apps/medusa-be/src/scripts/seed-files/tee-black-front.png",
        "/var/www/apps/medusa-be/src/scripts/seed-files/tee-black-back.png",
        "/var/www/apps/medusa-be/src/scripts/seed-files/tee-white-front.png",
        "/var/www/apps/medusa-be/src/scripts/seed-files/tee-white-back.png",
      ],
      [PRODUCTS.MedusaSweatshirt]: [
        "/var/www/apps/medusa-be/src/scripts/seed-files/sweatshirt-vintage-front.png",
        "/var/www/apps/medusa-be/src/scripts/seed-files/sweatshirt-vintage-back.png",
      ],
      [PRODUCTS.MedusaSweatpants]: [
        "/var/www/apps/medusa-be/src/scripts/seed-files/sweatpants-gray-front.png",
        "/var/www/apps/medusa-be/src/scripts/seed-files/sweatpants-gray-back.png",
      ],
      [PRODUCTS.MedusaShorts]: [
        "/var/www/apps/medusa-be/src/scripts/seed-files/shorts-vintage-front.png",
        "/var/www/apps/medusa-be/src/scripts/seed-files/shorts-vintage-back.png",
      ],
    }

    try {
      logger.info(
        `Starting image upload process. Products: ${
          Object.keys(productImageMap).length
        }, Files: ${Object.values(productImageMap).reduce(
          (acc, files) => acc + files.length,
          0,
        )}`,
      )

      const result = await uploadLocalFiles(productImageMap, "public")

      logger.info(
        `Image upload completed successfully. Products processed: ${Object.keys(
          result,
        ).join(", ")}`,
      )

      return result
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined
      logger.error(`Error in seedImages: ${errorMessage}\n${errorStack ?? ""}`)
      throw error
    }
  }

  const images = await seedImages()
  logger.info(
    `Seeding completed successfully. Products: ${Object.keys(images).join(
      ", ",
    )}`,
  )

  const { result: products } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          category_ids: [getCategoryId("Shirts")],
          description:
            "Reimagine the feeling of a classic T-shirt. With our cotton T-shirts, everyday essentials no longer have to be ordinary.",
          handle: "t-shirt",
          ...(images[PRODUCTS.MedusaTShirt]
            ? { images: images[PRODUCTS.MedusaTShirt] }
            : {}),
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
          sales_channels: [
            {
              id: defaultSalesChannelId,
            },
          ],
          status: ProductStatus.PUBLISHED,
          title: "Medusa T-Shirt",
          variants: [
            {
              options: {
                Color: "Black",
                Size: "S",
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
              ],
              sku: "SHIRT-S-BLACK",
              title: "S / Black",
            },
            {
              options: {
                Color: "White",
                Size: "S",
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
              ],
              sku: "SHIRT-S-WHITE",
              title: "S / White",
            },
            {
              options: {
                Color: "Black",
                Size: "M",
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
              ],
              sku: "SHIRT-M-BLACK",
              title: "M / Black",
            },
            {
              options: {
                Color: "White",
                Size: "M",
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
              ],
              sku: "SHIRT-M-WHITE",
              title: "M / White",
            },
            {
              options: {
                Color: "Black",
                Size: "L",
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
              ],
              sku: "SHIRT-L-BLACK",
              title: "L / Black",
            },
            {
              options: {
                Color: "White",
                Size: "L",
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
              ],
              sku: "SHIRT-L-WHITE",
              title: "L / White",
            },
            {
              options: {
                Color: "Black",
                Size: "XL",
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
              ],
              sku: "SHIRT-XL-BLACK",
              title: "XL / Black",
            },
            {
              options: {
                Color: "White",
                Size: "XL",
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
              ],
              sku: "SHIRT-XL-WHITE",
              title: "XL / White",
            },
          ],
          weight: 400,
        },
        {
          category_ids: [getCategoryId("Sweatshirts")],
          description:
            "Reimagine the feeling of a classic sweatshirt. With our cotton sweatshirt, everyday essentials no longer have to be ordinary.",
          handle: "sweatshirt",
          ...(images[PRODUCTS.MedusaSweatshirt]
            ? { images: images[PRODUCTS.MedusaSweatshirt] }
            : {}),
          options: [
            {
              title: "Size",
              values: ["S", "M", "L", "XL"],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannelId,
            },
          ],
          status: ProductStatus.PUBLISHED,
          title: "Medusa Sweatshirt",
          variants: [
            {
              options: {
                Size: "S",
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
              ],
              sku: "SWEATSHIRT-S",
              title: "S",
            },
            {
              options: {
                Size: "M",
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
              ],
              sku: "SWEATSHIRT-M",
              title: "M",
            },
            {
              options: {
                Size: "L",
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
              ],
              sku: "SWEATSHIRT-L",
              title: "L",
            },
            {
              options: {
                Size: "XL",
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
              ],
              sku: "SWEATSHIRT-XL",
              title: "XL",
            },
          ],
          weight: 400,
        },
        {
          category_ids: [getCategoryId("Pants")],
          description:
            "Reimagine the feeling of classic sweatpants. With our cotton sweatpants, everyday essentials no longer have to be ordinary.",
          handle: "sweatpants",
          ...(images[PRODUCTS.MedusaSweatpants]
            ? { images: images[PRODUCTS.MedusaSweatpants] }
            : {}),
          options: [
            {
              title: "Size",
              values: ["S", "M", "L", "XL"],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannelId,
            },
          ],
          status: ProductStatus.PUBLISHED,
          title: "Medusa Sweatpants",
          variants: [
            {
              options: {
                Size: "S",
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
              ],
              sku: "SWEATPANTS-S",
              title: "S",
            },
            {
              options: {
                Size: "M",
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
              ],
              sku: "SWEATPANTS-M",
              title: "M",
            },
            {
              options: {
                Size: "L",
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
              ],
              sku: "SWEATPANTS-L",
              title: "L",
            },
            {
              options: {
                Size: "XL",
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
              ],
              sku: "SWEATPANTS-XL",
              title: "XL",
            },
          ],
          weight: 400,
        },
        {
          category_ids: [getCategoryId("Merch")],
          description:
            "Reimagine the feeling of classic shorts. With our cotton shorts, everyday essentials no longer have to be ordinary.",
          handle: "shorts",
          ...(images[PRODUCTS.MedusaShorts]
            ? { images: images[PRODUCTS.MedusaShorts] }
            : {}),
          options: [
            {
              title: "Size",
              values: ["S", "M", "L", "XL"],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannelId,
            },
          ],
          status: ProductStatus.PUBLISHED,
          title: "Medusa Shorts",
          variants: [
            {
              options: {
                Size: "S",
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
              ],
              sku: "SHORTS-S",
              title: "S",
            },
            {
              options: {
                Size: "M",
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
              ],
              sku: "SHORTS-M",
              title: "M",
            },
            {
              options: {
                Size: "L",
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
              ],
              sku: "SHORTS-L",
              title: "L",
            },
            {
              options: {
                Size: "XL",
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
              ],
              sku: "SHORTS-XL",
              title: "XL",
            },
          ],
          weight: 400,
        },
      ],
    },
  })

  logger.info("Finished seeding product data.")
  logger.info("Seeding inventory levels.")

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  })

  const inventoryLevels: {
    location_id: string
    stocked_quantity: number
    inventory_item_id: string
  }[] = inventoryItems.map(({ id }: { id: string }) => ({
    inventory_item_id: id,
    location_id: stockLocation.id,
    stocked_quantity: 1_000_000,
  }))

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryLevels,
    },
  })

  logger.info("Finished seeding inventory levels data.")

  logger.info("Create collection")
  const collectionData: CreateProductCollectionDTO = {
    handle: "latest-drops",
    title: "Latest Drops",
  }

  const { result: collections } = await createCollectionsWorkflow(
    container,
  ).run({
    input: {
      collections: [collectionData],
    },
  })
  const [firstCollection] = collections
  const collection = getRequiredValue(firstCollection, "Collection not found")

  await batchLinkProductsToCollectionWorkflow(container).run({
    input: {
      add: products.map((product) => product.id),
      id: collection.id,
    },
  })

  logger.info(
    `Created collection: ${collection.title} with ${products.length} products`,
  )
}
