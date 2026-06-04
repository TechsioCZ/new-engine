import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { assertCustomerOwnsProductList } from "../../../utils/product-list-links"

export type AssertCustomerOwnsProductListStepInput = {
  customer_id: string
  list_id: string
}

export const assertCustomerOwnsProductListStep = createStep(
  "assert-customer-owns-product-list",
  async (input: AssertCustomerOwnsProductListStepInput, { container }) => {
    await assertCustomerOwnsProductList(
      container,
      input.customer_id,
      input.list_id
    )

    return new StepResponse({ list_id: input.list_id })
  }
)
