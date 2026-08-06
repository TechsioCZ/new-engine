import type {
  ExecArgs,
  IProductModuleService,
  Logger,
  ProductCategoryDTO,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { deleteProductCategoriesWorkflow } from "@medusajs/medusa/core-flows"

type ProductCategoryTreeNode = ProductCategoryDTO & {
  category_children?: ProductCategoryTreeNode[]
}

const LEGACY_TRAPI_MA_HANDLE = "trapi-ma-2"
const MAX_CATEGORY_DELETIONS = 10_000

const collectCategoryTreePostOrder = (
  node: ProductCategoryTreeNode,
): ProductCategoryTreeNode[] => {
  const children = node.category_children ?? []
  const result = children.flatMap((child) =>
    collectCategoryTreePostOrder(child),
  )
  result.push(node)
  return result
}

const herbaticaCleanupLegacyCategories = async ({
  container,
  args,
}: ExecArgs) => {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve<IProductModuleService>(
    Modules.PRODUCT,
  )
  const dryRun = args?.includes("--dry-run") ?? false

  logger.info(
    `Looking for legacy Herbatica category subtree rooted at ${LEGACY_TRAPI_MA_HANDLE}...`,
  )

  const categories = await productService.listProductCategories(
    {
      handle: [LEGACY_TRAPI_MA_HANDLE],
      include_descendants_tree: true,
    },
    {
      relations: ["category_children"],
    },
  )

  const [legacyRoot] = categories
  if (!legacyRoot) {
    logger.info("Legacy trapi-ma-2 subtree not found. Nothing to clean up.")
    return
  }

  const deleteOrder = collectCategoryTreePostOrder(legacyRoot)
  logger.info(
    `Resolved ${deleteOrder.length} categories for deletion in child-first order.`,
  )

  if (deleteOrder.length > MAX_CATEGORY_DELETIONS) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Refusing to process ${deleteOrder.length} categories; maximum is ${MAX_CATEGORY_DELETIONS}.`,
    )
  }

  const deleteNextCategory = async (index: number): Promise<void> => {
    const category = deleteOrder[index]
    if (category === undefined) {
      return
    }

    const label = `${category.handle ?? category.name ?? category.id} (${category.id})`
    if (dryRun) {
      logger.info(`[dry-run] Would delete category ${label}`)
    } else {
      logger.info(`Deleting category ${label}`)
      await deleteProductCategoriesWorkflow(container).run({
        input: [category.id],
      })
    }

    await deleteNextCategory(index + 1)
  }

  await deleteNextCategory(0)

  if (dryRun) {
    logger.info("Dry run completed without deleting categories.")
    return
  }

  logger.info("Legacy Herbatica category cleanup completed.")
}

export default herbaticaCleanupLegacyCategories
