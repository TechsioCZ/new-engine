import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { type ExistingOrderIndex, InvoicesBatchClient } from "../client"
import { invoicesBatchClientMapperHelper } from "../client-mapper-helper"
import type {
  AttachInvoicesBatchInput,
  AttachInvoicesBatchOutput,
  AttachInvoicesBatchResult,
  InvoiceInput,
} from "../types"

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error"

const processInvoiceForBatch = async ({
  client,
  invoice,
  logger,
  orderIndex,
  userId,
}: {
  client: InvoicesBatchClient
  invoice: InvoiceInput
  logger: Logger
  orderIndex: ExistingOrderIndex
  userId?: string
}): Promise<AttachInvoicesBatchResult> => {
  const orderIdentifier =
    invoicesBatchClientMapperHelper.getOrderIdentifier(invoice)
  try {
    const order = client.findExistingOrder(invoice, orderIndex)
    if (!order) {
      return {
        order_identifier: orderIdentifier,
        status: "not_found",
        invoice_number: invoice.invoice_number,
        error: "Order was not found",
      }
    }

    const uploaded = await client.uploadInvoice(invoice)
    const invoiceUrl = await client.attachInvoice(
      order,
      invoice,
      uploaded,
      userId
    )
    return {
      order_identifier: orderIdentifier,
      status: "success",
      order_id: order.id,
      invoice_number: invoice.invoice_number,
      invoice_url: invoiceUrl,
    }
  } catch (error) {
    const message = toErrorMessage(error)
    logger.warn(
      `[symmy-plugin] Failed to attach invoice (${invoice.identifier_type}:${orderIdentifier}): ${message}`
    )
    return {
      order_identifier: orderIdentifier,
      status: "failed",
      invoice_number: invoice.invoice_number,
      error: message,
    }
  }
}

export const processInvoicesBatchStep = createStep(
  "symmy-process-invoices-batch",
  async (input: AttachInvoicesBatchInput, { container }) => {
    const client = new InvoicesBatchClient(container)
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const orderIndex = await client.preload(input.invoices)

    const results: AttachInvoicesBatchResult[] = []
    for (const invoice of input.invoices) {
      results.push(
        await processInvoiceForBatch({
          client,
          invoice,
          logger,
          orderIndex,
          userId: input.user_id,
        })
      )
    }

    const processed = results.filter((r) => r.status === "success").length
    const failed = results.length - processed

    const output: AttachInvoicesBatchOutput = {
      success: failed === 0,
      processed,
      failed,
      results,
    }
    return new StepResponse(output)
  }
)
