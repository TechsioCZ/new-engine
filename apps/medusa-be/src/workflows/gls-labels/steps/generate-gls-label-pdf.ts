import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  GLS_CLIENT_MODULE,
  type GLSClientModuleService,
} from "../../../modules/gls-client"
import {
  buildGLSLabelsFilename,
  collectPrintableGLSLabels,
  validateGLSLabelOrders,
} from "../helpers/labels"

export type GenerateGLSLabelPdfStepInput = {
  order_ids: string[]
}

export type GenerateGLSLabelPdfStepOutput = {
  filename: string
  pdf_base64: string
}

export const generateGLSLabelPdfStep = createStep(
  "generate-gls-label-pdf",
  async (
    input: GenerateGLSLabelPdfStepInput,
    { container }
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
      validateGLSLabelOrders(orders)
    )
    const firstLabel = labels[0]
    if (!firstLabel) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "GLS: No printable labels found")
    }
    if (labels.some((label) => label.config_id !== firstLabel.config_id || label.environment !== firstLabel.environment)) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "GLS: Labels from different configuration profiles must be printed separately")
    }
    const pdf = await glsClient.downloadLabelsPdf(
      labels.map((label) => label.packet_id),
      { config_id: firstLabel.config_id, environment: firstLabel.environment }
    )

    return new StepResponse({
      filename: buildGLSLabelsFilename(labels),
      pdf_base64: pdf.toString("base64"),
    })
  }
)
