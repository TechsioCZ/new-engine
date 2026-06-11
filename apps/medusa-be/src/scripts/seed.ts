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
import mime from "mime"

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
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  })

  if (!store) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Store not found")
  }
  if (!defaultSalesChannel?.length) {
    // create the default sales channel
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [
          {
            name: "Default Sales Channel",
          },
        ],
      },
    })
    defaultSalesChannel = salesChannelResult
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [
          {
            currency_code: "eur",
            is_default: true,
          },
          {
            currency_code: "usd",
          },
        ],
        default_sales_channel_id: defaultSalesChannel[0]?.id,
      },
    },
  })

  logger.info("Seeding region data...")
  const regionService = container.resolve(Modules.REGION)
  let regions = await regionService.listRegions()

  if (!regions || regions.length === 0) {
    logger.info("No regions found, creating new ones...")
    const { result: newRegions } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "Europe",
            currency_code: "eur",
            countries,
            payment_providers: ["pp_system_default"],
          },
          {
            name: "United States",
            currency_code: "usd",
            countries: ["us"],
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    })
    if (!newRegions || newRegions.length === 0) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Failed to create new regions."
      )
    }
    regions = newRegions
    logger.info(`Created ${regions.length} new region(s).`)
  } else {
    logger.info(
      `Found ${regions.length} existing region(s). Using the first one.`
    )
  }
  if (!regions || regions.length === 0) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No regions available after seeding/checking."
    )
  }
  const region = regions[0]
  logger.info("Seeding tax regions...")
  await createTaxRegionsWorkflow(container).run({
    input: countries.map((country_code) => ({
      country_code,
    })),
  })
  logger.info("Finished seeding tax regions.")

  logger.info("Seeding stock location data...")
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
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
  })
  const stockLocation = stockLocationResult[0]

  if (!stockLocation) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Stock location not found"
    )
  }
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
  const shippingProfile = shippingProfileResult[0]
  if (!shippingProfile) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Shipping profile not found"
    )
  }

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "European Warehouse delivery",
    type: "shipping",
    service_zones: [
      {
        name: "Europe",
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
      },
    ],
  })

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
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0]?.id as string,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "Ship in 2-3 days.",
          code: "standard",
        },
        prices: [
          {
            currency_code: "usd",
            amount: 10,
          },
          {
            currency_code: "eur",
            amount: 10,
          },
          {
            region_id: region?.id as string,
            amount: 10,
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
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0]?.id as string,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Express",
          description: "Ship in 24 hours.",
          code: "express",
        },
        prices: [
          {
            currency_code: "usd",
            amount: 10,
          },
          {
            currency_code: "eur",
            amount: 10,
          },
          {
            region_id: region?.id as string,
            amount: 10,
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
  })
  logger.info("Finished seeding fulfillment data.")

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel[0]?.id as string],
    },
  })
  logger.info("Finished seeding stock location data.")

  logger.info("Seeding publishable API key data...")
  const { result: publishableApiKeyResult } = await createApiKeysWorkflow(
    container
  ).run({
    input: {
      api_keys: [
        {
          title: "Webshop",
          type: "publishable",
          created_by: "",
        },
      ],
    },
  })
  const publishableApiKey = publishableApiKeyResult[0]
  if (!publishableApiKey) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Publishable API key not found"
    )
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel[0]?.id as string],
    },
  })
  logger.info("Finished seeding publishable API key data.")

  logger.info("Seeding product data...")

  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: [
        {
          name: "Shirts",
          is_active: true,
        },
        {
          name: "Sweatshirts",
          is_active: true,
        },
        {
          name: "Pants",
          is_active: true,
        },
        {
          name: "Merch",
          is_active: true,
        },
      ],
    },
  })

  const PRODUCTS = {
    MedusaTShirt: "Medusa T-Shirt",
    MedusaSweatshirt: "Medusa Sweatshirt",
    MedusaSweatpants: "Medusa Sweatpants",
    MedusaShorts: "Medusa Shorts",
  } as const

  async function readLocalUploadFile(
    filePath: string,
    access: "private" | "public"
  ) {
    try {
      logger.info(`Reading file: ${filePath}`)
      const buffer = await readFile(filePath)
      const filename = path.basename(filePath)
      const mimeType = mime.getType(filePath) || "application/octet-stream"

      logger.info(`Successfully read file: ${filename} (${mimeType})`)
      return {
        filename,
        mimeType,
        content: buffer.toString("base64"),
        access,
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined
      logger.error(
        `Error reading file ${filePath}: ${errorMessage}\n${errorStack || ""}`
      )
      return null
    }
  }

  async function uploadProductFiles(
    productName: string,
    filePaths: string[],
    access: "private" | "public"
  ) {
    logger.info(
      `Processing product: ${productName} with ${filePaths.length} files`
    )

    const files = await Promise.all(
      filePaths.map((filePath) => readLocalUploadFile(filePath, access))
    )
    const validFiles = files.filter(
      (f): f is NonNullable<typeof f> => f !== null
    )
    logger.info(
      `Valid files for ${productName}: ${validFiles.length}/${files.length}`
    )

    if (validFiles.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `No valid files processed for product ${productName}`
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
        .join(", ")}`
    )

    return result
  }

  async function uploadProductFilesOrThrow(
    productName: string,
    filePaths: string[],
    access: "private" | "public"
  ) {
    try {
      return await uploadProductFiles(productName, filePaths, access)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined
      logger.error(
        `Error processing product ${productName}: ${errorMessage}\n${
          errorStack || ""
        }`
      )
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Error processing ${productName}: ${errorMessage}`
      )
    }
  }

  async function uploadLocalFiles(
    productImageMap: Record<string, string[]>,
    access: "private" | "public" = "private"
  ): Promise<Record<string, FileDTO[]>> {
    try {
      const results: Record<string, FileDTO[]> = {}

      for (const [productName, filePaths] of Object.entries(productImageMap)) {
        results[productName] = await uploadProductFilesOrThrow(
          productName,
          filePaths,
          access
        )
      }

      logger.info(
        `All products processed successfully. Products: ${Object.keys(
          results
        ).join(", ")}. Total files: ${Object.values(results).reduce(
          (acc, files) => acc + files.length,
          0
        )}`
      )

      return results
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined
      logger.error(
        `Fatal error in uploadLocalFiles: ${errorMessage}\n${errorStack || ""}`
      )
      throw new MedusaError(MedusaError.Types.INVALID_DATA, errorMessage)
    }
  }

  async function seedImages() {
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
          0
        )}`
      )

      const result = await uploadLocalFiles(productImageMap, "public")

      logger.info(
        `Image upload completed successfully. Products processed: ${Object.keys(
          result
        ).join(", ")}`
      )

      return result
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined
      logger.error(`Error in seedImages: ${errorMessage}\n${errorStack || ""}`)
      throw error
    }
  }

  const images = await seedImages()
  logger.info(
    `Seeding completed successfully. Products: ${Object.keys(images).join(
      ", "
    )}`
  )

  const { result: products } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Medusa T-Shirt",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Shirts")?.id as string,
          ],
          description:
            "Reimagine the feeling of a classic T-shirt. With our cotton T-shirts, everyday essentials no longer have to be ordinary.",
          handle: "t-shirt",
          weight: 400,
          status: ProductStatus.PUBLISHED,
          images: images[PRODUCTS.MedusaTShirt],
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
            },
            {
              title: "S / White",
              sku: "SHIRT-S-WHITE",
              options: {
                Size: "S",
                Color: "White",
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
            },
            {
              title: "M / Black",
              sku: "SHIRT-M-BLACK",
              options: {
                Size: "M",
                Color: "Black",
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
            },
            {
              title: "M / White",
              sku: "SHIRT-M-WHITE",
              options: {
                Size: "M",
                Color: "White",
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
            },
            {
              title: "L / Black",
              sku: "SHIRT-L-BLACK",
              options: {
                Size: "L",
                Color: "Black",
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
            },
            {
              title: "L / White",
              sku: "SHIRT-L-WHITE",
              options: {
                Size: "L",
                Color: "White",
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
            },
            {
              title: "XL / Black",
              sku: "SHIRT-XL-BLACK",
              options: {
                Size: "XL",
                Color: "Black",
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
            },
            {
              title: "XL / White",
              sku: "SHIRT-XL-WHITE",
              options: {
                Size: "XL",
                Color: "White",
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
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0]?.id as string,
            },
          ],
        },
        {
          title: "Medusa Sweatshirt",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Sweatshirts")
              ?.id as string,
          ],
          description:
            "Reimagine the feeling of a classic sweatshirt. With our cotton sweatshirt, everyday essentials no longer have to be ordinary.",
          handle: "sweatshirt",
          weight: 400,
          status: ProductStatus.PUBLISHED,
          images: images[PRODUCTS.MedusaSweatshirt],
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
            },
            {
              title: "M",
              sku: "SWEATSHIRT-M",
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
            },
            {
              title: "L",
              sku: "SWEATSHIRT-L",
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
            },
            {
              title: "XL",
              sku: "SWEATSHIRT-XL",
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
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0]?.id as string,
            },
          ],
        },
        {
          title: "Medusa Sweatpants",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Pants")?.id as string,
          ],
          description:
            "Reimagine the feeling of classic sweatpants. With our cotton sweatpants, everyday essentials no longer have to be ordinary.",
          handle: "sweatpants",
          weight: 400,
          status: ProductStatus.PUBLISHED,
          images: images[PRODUCTS.MedusaSweatpants],
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
            },
            {
              title: "M",
              sku: "SWEATPANTS-M",
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
            },
            {
              title: "L",
              sku: "SWEATPANTS-L",
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
            },
            {
              title: "XL",
              sku: "SWEATPANTS-XL",
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
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0]?.id as string,
            },
          ],
        },
        {
          title: "Medusa Shorts",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Merch")?.id as string,
          ],
          description:
            "Reimagine the feeling of classic shorts. With our cotton shorts, everyday essentials no longer have to be ordinary.",
          handle: "shorts",
          weight: 400,
          status: ProductStatus.PUBLISHED,
          images: images[PRODUCTS.MedusaShorts],
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
            },
            {
              title: "M",
              sku: "SHORTS-M",
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
            },
            {
              title: "L",
              sku: "SHORTS-L",
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
            },
            {
              title: "XL",
              sku: "SHORTS-XL",
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
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0]?.id as string,
            },
          ],
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
  }[] = []
  for (const inventoryItem of inventoryItems) {
    const inventoryLevel = {
      location_id: stockLocation.id,
      stocked_quantity: 1_000_000,
      inventory_item_id: inventoryItem.id,
    }
    inventoryLevels.push(inventoryLevel)
  }

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryLevels,
    },
  })

  logger.info("Finished seeding inventory levels data.")

  logger.info("Create collection")
  const collectionData: CreateProductCollectionDTO = {
    title: "Latest Drops",
    handle: "latest-drops",
  }

  const { result: collections } = await createCollectionsWorkflow(
    container
  ).run({
    input: {
      collections: [collectionData],
    },
  })

  await batchLinkProductsToCollectionWorkflow(container).run({
    input: {
      id: collections[0]?.id as string,
      add: products.map((p) => p.id),
    },
  })

  logger.info(
    `Created collection: ${collections[0]?.title as string} with ${products.length} products`
  )
}
