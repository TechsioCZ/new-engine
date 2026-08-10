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
  identifier: CustomerGroupCustomerIdentifier,
  error: string,
): AssignCustomersToGroupBatchResult => ({
  error,
  identifier: CustomerGroupCustomersBatchClient.getIdentifierValue(identifier),
  status: "failed",
})

const processIdentifierForBatch = async ({
  client,
  customerIndex,
  groupId,
  identifier,
  input,
  logger,
}: {
  client: CustomerGroupCustomersBatchClient
  customerIndex: Awaited<
    ReturnType<CustomerGroupCustomersBatchClient["preloadCustomers"]>
  >
  groupId: string
  identifier: CustomerGroupCustomerIdentifier
  input: AssignCustomersToGroupBatchInput
  logger: Logger
}): Promise<AssignCustomersToGroupBatchResult> => {
  const identifierValue =
    CustomerGroupCustomersBatchClient.getIdentifierValue(identifier)
  const customer = CustomerGroupCustomersBatchClient.findCustomer(
    identifier,
    customerIndex,
  )
  if (customer === null) {
    return { identifier: identifierValue, status: "not_found" }
  }
  try {
    await client.assignCustomerToGroup(customer, groupId)
    return {
      customer_id: customer.id,
      identifier: identifierValue,
      status: "assigned",
    }
  } catch (error) {
    const message = toErrorMessage(error)
    logger.warn(
      `[symmy-plugin] Failed to assign customer ${identifierValue} to customer group ${input.code}: ${message}`,
    )
    return buildFailedResult(identifier, message)
  }
}

export const symmyProcessCustomerGroupCustomersBatchStep = createStep(
  "symmy-process-customer-group-customers-batch",
  async (input: AssignCustomersToGroupBatchInput, { container }) => {
    const client = new CustomerGroupCustomersBatchClient(container)
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const groupId = await client.resolveCustomerGroupId(input.code)

    if (groupId === null) {
      const results = input.customer_identifiers.map((identifier) => ({
        error: `Customer group code '${input.code}' was not found`,
        identifier:
          CustomerGroupCustomersBatchClient.getIdentifierValue(identifier),
        status: "failed" as const,
      }))
      const output: AssignCustomersToGroupBatchOutput = {
        assigned: 0,
        failed: results.length,
        processed: 0,
        results,
        success: false,
      }
      return new StepResponse(output)
    }

    const customerIndex = await client.preloadCustomers(
      input.customer_identifiers,
    )
    const results: AssignCustomersToGroupBatchResult[] = []
    const processAt = async (index: number): Promise<void> => {
      const identifier = input.customer_identifiers[index]
      if (identifier === undefined) {
        return
      }
      results.push(
        await processIdentifierForBatch({
          client,
          customerIndex,
          groupId,
          identifier,
          input,
          logger,
        }),
      )
      await processAt(index + 1)
    }
    await processAt(0)

    const assigned = results.filter(
      (result) => result.status === "assigned",
    ).length
    const failed = results.length - assigned
    const output: AssignCustomersToGroupBatchOutput = {
      assigned,
      failed,
      processed: assigned,
      results,
      success: failed === 0,
    }

    return new StepResponse(output)
  },
)
