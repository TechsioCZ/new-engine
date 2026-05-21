import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { CustomerGroupCustomersBatchClient } from "../client"
import type {
  AssignCustomersToGroupBatchInput,
  AssignCustomersToGroupBatchOutput,
  AssignCustomersToGroupBatchResult,
  CustomerGroupCustomerIdentifier,
} from "../types"

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error"

const buildFailedResult = (
  client: CustomerGroupCustomersBatchClient,
  identifier: CustomerGroupCustomerIdentifier,
  error: string
): AssignCustomersToGroupBatchResult => ({
  identifier: client.getIdentifierValue(identifier),
  status: "failed",
  error,
})

export const processCustomerGroupCustomersBatchStep = createStep(
  "symmy-process-customer-group-customers-batch",
  async (input: AssignCustomersToGroupBatchInput, { container }) => {
    const client = new CustomerGroupCustomersBatchClient(container)
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const groupId = await client.resolveCustomerGroupId(input.code)

    if (!groupId) {
      const results = input.customer_identifiers.map((identifier) => ({
        identifier: client.getIdentifierValue(identifier),
        status: "failed" as const,
        error: `Customer group code '${input.code}' was not found`,
      }))
      const output: AssignCustomersToGroupBatchOutput = {
        success: false,
        processed: 0,
        assigned: 0,
        failed: results.length,
        results,
      }
      return new StepResponse(output)
    }

    const customerIndex = await client.preloadCustomers(
      input.customer_identifiers
    )
    const results: AssignCustomersToGroupBatchResult[] = []

    for (const identifier of input.customer_identifiers) {
      const identifierValue = client.getIdentifierValue(identifier)
      const customer = client.findCustomer(identifier, customerIndex)
      if (!customer) {
        results.push({
          identifier: identifierValue,
          status: "not_found",
        })
        continue
      }

      try {
        await client.assignCustomerToGroup(customer, groupId)
        results.push({
          identifier: identifierValue,
          status: "assigned",
          customer_id: customer.id,
        })
      } catch (error) {
        const message = toErrorMessage(error)
        logger.warn(
          `[symmy-plugin] Failed to assign customer ${identifierValue} to customer group ${input.code}: ${message}`
        )
        results.push(buildFailedResult(client, identifier, message))
      }
    }

    const assigned = results.filter(
      (result) => result.status === "assigned"
    ).length
    const failed = results.length - assigned
    const output: AssignCustomersToGroupBatchOutput = {
      success: failed === 0,
      processed: assigned,
      assigned,
      failed,
      results,
    }

    return new StepResponse(output)
  }
)
