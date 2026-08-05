import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { CustomerBatchClient } from "../client"
import type { CustomerGroupIndex, ExistingCustomerIndex } from "../client"
import type {
  CustomerInput,
  UpsertCustomersBatchInput,
  UpsertCustomersBatchOutput,
  UpsertCustomersBatchResult,
} from "../types"

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error"

const buildFailedResult = (
  customer: CustomerInput,
  error: string,
): UpsertCustomersBatchResult => ({
  email: customer.email,
  error,
  status: "failed",
})

const processCustomerForBatch = async ({
  client,
  customer,
  existingCustomerIndex,
  customerGroupIndex,
  logger,
}: {
  client: CustomerBatchClient
  customer: CustomerInput
  existingCustomerIndex: ExistingCustomerIndex
  customerGroupIndex: CustomerGroupIndex
  logger: Logger
}): Promise<UpsertCustomersBatchResult> => {
  try {
    const existing = client.findExistingCustomer(
      customer,
      existingCustomerIndex,
    )
    if (!existing) {
      const created = await client.createCustomer(customer)
      await client.upsertAddresses(created.id, null, customer.addresses)
      await client.syncGroups(
        created.id,
        null,
        customer.customer_group_codes,
        customerGroupIndex,
      )
      client.cacheCustomer(existingCustomerIndex, customer, created.id)
      return {
        customer_id: created.id,
        email: customer.email,
        status: "created",
      }
    }

    await client.updateCustomer(existing.id, existing, customer)
    await client.upsertAddresses(existing.id, existing, customer.addresses)
    await client.syncGroups(
      existing.id,
      existing,
      customer.customer_group_codes,
      customerGroupIndex,
    )
    return {
      customer_id: existing.id,
      email: customer.email ?? existing.email ?? undefined,
      status: "updated",
    }
  } catch (error) {
    const message = toErrorMessage(error)
    logger.warn(
      `[symmy-plugin] Failed to upsert customer (${customer.identifier_type}): ${message}`,
    )
    return buildFailedResult(customer, message)
  }
}

export const symmyProcessCustomersBatchStep = createStep(
  "symmy-process-customers-batch",
  async (input: UpsertCustomersBatchInput, { container }) => {
    const client = new CustomerBatchClient(container)
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const [existingCustomerIndex, customerGroupIndex] = await Promise.all([
      client.preload(input.customers),
      client.preloadGroups(input.customers),
    ])

    const results: UpsertCustomersBatchResult[] = []
    for (const customer of input.customers) {
      results.push(
        await processCustomerForBatch({
          client,
          customer,
          customerGroupIndex,
          existingCustomerIndex,
          logger,
        }),
      )
    }

    const processed = results.filter((r) => r.status !== "failed").length
    const failed = results.length - processed

    const output: UpsertCustomersBatchOutput = {
      failed,
      processed,
      results,
      success: failed === 0,
    }
    return new StepResponse(output)
  },
)
