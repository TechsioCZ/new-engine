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
}[]

const CreateProductCategoriesStepId = "create-product-categories-seed-step"
export const createProductCategoriesStep = createStep(
  CreateProductCategoriesStepId,
  async (input: CreateProductCategoriesStepInput, { container }) => {
    const productCategoriesCreateResult: ProductCategoryDTO[] = []
    const productCategoriesUpdateResult: ProductCategoryDTO[] = []

    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const productService = container.resolve<IProductModuleService>(
      Modules.PRODUCT
    )

    const handles = input
      .map((category) => category.handle)
      .filter((handle): handle is string => handle !== undefined)

    const existingProductCategoriesByName =
      await productService.listProductCategories(
        {
          name: input.map((i) => i.name),
        },
        {
          select: ["id", "name", "handle"],
        }
      )

    const existingProductCategoriesByHandle =
      handles.length === 0
        ? []
        : await productService.listProductCategories(
            {
              handle: handles,
            },
            {
              select: ["id", "name", "handle"],
            }
          )

    const existingProductCategories = [
      ...new Map(
        [
          ...existingProductCategoriesByName,
          ...existingProductCategoriesByHandle,
        ].map((category) => [category.id, category])
      ).values(),
    ]

    const missingProductCategories = input.filter(
      (i) =>
        !existingProductCategories.find(
          (j) =>
            (i.handle === undefined && i.name === j.name) ||
            i.handle === j.handle
        )
    )
    const updateProductCategories = existingProductCategories.flatMap(
      (existingProductCategory) => {
        const inputProductCategories = input.find(
          (productCategory) =>
            (productCategory.handle === undefined &&
              productCategory.name === existingProductCategory.name) ||
            productCategory.handle === existingProductCategory.handle
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
              },
            },
          })
        productCategoriesUpdateResult.push(
          categoryResult[0] as ProductCategoryDTO
        )
      }
    }

    const allProductCategories = await productService.listProductCategories(
      {
        name: input.map((i) => i.name),
        include_ancestors_tree: true,
      },
      {
        select: ["id", "name", "handle"],
      }
    )

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
