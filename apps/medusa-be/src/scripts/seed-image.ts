import { readFile } from "node:fs/promises"
import path from "node:path"

import type { ExecArgs, FileDTO } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import mime from "mime"

const seedImages = async ({ container }: ExecArgs): Promise<void> => {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const PRODUCTS = {
    MedusaShorts: "Medusa Shorts",
    MedusaSweatpants: "Medusa Sweatpants",
    MedusaSweatshirt: "Medusa Sweatshirt",
    MedusaTShirt: "Medusa T-Shirt",
  }

  const readLocalUploadFile = async (
    filePath: string,
    access: "private" | "public",
  ) => {
    try {
      logger.info(`Reading file: ${filePath}`)
      const buffer = await readFile(filePath)
      const filename = path.basename(filePath)
      const mimeType = mime.getType(filePath) ?? "application/octet-stream"

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

    const transformedResult = result.map((file) => ({
      ...file,
      url: file.url?.replace("medusa-minio:9004", "localhost:9004"),
    }))

    logger.info(
      `Upload successful for ${productName}. Files uploaded: ${JSON.stringify(
        transformedResult,
        null,
        2,
      )}`,
    )

    return transformedResult
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

  const uploadProductEntries = async (
    productEntries: [string, string[]][],
    index: number,
    results: Record<string, FileDTO[]>,
    access: "private" | "public",
  ): Promise<void> => {
    const entry = productEntries[index]
    if (entry === undefined) {
      return
    }

    const [productName, filePaths] = entry
    results[productName] = await uploadProductFilesOrThrow(
      productName,
      filePaths,
      access,
    )
    await uploadProductEntries(productEntries, index + 1, results, access)
  }

  const uploadLocalFiles = async (
    productImageMap: Record<string, string[]>,
    access: "private" | "public" = "private",
  ): Promise<Record<string, FileDTO[]>> => {
    try {
      const results: Record<string, FileDTO[]> = {}

      await uploadProductEntries(
        Object.entries(productImageMap),
        0,
        results,
        access,
      )

      logger.info(
        `All products processed successfully. Products: ${Object.keys(
          results,
        ).join(", ")}. Total files: ${Object.values(results).flat().length}`,
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

  const seedDefaultImages = async () => {
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
        }, Files: ${Object.values(productImageMap).flat().length}`,
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

  logger.info("Starting product image seeding to S3")

  try {
    const images = await seedDefaultImages()
    logger.info(
      `Seeding completed successfully. Products: ${Object.keys(images).join(
        ", ",
      )}`,
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    logger.error(
      `Fatal error during image seeding: ${errorMessage}\n${errorStack ?? ""}`,
    )
    process.exit(1)
  }
}

export default seedImages
