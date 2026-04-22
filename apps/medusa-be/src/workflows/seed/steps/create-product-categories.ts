import type {
  IProductModuleService,
  Logger,
  ProductCategoryDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  createProductCategoriesWorkflow,
  updateProductCategoriesWorkflow,
} from "@medusajs/medusa/core-flows"

export type CreateProductCategoriesStepInput = {
  name: string
  isActive: boolean
  parentHandle?: string
  description?: string
  handle?: string
  metadata?: Record<string, unknown>
  rank?: number
  isInternal?: boolean
}[]

const CreateProductCategoriesStepId = "create-product-categories-seed-step"

function dedupeStringValues(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())))]
}

function matchesCategoryInput(
  inputCategory: CreateProductCategoriesStepInput[number],
  existingCategory: Pick<ProductCategoryDTO, "name" | "handle">
): boolean {
  if (inputCategory.handle) {
    return inputCategory.handle === existingCategory.handle
  }

  return inputCategory.name === existingCategory.name
}

export const createProductCategoriesStep = createStep(
  CreateProductCategoriesStepId,
  async (input: CreateProductCategoriesStepInput, { container }) => {
    const productCategoriesCreateResult: ProductCategoryDTO[] = []
    const productCategoriesUpdateResult: ProductCategoryDTO[] = []

    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const productService = container.resolve<IProductModuleService>(
      Modules.PRODUCT
    )

    const inputHandles = dedupeStringValues(input.map((category) => category.handle))
    const inputNamesWithoutHandle = dedupeStringValues(
      input
        .filter((category) => !category.handle)
        .map((category) => category.name)
    )

    const existingByHandle =
      inputHandles.length > 0
        ? await productService.listProductCategories(
            {
              handle: inputHandles,
            },
            {
              select: ["id", "name", "handle"],
            }
          )
        : []

    const existingByName =
      inputNamesWithoutHandle.length > 0
        ? await productService.listProductCategories(
            {
              name: inputNamesWithoutHandle,
            },
            {
              select: ["id", "name", "handle"],
            }
          )
        : []

    const existingProductCategories = [
      ...new Map(
        [...existingByHandle, ...existingByName].map((category) => [
          category.id,
          category,
        ])
      ).values(),
    ]

    const missingProductCategories = input.filter(
      (i) =>
        !existingProductCategories.find((existingCategory) =>
          matchesCategoryInput(i, existingCategory)
        )
    )
    const updateProductCategories = existingProductCategories.flatMap(
      (existingProductCategory) => {
        const inputProductCategories = input.find(
          (productCategory) =>
            matchesCategoryInput(productCategory, existingProductCategory)
        )
        if (!inputProductCategories) {
          return []
        }

        return [
          {
            id: existingProductCategory.id,
            name: inputProductCategories.name,
            is_active: inputProductCategories.isActive,
            description: inputProductCategories.description,
            handle: inputProductCategories.handle,
            metadata: inputProductCategories.metadata,
            rank: inputProductCategories.rank,
            is_internal: inputProductCategories.isInternal,
          },
        ]
      }
    )

    if (missingProductCategories.length !== 0) {
      logger.info("Creating product categories...")

      const { result: categoryResult } = await createProductCategoriesWorkflow(
        container
      ).run({
        input: {
          product_categories: missingProductCategories.map((category) => ({
            name: category.name,
            is_active: category.isActive,
            description: category.description,
            handle: category.handle,
            metadata: category.metadata,
            rank: category.rank,
            is_internal: category.isInternal,
          })),
        },
      })

      for (const elem of categoryResult) {
        productCategoriesCreateResult.push(elem)
      }
    }

    if (updateProductCategories.length !== 0) {
      logger.info("Updating product categories...")

      for (const updateProductCategory of updateProductCategories) {
        const { result: categoryResult } =
          await updateProductCategoriesWorkflow(container).run({
            input: {
              selector: {
                id: updateProductCategory.id,
              },
              update: {
                name: updateProductCategory.name,
                is_active: updateProductCategory.is_active,
                description: updateProductCategory.description,
                handle: updateProductCategory.handle,
                metadata: updateProductCategory.metadata,
                rank: updateProductCategory.rank,
                is_internal: updateProductCategory.is_internal,
              },
            },
          })
        productCategoriesUpdateResult.push(
          categoryResult[0] as ProductCategoryDTO
        )
      }
    }

    const handlesForParentResolution = dedupeStringValues([
      ...input.map((category) => category.handle),
      ...input.map((category) => category.parentHandle),
    ])

    const allProductCategories =
      handlesForParentResolution.length > 0
        ? await productService.listProductCategories(
            {
              handle: handlesForParentResolution,
            },
            {
              select: ["id", "name", "handle"],
            }
          )
        : []

    const updateParentProductCategories = input
      .filter((i) => i.parentHandle !== undefined && i.parentHandle !== null)
      .map((i) => {
        const category = allProductCategories.find((j) => j.handle === i.handle)
        const parent = allProductCategories.find(
          (j) => j.handle === i.parentHandle
        )

        if (category === undefined || parent === undefined) {
          throw new Error(
            `Could not find category parent pair ${i.handle} -> ${i.parentHandle}`
          )
        }

        return {
          id: category.id,
          parentId: parent.id,
        }
      })

    if (updateParentProductCategories.length !== 0) {
      logger.info("Updating product category parents...")

      for (const updateProductCategory of updateParentProductCategories) {
        await updateProductCategoriesWorkflow(container).run({
          input: {
            selector: {
              id: updateProductCategory.id,
            },
            update: {
              parent_category_id: updateProductCategory.parentId,
            },
          },
        })
      }
    }

    return new StepResponse({
      result: {
        createProductCategoriesResult: productCategoriesCreateResult,
        updateProductCategoriesResult: productCategoriesUpdateResult,
      },
    })
  }
)
