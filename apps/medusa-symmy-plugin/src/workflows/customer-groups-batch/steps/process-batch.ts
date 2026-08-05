import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { CustomerGroupsBatchClient } from "../client"
import type { ExistingCustomerGroupIndex } from "../client"
import { customerGroupsBatchClientMapperHelper } from "../client-mapper-helper"
import type {
  CustomerGroupInput,
  UpsertCustomerGroupsBatchInput,
  UpsertCustomerGroupsBatchOutput,
  UpsertCustomerGroupsBatchResult,
} from "../types"

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error"

const buildFailedResult = (
  group: CustomerGroupInput,
  error: string,
): UpsertCustomerGroupsBatchResult => ({
  ...customerGroupsBatchClientMapperHelper.buildResultEcho(group),
  error,
  status: "failed",
})

const processCustomerGroupForBatch = async ({
  client,
  createdBy,
  customerGroupIndex,
  group,
  logger,
}: {
  client: CustomerGroupsBatchClient
  createdBy?: string | undefined
  customerGroupIndex: ExistingCustomerGroupIndex
  group: CustomerGroupInput
  logger: Logger
}): Promise<UpsertCustomerGroupsBatchResult> => {
  const echo = customerGroupsBatchClientMapperHelper.buildResultEcho(group)
  try {
    const existing = client.findExistingCustomerGroup(group, customerGroupIndex)
    if (!existing) {
      const created = await client.createCustomerGroup(group, createdBy)
      client.cacheCustomerGroup(customerGroupIndex, group, created.id)
      return {
        ...echo,
        customer_group_id: created.id,
        status: "created",
      }
    }

    await client.updateCustomerGroup(existing.id, existing, group)
    return {
      ...echo,
      customer_group_id: existing.id,
      status: "updated",
    }
  } catch (error) {
    const message = toErrorMessage(error)
    logger.warn(
      `[symmy-plugin] Failed to upsert customer group (${group.identifier_type}): ${message}`,
    )
    return buildFailedResult(group, message)
  }
}

export const symmyProcessCustomerGroupsBatchStep = createStep(
  "symmy-process-customer-groups-batch",
  async (input: UpsertCustomerGroupsBatchInput, { container }) => {
    const client = new CustomerGroupsBatchClient(container)
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const customerGroupIndex = await client.preload(input.customer_groups)

    const results: UpsertCustomerGroupsBatchResult[] = []
    for (const group of input.customer_groups) {
      results.push(
        await processCustomerGroupForBatch({
          client,
          createdBy: input.created_by,
          customerGroupIndex,
          group,
          logger,
        }),
      )
    }

    const processed = results.filter((r) => r.status !== "failed").length
    const failed = results.length - processed

    const output: UpsertCustomerGroupsBatchOutput = {
      failed,
      processed,
      results,
      success: failed === 0,
    }
    return new StepResponse(output)
  },
)
