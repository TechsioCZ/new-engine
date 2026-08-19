import { StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  createProductsWorkflow,
  deleteProductsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import type { ProductAttributeDeletionCompensation } from "../product-attribute/product-deletion-cleanup"
import {
  clearProductLifecycleEvents,
  emitProductLifecycleEvents,
  type ProductLifecycleEmissionCompensation,
} from "../url-registry-outbox/product-lifecycle-event"
import {
  deleteAttributesForDeletedProducts,
  restoreAttributesForDeletedProducts,
} from "./product-attributes-deleted"
import {
  createProductContentForCreatedProducts,
  deleteCreatedProductContent,
} from "./product-content-created"
import {
  type ProductContentUpdateCompensation,
  restoreUpdatedProductContent,
  updateProductContentForUpdatedProducts,
} from "./product-content-updated"

type ProductCreatedCompensation = Readonly<{
  productContentIds: readonly string[]
  productLifecycle: ProductLifecycleEmissionCompensation | undefined
}>

type ProductUpdatedCompensation = Readonly<{
  productContent: ProductContentUpdateCompensation
  productLifecycle: ProductLifecycleEmissionCompensation | undefined
}>

type ProductDeletedCompensation = Readonly<{
  productAttributes: ProductAttributeDeletionCompensation
  productLifecycle: ProductLifecycleEmissionCompensation | undefined
}>

createProductsWorkflow.hooks.productsCreated(
  async ({ products }, context) => {
    const productContentIds = await createProductContentForCreatedProducts(
      products,
      context
    )

    try {
      const lifecycleResponse = await emitProductLifecycleEvents(
        {
          productIds: products.map((product) => product.id),
          reason: "created",
        },
        context
      )

      return new StepResponse<undefined, ProductCreatedCompensation>(
        undefined,
        {
          productContentIds,
          productLifecycle: lifecycleResponse?.compensateInput,
        }
      )
    } catch (error) {
      await deleteCreatedProductContent(productContentIds, context)
      throw error
    }
  },
  async (compensation: ProductCreatedCompensation | undefined, context) => {
    if (!compensation) {
      return
    }

    await Promise.all([
      clearProductLifecycleEvents(compensation.productLifecycle, context),
      deleteCreatedProductContent(compensation.productContentIds, context),
    ])
  }
)

updateProductsWorkflow.hooks.productsUpdated(
  async ({ products }, context) => {
    const productContent = await updateProductContentForUpdatedProducts(
      products,
      context
    )

    try {
      const lifecycleResponse = await emitProductLifecycleEvents(
        {
          productIds: products.map((product) => product.id),
          reason: "updated",
        },
        context
      )

      return new StepResponse<undefined, ProductUpdatedCompensation>(
        undefined,
        {
          productContent,
          productLifecycle: lifecycleResponse?.compensateInput,
        }
      )
    } catch (error) {
      await restoreUpdatedProductContent(productContent, context)
      throw error
    }
  },
  async (compensation: ProductUpdatedCompensation | undefined, context) => {
    if (!compensation) {
      return
    }

    await Promise.all([
      clearProductLifecycleEvents(compensation.productLifecycle, context),
      restoreUpdatedProductContent(compensation.productContent, context),
    ])
  }
)

deleteProductsWorkflow.hooks.productsDeleted(
  async ({ ids }, context) => {
    const productAttributes = await deleteAttributesForDeletedProducts(
      ids,
      context
    )

    try {
      const lifecycleResponse = await emitProductLifecycleEvents(
        { productIds: ids, reason: "deleted" },
        context
      )

      return new StepResponse<undefined, ProductDeletedCompensation>(
        undefined,
        {
          productAttributes,
          productLifecycle: lifecycleResponse?.compensateInput,
        }
      )
    } catch (error) {
      await restoreAttributesForDeletedProducts(productAttributes, context)
      throw error
    }
  },
  async (compensation: ProductDeletedCompensation | undefined, context) => {
    if (!compensation) {
      return
    }

    await Promise.all([
      clearProductLifecycleEvents(compensation.productLifecycle, context),
      restoreAttributesForDeletedProducts(
        compensation.productAttributes,
        context
      ),
    ])
  }
)
