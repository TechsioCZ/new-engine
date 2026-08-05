import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { GLS_CLIENT_MODULE } from "../../../modules/gls-client"
import type { GLSClientModuleService } from "../../../modules/gls-client"
import {
  buildGLSLabelsFilename,
  collectPrintableGLSLabels,
  validateGLSLabelOrders,
} from "../helpers/labels"

export interface GenerateGLSLabelPdfStepInput {
  order_ids: string[]
}

export interface GenerateGLSLabelPdfStepOutput {
  filename: string
  pdf_base64: string
}

export const generateGLSLabelPdfStep = createStep(
  "generate-gls-label-pdf",
  async (
    input: GenerateGLSLabelPdfStepInput,
    { container },
  ): Promise<StepResponse<GenerateGLSLabelPdfStepOutput>> => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const glsClient =
      container.resolve<GLSClientModuleService>(GLS_CLIENT_MODULE)

    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "fulfillments.id",
        "fulfillments.provider_id",
        "fulfillments.canceled_at",
        "fulfillments.data",
      ],
      filters: {
        id: input.order_ids,
      },
    })

    const labels = collectPrintableGLSLabels(
      input.order_ids,
      validateGLSLabelOrders(orders),
    )
    const pdf = await glsClient.downloadLabelsPdf(
      labels.map((label) => label.packet_id),
    )

    return new StepResponse({
      filename: buildGLSLabelsFilename(labels),
      pdf_base64: pdf.toString("base64"),
    })
  },
)
