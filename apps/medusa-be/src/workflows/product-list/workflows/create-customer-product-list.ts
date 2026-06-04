import { Modules } from "@medusajs/framework/utils"
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  acquireLockStep,
  createRemoteLinkStep,
  releaseLockStep,
} from "@medusajs/medusa/core-flows"
import { PRODUCT_LIST_MODULE } from "../../../modules/product-list/constants"
import { createCustomerProductListStep } from "../steps/create-customer-product-list"
import type { CreateCustomerProductListWorkflowInput } from "../types"

export const createCustomerProductListWorkflow = createWorkflow(
  "create-customer-product-list-workflow",
  (input: CreateCustomerProductListWorkflowInput) => {
    const lockKey = transform({ input }, ({ input: workflowInput }) => [
      `product-list-customer:${workflowInput.customer_id}`,
    ])

    acquireLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
      timeout: 2,
      ttl: 10,
    })

    const result = createCustomerProductListStep(input)

    const customerProductListLinks = transform(
      { input, result },
      ({ input: workflowInput, result: listResult }) => {
        if (!listResult.created) {
          return []
        }

        return [
          {
            [Modules.CUSTOMER]: {
              customer_id: workflowInput.customer_id,
            },
            [PRODUCT_LIST_MODULE]: {
              product_list_id: listResult.product_list.id,
            },
          },
        ]
      }
    )

    createRemoteLinkStep(customerProductListLinks)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    return new WorkflowResponse(result)
  }
)
