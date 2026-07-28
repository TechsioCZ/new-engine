import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { deleteProductsWorkflow } from "@medusajs/medusa/core-flows"
import {
  getProductAttributeService,
  type ProductAttributeAssignmentRecord,
  partitionProductAttributeRecordIds,
} from "../../utils/product-attributes"

deleteProductsWorkflow.hooks.productsDeleted(
  async ({ ids }, { container }) => {
    const service = getProductAttributeService(container)
    const assignments = (await service.listProductAttributes(
      { product_id: { $in: ids } },
      { take: undefined }
    )) as ProductAttributeAssignmentRecord[]
    const { active_ids: assignmentIds } =
      partitionProductAttributeRecordIds(assignments)

    if (assignmentIds.length) {
      await service.softDeleteProductAttributes(assignmentIds)
    }

    return new StepResponse(undefined, assignmentIds)
  },
  async (assignmentIds: string[] | undefined, { container }) => {
    if (assignmentIds?.length) {
      await getProductAttributeService(container).restoreProductAttributes(
        assignmentIds
      )
    }
  }
)
