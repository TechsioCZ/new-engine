import type {
  MetadataType,
  IProductModuleService,
  Logger,
  MedusaContainer,
  ProductCategoryDTO,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  createProductCategoriesWorkflow,
  updateProductCategoriesWorkflow,
} from "@medusajs/medusa/core-flows"
import { unique } from "@techsio/std/array"

export type CreateProductCategoriesStepInput = {
  name: string
  isActive: boolean
  parentHandle?: string
  description?: string
  handle?: string
  metadata?: MetadataType
  rank?: number
  isInternal?: boolean
}[]

const CREATE_PRODUCT_CATEGORIES_STEP_ID = "create-product-categories-seed-step"

type CategoryInput = CreateProductCategoriesStepInput[number]

const dedupeStringValues = (values: (string | undefined)[]): string[] =>
  unique(
    values.filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    ),
  )

const matchesCategoryInput = (
  inputCategory: CategoryInput,
  existingCategory: Pick<ProductCategoryDTO, "name" | "handle">,
): boolean => {
  if (inputCategory.handle !== undefined && inputCategory.handle.length > 0) {
    return inputCategory.handle === existingCategory.handle
  }

  return inputCategory.name === existingCategory.name
}

const toCategoryAttributes = (category: CategoryInput) => ({
  is_active: category.isActive,
  name: category.name,
  ...(category.description === undefined || category.description.length === 0
    ? {}
    : { description: category.description }),
  ...(category.handle === undefined || category.handle.length === 0
    ? {}
    : { handle: category.handle }),
  ...(category.metadata === undefined ? {} : { metadata: category.metadata }),
  ...(category.rank === undefined ? {} : { rank: category.rank }),
  ...(category.isInternal === undefined
    ? {}
    : { is_internal: category.isInternal }),
})

const requireUpdatedCategory = (
  categories: ProductCategoryDTO[],
  categoryId: string,
): ProductCategoryDTO => {
  const [category] = categories
  if (category === undefined) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Updating product category "${categoryId}" returned no category`,
    )
  }

  return category
}

const createMissingCategories = async (
  container: MedusaContainer,
  categories: CategoryInput[],
): Promise<ProductCategoryDTO[]> => {
  if (categories.length === 0) {
    return []
  }

  const { result } = await createProductCategoriesWorkflow(container).run({
    input: {
      product_categories: categories.map(toCategoryAttributes),
    },
  })

  return result
}

const updateExistingCategories = async (
  container: MedusaContainer,
  categories: (CategoryInput & { id: string })[],
): Promise<ProductCategoryDTO[]> => {
  const [nextCategory, ...remainingCategories] = categories
  if (nextCategory === undefined) {
    return []
  }

  const { id, ...category } = nextCategory
  const { result } = await updateProductCategoriesWorkflow(container).run({
    input: {
      selector: { id },
      update: toCategoryAttributes(category),
    },
  })
  const remainingResults = await updateExistingCategories(
    container,
    remainingCategories,
  )

  return [requireUpdatedCategory(result, id), ...remainingResults]
}

const updateCategoryParents = async (
  container: MedusaContainer,
  categories: { id: string; parentId: string }[],
): Promise<void> => {
  const [nextCategory, ...remainingCategories] = categories
  if (nextCategory === undefined) {
    return
  }

  await updateProductCategoriesWorkflow(container).run({
    input: {
      selector: { id: nextCategory.id },
      update: { parent_category_id: nextCategory.parentId },
    },
  })
  await updateCategoryParents(container, remainingCategories)
}

export const createProductCategoriesStep = createStep(
  CREATE_PRODUCT_CATEGORIES_STEP_ID,
  async (input: CreateProductCategoriesStepInput, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const productService = container.resolve<IProductModuleService>(
      Modules.PRODUCT,
    )

    const inputHandles = dedupeStringValues(
      input.map((category) => category.handle),
    )
    const inputNamesWithoutHandle = dedupeStringValues(
      input
        .filter(
          (category) =>
            category.handle === undefined || category.handle.length === 0,
        )
        .map((category) => category.name),
    )

    const existingByHandle =
      inputHandles.length > 0
        ? await productService.listProductCategories(
            { handle: inputHandles },
            { select: ["id", "name", "handle"] },
          )
        : []
    const existingByName =
      inputNamesWithoutHandle.length > 0
        ? await productService.listProductCategories(
            { name: inputNamesWithoutHandle },
            { select: ["id", "name", "handle"] },
          )
        : []
    const existingProductCategories = [
      ...new Map(
        [...existingByHandle, ...existingByName].map((category) => [
          category.id,
          category,
        ]),
      ).values(),
    ]

    const missingProductCategories = input.filter(
      (inputCategory) =>
        !existingProductCategories.some((existingCategory) =>
          matchesCategoryInput(inputCategory, existingCategory),
        ),
    )
    const updateProductCategories = existingProductCategories.flatMap(
      (existingCategory) => {
        const inputCategory = input.find((category) =>
          matchesCategoryInput(category, existingCategory),
        )

        return inputCategory === undefined
          ? []
          : [{ ...inputCategory, id: existingCategory.id }]
      },
    )

    if (missingProductCategories.length > 0) {
      logger.info("Creating product categories...")
    }
    const productCategoriesCreateResult = await createMissingCategories(
      container,
      missingProductCategories,
    )

    if (updateProductCategories.length > 0) {
      logger.info("Updating product categories...")
    }
    const productCategoriesUpdateResult = await updateExistingCategories(
      container,
      updateProductCategories,
    )

    const handlesForParentResolution = dedupeStringValues([
      ...input.map((category) => category.handle),
      ...input.map((category) => category.parentHandle),
    ])
    const allProductCategories =
      handlesForParentResolution.length > 0
        ? await productService.listProductCategories(
            { handle: handlesForParentResolution },
            { select: ["id", "name", "handle"] },
          )
        : []
    const parentUpdates = input.flatMap((categoryInput) => {
      if (categoryInput.parentHandle === undefined) {
        return []
      }

      const category = allProductCategories.find(
        (candidate) => candidate.handle === categoryInput.handle,
      )
      const parent = allProductCategories.find(
        (candidate) => candidate.handle === categoryInput.parentHandle,
      )

      if (category === undefined || parent === undefined) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Could not find category parent pair ${categoryInput.handle} -> ${categoryInput.parentHandle}`,
        )
      }

      return [{ id: category.id, parentId: parent.id }]
    })

    if (parentUpdates.length > 0) {
      logger.info("Updating product category parents...")
      await updateCategoryParents(container, parentUpdates)
    }

    return new StepResponse({
      result: {
        createProductCategoriesResult: productCategoriesCreateResult,
        updateProductCategoriesResult: productCategoriesUpdateResult,
      },
    })
  },
)
