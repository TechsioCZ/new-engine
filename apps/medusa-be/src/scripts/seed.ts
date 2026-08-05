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
        ...(defaultSalesChannel[0]?.id
          ? { default_sales_channel_id: defaultSalesChannel[0].id }
          : {}),
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
    if (!newRegions || newRegions.length === 0) {
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
  if (!regions || regions.length === 0) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No regions available after seeding/checking.",
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
  const stockLocation = stockLocationResult[0]

  if (!stockLocation) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Stock location not found",
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
      "Shipping profile not found",
    )
  }

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "European Warehouse delivery",
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
    type: "shipping",
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
        provider_id: "manual_manual",
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
        service_zone_id: fulfillmentSet.service_zones[0]?.id as string,
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
        provider_id: "manual_manual",
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
        service_zone_id: fulfillmentSet.service_zones[0]?.id as string,
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
      add: [defaultSalesChannel[0]?.id as string],
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
  const publishableApiKey = publishableApiKeyResult[0]
  if (!publishableApiKey) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Publishable API key not found",
    )
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      add: [defaultSalesChannel[0]?.id as string],
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

  async function readLocalUploadFile(
    filePath: string,
    access: "private" | "public",
  ) {
    try {
      logger.info(`Reading file: ${filePath}`)
      const buffer = await readFile(filePath)
      const filename = path.basename(filePath)
      const mimeType = mime.getType(filePath) || "application/octet-stream"

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
        `Error reading file ${filePath}: ${errorMessage}\n${errorStack || ""}`,
      )
      return null
    }
  }

  async function uploadProductFiles(
    productName: string,
    filePaths: string[],
    access: "private" | "public",
  ) {
    logger.info(
      `Processing product: ${productName} with ${filePaths.length} files`,
    )

    const files = await Promise.all(
      filePaths.map(async (filePath) => readLocalUploadFile(filePath, access)),
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

  async function uploadProductFilesOrThrow(
    productName: string,
    filePaths: string[],
    access: "private" | "public",
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
        }`,
      )
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Error processing ${productName}: ${errorMessage}`,
      )
    }
  }

  async function uploadLocalFiles(
    productImageMap: Record<string, string[]>,
    access: "private" | "public" = "private",
  ): Promise<Record<string, FileDTO[]>> {
    try {
      const results: Record<string, FileDTO[]> = {}

      for (const [productName, filePaths] of Object.entries(productImageMap)) {
        results[productName] = await uploadProductFilesOrThrow(
          productName,
          filePaths,
          access,
        )
      }

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
        `Fatal error in uploadLocalFiles: ${errorMessage}\n${errorStack || ""}`,
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
      logger.error(`Error in seedImages: ${errorMessage}\n${errorStack || ""}`)
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
          title: "Medusa T-Shirt",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Shirts")?.id as string,
          ],
          description:
            "Reimagine the feeling of a classic T-shirt. With our cotton T-shirts, everyday essentials no longer have to be ordinary.",
          handle: "t-shirt",
          weight: 400,
          status: ProductStatus.PUBLISHED,
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
          ...(images[PRODUCTS.MedusaSweatshirt]
            ? { images: images[PRODUCTS.MedusaSweatshirt] }
            : {}),
          options: [
            {
              title: "Size",
              values: ["S", "M", "L", "XL"],
            },
          ],
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
          ...(images[PRODUCTS.MedusaSweatpants]
            ? { images: images[PRODUCTS.MedusaSweatpants] }
            : {}),
          options: [
            {
              title: "Size",
              values: ["S", "M", "L", "XL"],
            },
          ],
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
          ...(images[PRODUCTS.MedusaShorts]
            ? { images: images[PRODUCTS.MedusaShorts] }
            : {}),
          options: [
            {
              title: "Size",
              values: ["S", "M", "L", "XL"],
            },
          ],
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
      inventory_item_id: inventoryItem.id,
      location_id: stockLocation.id,
      stocked_quantity: 1_000_000,
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

  await batchLinkProductsToCollectionWorkflow(container).run({
    input: {
      add: products.map((p) => p.id),
      id: collections[0]?.id as string,
    },
  })

  logger.info(
    `Created collection: ${collections[0]?.title as string} with ${products.length} products`,
  )
}
