import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  GLS_CLIENT_MODULE,
  type GLSClientModuleService,
} from "../../../modules/gls-client"
import type { GLSLabelFormat } from "../../../modules/gls-client/types"
import { composeGLSLabelsOnA4 } from "../helpers/label-pdf"
import {
  buildGLSLabelsFilename,
  collectPrintableGLSLabels,
  downloadGLSLabelPdfsInChunks,
  type GLSLabelOrder,
  resolveGLSLabelPrintOptions,
} from "../helpers/labels"

export type GenerateGLSLabelPdfStepInput = {
  order_ids: string[]
  label_format?: GLSLabelFormat
  label_offset?: number
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
      orders as GLSLabelOrder[]
    )
    const { labelFormat, labelOffset } = await resolveGLSLabelPrintOptions(
      glsClient,
      input.label_format,
      input.label_offset
    )

    const labelPdfs = await downloadGLSLabelPdfsInChunks(
      labels,
      glsClient,
      labelFormat
    )

    const pdfBytes = await composeGLSLabelsOnA4(
      labelPdfs,
      labelOffset,
      labelFormat
    )

    return new StepResponse({
      filename: buildGLSLabelsFilename(labels),
      pdf_base64: Buffer.from(pdfBytes).toString("base64"),
    })
  }
)
